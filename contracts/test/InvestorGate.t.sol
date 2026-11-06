// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {InvestorGate} from "../src/InvestorGate.sol";
import {Upfront} from "../src/Upfront.sol";
import {UpfrontAccess} from "../src/UpfrontAccess.sol";
import {MockUSDT} from "./mocks/MockUSDT.sol";

contract InvestorGateTest is Test {
    event InvestorJoined(address indexed wallet, bytes32 indexed nullifierHash);
    event GateReset(address indexed admin, uint256 round, uint256 walletsRevoked);

    // Written out here, not read from the contract, so these tests pin what the backend must sign.
    bytes32 constant DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    bytes32 constant VOUCHER_TYPEHASH = keccak256("JoinVoucher(address wallet,bytes32 nullifierHash,uint64 expiry)");

    bytes32 constant NULLIFIER = keccak256("human-1");
    bytes32 constant OTHER_NULLIFIER = keccak256("human-2");
    uint256 constant TEN_USDT = 10_000_000;

    address admin = makeAddr("admin");
    address seller = makeAddr("seller");
    address buyer = makeAddr("buyer");
    address walletA = makeAddr("walletA");
    address walletB = makeAddr("walletB");
    address manualInvestor = makeAddr("manualInvestor");

    uint256 signerKey = 0xA11CE;
    uint256 attackerKey = 0xBAD;

    UpfrontAccess access;
    InvestorGate gate;
    MockUSDT usdt;
    Upfront upfront;
    uint64 expiry;

    function setUp() public {
        access = new UpfrontAccess(admin);
        gate = new InvestorGate(access, vm.addr(signerKey));
        usdt = new MockUSDT();
        upfront = new Upfront(access, usdt, "");
        expiry = uint64(block.timestamp + 10 minutes);

        vm.startPrank(admin);
        access.grantRole(access.DEFAULT_ADMIN_ROLE(), address(gate));
        access.grantRole(access.SELLER_ROLE(), seller);
        access.grantRole(access.BUYER_ROLE(), buyer);
        vm.stopPrank();
    }

    function _voucher(address wallet, bytes32 nullifier, uint64 expiry_, uint256 key, address verifyingContract)
        private
        view
        returns (bytes memory)
    {
        bytes32 domain = keccak256(
            abi.encode(
                DOMAIN_TYPEHASH,
                keccak256("Upfront InvestorGate"),
                keccak256("7"),
                block.chainid,
                verifyingContract
            )
        );
        bytes32 structHash = keccak256(abi.encode(VOUCHER_TYPEHASH, wallet, nullifier, expiry_));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(key, keccak256(abi.encodePacked("\x19\x01", domain, structHash)));
        return abi.encodePacked(r, s, v);
    }

    function _voucher(address wallet, bytes32 nullifier) private view returns (bytes memory) {
        return _voucher(wallet, nullifier, expiry, signerKey, address(gate));
    }

    function _join(address wallet, bytes32 nullifier) private {
        bytes memory signature = _voucher(wallet, nullifier);
        vm.prank(wallet);
        gate.join(nullifier, expiry, signature);
    }

    function _listReceivable() private returns (uint256 id) {
        vm.startPrank(seller);
        id = upfront.createReceivable(buyer, TEN_USDT, uint64(block.timestamp + 1 days), keccak256("agreement"), "RCV");
        upfront.listReceivable(id, 1000, 5);
        vm.stopPrank();
    }

    function _invest(address wallet, uint256 id) private {
        usdt.mint(wallet, 100e6);
        vm.startPrank(wallet);
        usdt.approve(address(upfront), type(uint256).max);
        upfront.invest(id, 2);
        vm.stopPrank();
    }

    function test_ConstructorSetsState() public view {
        assertEq(address(gate.access()), address(access));
        assertEq(gate.signer(), vm.addr(signerKey));
        assertEq(gate.VERSION(), 7);
    }

    function test_ConstructorRejectsZeroAddresses() public {
        vm.expectRevert(InvestorGate.ZeroAddress.selector);
        new InvestorGate(UpfrontAccess(address(0)), vm.addr(signerKey));

        vm.expectRevert(InvestorGate.ZeroAddress.selector);
        new InvestorGate(access, address(0));
    }

    function test_VoucherGrantsInvestorRole() public {
        assertFalse(access.hasRole(access.INVESTOR_ROLE(), walletA));

        vm.expectEmit(address(gate));
        emit InvestorJoined(walletA, NULLIFIER);
        _join(walletA, NULLIFIER);

        assertTrue(access.hasRole(access.INVESTOR_ROLE(), walletA));
        assertTrue(gate.nullifierUsed(NULLIFIER));
    }

    /// The demo must keep working with and without World ID.
    function test_BothPathsCanInvest() public {
        bytes32 investorRole = access.INVESTOR_ROLE();
        vm.prank(admin);
        access.grantRole(investorRole, manualInvestor);
        _join(walletA, NULLIFIER);

        uint256 id = _listReceivable();
        _invest(manualInvestor, id);
        _invest(walletA, id);

        assertEq(upfront.balanceOf(manualInvestor, id), 2);
        assertEq(upfront.balanceOf(walletA, id), 2);
    }

    function test_WalletWithoutARoleCannotInvest() public {
        uint256 id = _listReceivable();
        usdt.mint(walletA, 100e6);
        vm.startPrank(walletA);
        usdt.approve(address(upfront), type(uint256).max);
        vm.expectRevert(abi.encodeWithSelector(Upfront.NotAllowed.selector, walletA, access.INVESTOR_ROLE()));
        upfront.invest(id, 2);
        vm.stopPrank();
    }

    function test_SameHumanCannotJoinWithSecondWallet() public {
        _join(walletA, NULLIFIER);

        bytes memory signature = _voucher(walletB, NULLIFIER);
        vm.expectRevert(InvestorGate.NullifierAlreadyUsed.selector);
        vm.prank(walletB);
        gate.join(NULLIFIER, expiry, signature);

        assertFalse(access.hasRole(access.INVESTOR_ROLE(), walletB));
    }

    function test_TwoHumansCanBothJoin() public {
        _join(walletA, NULLIFIER);
        _join(walletB, OTHER_NULLIFIER);

        assertTrue(access.hasRole(access.INVESTOR_ROLE(), walletA));
        assertTrue(access.hasRole(access.INVESTOR_ROLE(), walletB));
    }

    function test_RevokedWalletCannotRejoinButAdminCanRestoreIt() public {
        bytes32 investorRole = access.INVESTOR_ROLE();
        _join(walletA, NULLIFIER);
        vm.prank(admin);
        access.revokeRole(investorRole, walletA);

        bytes memory signature = _voucher(walletA, NULLIFIER);
        vm.expectRevert(InvestorGate.NullifierAlreadyUsed.selector);
        vm.prank(walletA);
        gate.join(NULLIFIER, expiry, signature);

        vm.prank(admin);
        access.grantRole(investorRole, walletA);
        assertTrue(access.hasRole(investorRole, walletA));
    }

    function test_VoucherCannotBeUsedByAnotherWallet() public {
        bytes memory signature = _voucher(walletA, NULLIFIER);

        vm.expectRevert(InvestorGate.BadSignature.selector);
        vm.prank(walletB);
        gate.join(NULLIFIER, expiry, signature);
    }

    function test_VoucherWorksAtExpiry() public {
        bytes memory signature = _voucher(walletA, NULLIFIER);
        vm.warp(expiry);

        vm.prank(walletA);
        gate.join(NULLIFIER, expiry, signature);
        assertTrue(access.hasRole(access.INVESTOR_ROLE(), walletA));
    }

    function test_ExpiredVoucherReverts() public {
        bytes memory signature = _voucher(walletA, NULLIFIER);
        vm.warp(uint256(expiry) + 1);

        vm.expectRevert(InvestorGate.VoucherExpired.selector);
        vm.prank(walletA);
        gate.join(NULLIFIER, expiry, signature);
    }

    function test_WrongSignerReverts() public {
        bytes memory signature = _voucher(walletA, NULLIFIER, expiry, attackerKey, address(gate));

        vm.expectRevert(InvestorGate.BadSignature.selector);
        vm.prank(walletA);
        gate.join(NULLIFIER, expiry, signature);
    }

    function test_TamperedNullifierReverts() public {
        bytes memory signature = _voucher(walletA, NULLIFIER);

        vm.expectRevert(InvestorGate.BadSignature.selector);
        vm.prank(walletA);
        gate.join(OTHER_NULLIFIER, expiry, signature);
    }

    function test_TamperedExpiryReverts() public {
        bytes memory signature = _voucher(walletA, NULLIFIER);

        vm.expectRevert(InvestorGate.BadSignature.selector);
        vm.prank(walletA);
        gate.join(NULLIFIER, expiry + 1, signature);
    }

    function test_MalformedSignatureReverts() public {
        vm.expectRevert(InvestorGate.BadSignature.selector);
        vm.prank(walletA);
        gate.join(NULLIFIER, expiry, hex"1234");
    }

    function test_VoucherForAnotherGateReverts() public {
        bytes memory signature = _voucher(walletA, NULLIFIER, expiry, signerKey, address(0xdead));

        vm.expectRevert(InvestorGate.BadSignature.selector);
        vm.prank(walletA);
        gate.join(NULLIFIER, expiry, signature);
    }

    function test_OnlyAnAdminCanReset() public {
        _join(walletA, NULLIFIER);

        vm.expectRevert(InvestorGate.NotAdmin.selector);
        vm.prank(walletA);
        gate.reset();

        assertTrue(access.hasRole(access.INVESTOR_ROLE(), walletA));
        assertEq(gate.round(), 0);
    }

    function test_ResetRevokesJoinedWalletsAndKeepsAdminInvestors() public {
        bytes32 investorRole = access.INVESTOR_ROLE();
        vm.prank(admin);
        access.grantRole(investorRole, manualInvestor);
        _join(walletA, NULLIFIER);
        _join(walletB, OTHER_NULLIFIER);
        assertEq(gate.joinedCount(), 2);

        vm.expectEmit(address(gate));
        emit GateReset(admin, 1, 2);
        vm.prank(admin);
        gate.reset();

        assertFalse(access.hasRole(investorRole, walletA));
        assertFalse(access.hasRole(investorRole, walletB));
        assertTrue(access.hasRole(investorRole, manualInvestor));
        assertEq(gate.joinedCount(), 0);
        assertEq(gate.round(), 1);
    }

    function test_SameHumanCanJoinAgainAfterResetButOnlyOnce() public {
        _join(walletA, NULLIFIER);
        vm.prank(admin);
        gate.reset();
        assertFalse(gate.nullifierUsed(NULLIFIER));

        _join(walletB, NULLIFIER);
        assertTrue(access.hasRole(access.INVESTOR_ROLE(), walletB));

        bytes memory signature = _voucher(walletA, NULLIFIER);
        vm.expectRevert(InvestorGate.NullifierAlreadyUsed.selector);
        vm.prank(walletA);
        gate.join(NULLIFIER, expiry, signature);
    }

    function test_ResetWithNobodyJoinedWorks() public {
        vm.prank(admin);
        gate.reset();
        assertEq(gate.round(), 1);
    }

    function test_ResetSkipsAWalletAlreadyRevoked() public {
        bytes32 investorRole = access.INVESTOR_ROLE();
        _join(walletA, NULLIFIER);
        vm.startPrank(admin);
        access.revokeRole(investorRole, walletA);
        gate.reset();
        vm.stopPrank();

        assertEq(gate.joinedCount(), 0);
    }

    /// A reset removes the role, never the money: holders keep their units and still get repaid.
    function test_ResetLeavesUnitsAndRepaymentAlone() public {
        _join(walletA, NULLIFIER);
        uint256 id = _listReceivable();
        _invest(walletA, id);

        vm.prank(admin);
        gate.reset();
        assertEq(upfront.balanceOf(walletA, id), 2);

        uint256 before = usdt.balanceOf(walletA);
        usdt.mint(seller, 100e6);
        vm.startPrank(seller);
        usdt.approve(address(upfront), type(uint256).max);
        upfront.settle(id);
        vm.stopPrank();

        assertEq(usdt.balanceOf(walletA), before + 2e6);
    }

    function test_FailsCleanlyIfTheGateLosesItsAdminRole() public {
        bytes32 adminRole = access.DEFAULT_ADMIN_ROLE();
        vm.prank(admin);
        access.revokeRole(adminRole, address(gate));

        bytes memory signature = _voucher(walletA, NULLIFIER);
        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, address(gate), adminRole)
        );
        vm.prank(walletA);
        gate.join(NULLIFIER, expiry, signature);

        assertFalse(gate.nullifierUsed(NULLIFIER));
    }

    function test_GateOnlyGrantsInvestorRole() public {
        _join(walletA, NULLIFIER);

        assertFalse(access.hasRole(access.DEFAULT_ADMIN_ROLE(), walletA));
        assertFalse(access.hasRole(access.SELLER_ROLE(), walletA));
        assertFalse(access.hasRole(access.BUYER_ROLE(), walletA));
    }

    /// The gate holds DEFAULT_ADMIN_ROLE, so nothing may reach UpfrontAccess through it except `join`.
    function test_GateCannotBeUsedToCallAccessControl() public {
        bytes32 sellerRole = access.SELLER_ROLE();
        bytes32 adminRole = access.DEFAULT_ADMIN_ROLE();
        bytes[3] memory calls = [
            abi.encodeCall(IAccessControl.grantRole, (sellerRole, walletA)),
            abi.encodeCall(IAccessControl.grantRole, (adminRole, walletA)),
            abi.encodeCall(IAccessControl.revokeRole, (adminRole, admin))
        ];

        for (uint256 i = 0; i < calls.length; ++i) {
            vm.prank(walletA);
            (bool ok,) = address(gate).call(calls[i]);
            assertFalse(ok);
        }

        assertTrue(access.hasRole(adminRole, admin));
        assertFalse(access.hasRole(sellerRole, walletA));
    }
}
