// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {IERC20Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Receivable, Status, Upfront} from "../src/Upfront.sol";
import {UpfrontAccess} from "../src/UpfrontAccess.sol";
import {MockUSDT} from "./mocks/MockUSDT.sol";
import {FlagThief, ReentrantInvestor} from "./mocks/MaliciousInvestors.sol";

contract UpfrontTest is Test {
    event ReceivableCreated(
        uint256 indexed id,
        address indexed seller,
        address indexed buyer,
        uint256 faceValue,
        uint64 dueDate,
        bytes32 docHash,
        string ref
    );
    event ReceivableVerified(uint256 indexed id, address indexed buyer);
    event ReceivableRejected(uint256 indexed id);
    event ReceivableCancelled(uint256 indexed id);
    event ReceivableListed(uint256 indexed id, uint16 discountBps, uint256 unitPrice, uint256 maxUnitsPerInvestor);
    event Invested(uint256 indexed id, address indexed investor, uint256 units, uint256 paid);
    event ReceivableFunded(uint256 indexed id);

    uint256 constant TEN_USDT = 10_000_000;
    bytes32 constant DOC = keccak256("agreement");
    string constant REF = "RCV-1001";

    address admin = makeAddr("admin");
    address seller = makeAddr("seller");
    address buyer = makeAddr("buyer");
    address investor = makeAddr("investor");
    address investor2 = makeAddr("investor2");
    address stranger = makeAddr("stranger");

    UpfrontAccess access;
    MockUSDT usdt;
    Upfront upfront;
    uint64 dueDate;

    function setUp() public {
        access = new UpfrontAccess(admin);
        usdt = new MockUSDT();
        upfront = new Upfront(access, usdt, "");
        dueDate = uint64(block.timestamp + 1 days);

        vm.startPrank(admin);
        access.grantRole(access.SELLER_ROLE(), seller);
        access.grantRole(access.BUYER_ROLE(), buyer);
        access.grantRole(access.INVESTOR_ROLE(), investor);
        access.grantRole(access.INVESTOR_ROLE(), investor2);
        vm.stopPrank();

        _fund(investor);
        _fund(investor2);
    }

    function _fund(address wallet) private {
        usdt.mint(wallet, 100e6);
        vm.prank(wallet);
        usdt.approve(address(upfront), type(uint256).max);
    }

    function _create() private returns (uint256) {
        vm.prank(seller);
        return upfront.createReceivable(buyer, TEN_USDT, dueDate, DOC, REF);
    }

    function test_ConstructorReadsDecimalsFromToken() public view {
        assertEq(upfront.UNIT(), 1_000_000);
        assertEq(address(upfront.access()), address(access));
        assertEq(address(upfront.usdt()), address(usdt));
    }

    function test_ConstructorRejectsZeroAddresses() public {
        vm.expectRevert(Upfront.ZeroAddress.selector);
        new Upfront(UpfrontAccess(address(0)), usdt, "");

        vm.expectRevert(Upfront.ZeroAddress.selector);
        new Upfront(access, MockUSDT(address(0)), "");
    }

    function test_CreateMintsAllUnitsToSeller() public {
        uint256 id = _create();

        assertEq(id, 1);
        assertEq(upfront.balanceOf(seller, id), 10);
        assertEq(upfront.totalSupply(id), 10);
        assertEq(upfront.receivableCount(), 1);
    }

    function test_CreateStoresEveryField() public {
        vm.warp(1_000);
        dueDate = 2_000;
        uint256 id = _create();
        Receivable memory r = upfront.getReceivable(id);

        assertEq(r.seller, seller);
        assertEq(r.buyer, buyer);
        assertEq(r.faceValue, TEN_USDT);
        assertEq(r.totalUnits, 10);
        assertEq(r.dueDate, dueDate);
        assertEq(r.createdAt, 1_000);
        assertEq(uint8(r.status), uint8(Status.Created));
        assertFalse(r.verified);
        assertEq(r.docHash, DOC);
        assertEq(r.ref, REF);

        // Set by later versions.
        assertEq(r.unitPrice, 0);
        assertEq(r.unitsSold, 0);
        assertEq(r.maxUnitsPerInvestor, 0);
        assertEq(r.discountBps, 0);
    }

    function test_CreateEmitsEvent() public {
        vm.expectEmit(address(upfront));
        emit ReceivableCreated(1, seller, buyer, TEN_USDT, dueDate, DOC, REF);
        _create();
    }

    function test_RevertsWithoutSellerRole() public {
        vm.expectRevert(abi.encodeWithSelector(Upfront.NotAllowed.selector, stranger, access.SELLER_ROLE()));
        vm.prank(stranger);
        upfront.createReceivable(buyer, TEN_USDT, dueDate, DOC, REF);
    }

    function test_RevertsAfterSellerRoleRevoked() public {
        bytes32 role = access.SELLER_ROLE();
        vm.prank(admin);
        access.revokeRole(role, seller);

        vm.expectRevert(abi.encodeWithSelector(Upfront.NotAllowed.selector, seller, role));
        _create();
    }

    function test_RevertsWhenBuyerHasNoRole() public {
        vm.expectRevert(abi.encodeWithSelector(Upfront.NotAllowed.selector, stranger, access.BUYER_ROLE()));
        vm.prank(seller);
        upfront.createReceivable(stranger, TEN_USDT, dueDate, DOC, REF);
    }

    function test_RevertsOnZeroBuyer() public {
        vm.expectRevert(Upfront.ZeroAddress.selector);
        vm.prank(seller);
        upfront.createReceivable(address(0), TEN_USDT, dueDate, DOC, REF);
    }

    function test_RevertsWhenSellerIsBuyer() public {
        bytes32 role = access.BUYER_ROLE();
        vm.prank(admin);
        access.grantRole(role, seller);

        vm.expectRevert(Upfront.SellerIsBuyer.selector);
        vm.prank(seller);
        upfront.createReceivable(seller, TEN_USDT, dueDate, DOC, REF);
    }

    function test_RevertsOnZeroFaceValue() public {
        vm.expectRevert(Upfront.InvalidFaceValue.selector);
        vm.prank(seller);
        upfront.createReceivable(buyer, 0, dueDate, DOC, REF);
    }

    function test_RevertsOnPartialUnit() public {
        vm.expectRevert(Upfront.InvalidFaceValue.selector);
        vm.prank(seller);
        upfront.createReceivable(buyer, 10_500_000, dueDate, DOC, REF);
    }

    function test_RevertsOnPastDueDate() public {
        vm.warp(1_000);
        vm.expectRevert(Upfront.DueDateNotInFuture.selector);
        vm.prank(seller);
        upfront.createReceivable(buyer, TEN_USDT, 999, DOC, REF);
    }

    function test_RevertsWhenDueDateIsNow() public {
        vm.warp(1_000);
        vm.expectRevert(Upfront.DueDateNotInFuture.selector);
        vm.prank(seller);
        upfront.createReceivable(buyer, TEN_USDT, 1_000, DOC, REF);
    }

    function test_RevertsOnEmptyDocHash() public {
        vm.expectRevert(Upfront.EmptyDocHash.selector);
        vm.prank(seller);
        upfront.createReceivable(buyer, TEN_USDT, dueDate, bytes32(0), REF);
    }

    function test_RevertsOnDuplicateDocHash() public {
        _create();
        vm.expectRevert(Upfront.DocHashInUse.selector);
        vm.prank(seller);
        upfront.createReceivable(buyer, 20_000_000, dueDate, DOC, "RCV-1002");
    }

    function test_FailedCreateChangesNothing() public {
        vm.prank(stranger);
        vm.expectRevert();
        upfront.createReceivable(buyer, TEN_USDT, dueDate, DOC, REF);

        assertEq(upfront.receivableCount(), 0);
        assertEq(upfront.receivableIdByDocHash(DOC), 0);
    }

    function test_SellerCannotTransferUnits() public {
        uint256 id = _create();

        vm.expectRevert(Upfront.UnitsLocked.selector);
        vm.prank(seller);
        upfront.safeTransferFrom(seller, investor, id, 4, "");
    }

    function test_BatchTransferCannotBypassLock() public {
        uint256 id = _create();
        uint256[] memory ids = new uint256[](1);
        uint256[] memory values = new uint256[](1);
        ids[0] = id;
        values[0] = 4;

        vm.expectRevert(Upfront.UnitsLocked.selector);
        vm.prank(seller);
        upfront.safeBatchTransferFrom(seller, investor, ids, values, "");
    }

    function test_BatchChecksEveryId() public {
        uint256 first = _create();
        vm.prank(seller);
        uint256 second = upfront.createReceivable(buyer, TEN_USDT, dueDate, keccak256("other"), "RCV-1002");
        uint256[] memory ids = new uint256[](2);
        uint256[] memory values = new uint256[](2);
        ids[0] = first;
        ids[1] = second;
        values[0] = 0;
        values[1] = 4;

        vm.expectRevert(Upfront.UnitsLocked.selector);
        vm.prank(seller);
        upfront.safeBatchTransferFrom(seller, investor, ids, values, "");
    }

    function test_ApprovedOperatorCannotBypassLock() public {
        uint256 id = _create();
        vm.prank(seller);
        upfront.setApprovalForAll(stranger, true);

        vm.expectRevert(Upfront.UnitsLocked.selector);
        vm.prank(stranger);
        upfront.safeTransferFrom(seller, investor, id, 4, "");
    }

    function test_IdsCountUpFromOne() public {
        uint256 first = _create();
        vm.prank(seller);
        uint256 second = upfront.createReceivable(buyer, TEN_USDT, dueDate, keccak256("other"), "RCV-1002");

        assertEq(first, 1);
        assertEq(second, 2);
        assertEq(upfront.receivableCount(), 2);
    }

    function test_DocHashLookupReturnsTheRightId() public {
        bytes32 otherDoc = keccak256("other");
        _create();
        vm.prank(seller);
        uint256 second = upfront.createReceivable(buyer, TEN_USDT, dueDate, otherDoc, "RCV-1002");

        assertEq(upfront.receivableIdByDocHash(DOC), 1);
        assertEq(upfront.receivableIdByDocHash(otherDoc), second);
        assertEq(upfront.receivableIdByDocHash(keccak256("unused")), 0);
    }

    function test_GetReceivableRevertsOnUnknownId() public {
        vm.expectRevert(Upfront.UnknownReceivable.selector);
        upfront.getReceivable(0);

        vm.expectRevert(Upfront.UnknownReceivable.selector);
        upfront.getReceivable(1);
    }

    function testFuzz_UnitsMatchFaceValue(uint32 units) public {
        vm.assume(units > 0);
        uint256 faceValue = uint256(units) * upfront.UNIT();

        vm.prank(seller);
        uint256 id = upfront.createReceivable(buyer, faceValue, dueDate, DOC, REF);

        assertEq(upfront.balanceOf(seller, id), units);
        assertEq(upfront.getReceivable(id).totalUnits, units);
    }

    function _verify(uint256 id) private {
        vm.prank(buyer);
        upfront.verifyReceivable(id);
    }

    function _reject(uint256 id) private {
        vm.prank(buyer);
        upfront.rejectReceivable(id);
    }

    function _cancel(uint256 id) private {
        vm.prank(seller);
        upfront.cancelReceivable(id);
    }

    // Verify

    function test_VerifySetsTagAndKeepsStatus() public {
        uint256 id = _create();
        vm.expectEmit(address(upfront));
        emit ReceivableVerified(id, buyer);
        _verify(id);

        Receivable memory r = upfront.getReceivable(id);
        assertTrue(r.verified);
        assertEq(uint8(r.status), uint8(Status.Created));
        assertEq(upfront.balanceOf(seller, id), 10);
    }

    function test_OnlyNamedBuyerCanVerify() public {
        uint256 id = _create();

        vm.expectRevert(Upfront.NotBuyer.selector);
        vm.prank(seller);
        upfront.verifyReceivable(id);

        // Holding the role isn't enough: it must be the buyer named on this receivable.
        address otherBuyer = makeAddr("otherBuyer");
        bytes32 role = access.BUYER_ROLE();
        vm.prank(admin);
        access.grantRole(role, otherBuyer);

        vm.expectRevert(Upfront.NotBuyer.selector);
        vm.prank(otherBuyer);
        upfront.verifyReceivable(id);
    }

    function test_SecondVerifyReverts() public {
        uint256 id = _create();
        _verify(id);

        vm.expectRevert(Upfront.AlreadyVerified.selector);
        vm.prank(buyer);
        upfront.verifyReceivable(id);
    }

    function test_BuyerWithRevokedRoleCannotVerify() public {
        uint256 id = _create();
        bytes32 role = access.BUYER_ROLE();
        vm.prank(admin);
        access.revokeRole(role, buyer);

        vm.expectRevert(abi.encodeWithSelector(Upfront.NotAllowed.selector, buyer, role));
        vm.prank(buyer);
        upfront.verifyReceivable(id);
    }

    function test_VerifyFailsAtDueDate() public {
        uint256 id = _create();
        vm.warp(dueDate);

        vm.expectRevert(Upfront.DueDatePassed.selector);
        vm.prank(buyer);
        upfront.verifyReceivable(id);
    }

    function test_VerifyFailsAfterDueDate() public {
        uint256 id = _create();
        vm.warp(dueDate + 1);

        vm.expectRevert(Upfront.DueDatePassed.selector);
        vm.prank(buyer);
        upfront.verifyReceivable(id);
    }

    function test_VerifyWorksJustBeforeDueDate() public {
        uint256 id = _create();
        vm.warp(dueDate - 1);
        _verify(id);

        assertTrue(upfront.getReceivable(id).verified);
    }

    // Reject

    function test_RejectBurnsUnitsAndReleasesDocument() public {
        uint256 id = _create();
        vm.expectEmit(address(upfront));
        emit ReceivableRejected(id);
        _reject(id);

        assertEq(uint8(upfront.getReceivable(id).status), uint8(Status.Rejected));
        assertEq(upfront.balanceOf(seller, id), 0);
        assertEq(upfront.totalSupply(id), 0);
        assertEq(upfront.receivableIdByDocHash(DOC), 0);
    }

    function test_OnlyNamedBuyerCanReject() public {
        uint256 id = _create();

        vm.expectRevert(Upfront.NotBuyer.selector);
        vm.prank(seller);
        upfront.rejectReceivable(id);
    }

    function test_CannotRejectOnceVerified() public {
        uint256 id = _create();
        _verify(id);

        vm.expectRevert(Upfront.AlreadyVerified.selector);
        vm.prank(buyer);
        upfront.rejectReceivable(id);
    }

    function test_BuyerWithRevokedRoleCanStillReject() public {
        uint256 id = _create();
        bytes32 role = access.BUYER_ROLE();
        vm.prank(admin);
        access.revokeRole(role, buyer);

        _reject(id);
        assertEq(uint8(upfront.getReceivable(id).status), uint8(Status.Rejected));
    }

    function test_CanRejectAfterDueDate() public {
        uint256 id = _create();
        vm.warp(dueDate + 1);

        _reject(id);
        assertEq(uint8(upfront.getReceivable(id).status), uint8(Status.Rejected));
    }

    // Cancel

    function test_CancelBurnsUnitsAndReleasesDocument() public {
        uint256 id = _create();
        vm.expectEmit(address(upfront));
        emit ReceivableCancelled(id);
        _cancel(id);

        assertEq(uint8(upfront.getReceivable(id).status), uint8(Status.Cancelled));
        assertEq(upfront.balanceOf(seller, id), 0);
        assertEq(upfront.totalSupply(id), 0);
        assertEq(upfront.receivableIdByDocHash(DOC), 0);
    }

    function test_CancelWorksOnVerifiedReceivable() public {
        uint256 id = _create();
        _verify(id);
        _cancel(id);

        Receivable memory r = upfront.getReceivable(id);
        assertEq(uint8(r.status), uint8(Status.Cancelled));
        assertTrue(r.verified);
    }

    function test_OnlySellerCanCancel() public {
        uint256 id = _create();

        vm.expectRevert(Upfront.NotSeller.selector);
        vm.prank(buyer);
        upfront.cancelReceivable(id);
    }

    function test_SellerWithRevokedRoleCanStillCancel() public {
        uint256 id = _create();
        bytes32 role = access.SELLER_ROLE();
        vm.prank(admin);
        access.revokeRole(role, seller);

        _cancel(id);
        assertEq(uint8(upfront.getReceivable(id).status), uint8(Status.Cancelled));
    }

    // Closed receivables

    function test_RejectedReceivableIsFinal() public {
        uint256 id = _create();
        _reject(id);
        _assertClosed(id, Status.Rejected);
    }

    function test_CancelledReceivableIsFinal() public {
        uint256 id = _create();
        _cancel(id);
        _assertClosed(id, Status.Cancelled);
    }

    function _assertClosed(uint256 id, Status status) private {
        bytes memory invalid = abi.encodeWithSelector(Upfront.InvalidStatus.selector, status);

        vm.expectRevert(invalid);
        vm.prank(buyer);
        upfront.verifyReceivable(id);

        vm.expectRevert(invalid);
        vm.prank(buyer);
        upfront.rejectReceivable(id);

        vm.expectRevert(invalid);
        vm.prank(seller);
        upfront.cancelReceivable(id);
    }

    function test_DocumentCanBeReusedAfterReject() public {
        uint256 first = _create();
        _reject(first);

        uint256 second = _create();
        assertEq(second, 2);
        assertEq(upfront.receivableIdByDocHash(DOC), second);
        assertEq(upfront.getReceivable(first).docHash, DOC);
    }

    function test_DocumentCanBeReusedAfterCancel() public {
        uint256 first = _create();
        _cancel(first);

        uint256 second = _create();
        assertEq(upfront.receivableIdByDocHash(DOC), second);
    }

    function test_UnknownIdRevertsEverywhere() public {
        vm.expectRevert(Upfront.UnknownReceivable.selector);
        upfront.verifyReceivable(1);

        vm.expectRevert(Upfront.UnknownReceivable.selector);
        upfront.rejectReceivable(1);

        vm.expectRevert(Upfront.UnknownReceivable.selector);
        upfront.cancelReceivable(1);
    }

    // List

    uint16 constant DISCOUNT = 300;
    uint256 constant CAP = 6;
    uint256 constant PRICE = 970_000;

    function _list(uint256 id) private {
        vm.prank(seller);
        upfront.listReceivable(id, DISCOUNT, CAP);
    }

    function _listed() private returns (uint256 id) {
        id = _create();
        _list(id);
    }

    function _invest(address who, uint256 id, uint256 units) private {
        vm.prank(who);
        upfront.invest(id, units);
    }

    function _funded() private returns (uint256 id) {
        id = _listed();
        _invest(investor, id, 6);
        _invest(investor2, id, 4);
    }

    function test_ListSetsPriceAndStatus() public {
        uint256 id = _create();
        vm.expectEmit(address(upfront));
        emit ReceivableListed(id, DISCOUNT, PRICE, CAP);
        _list(id);

        Receivable memory r = upfront.getReceivable(id);
        assertEq(uint8(r.status), uint8(Status.Listed));
        assertEq(r.unitPrice, PRICE);
        assertEq(r.discountBps, DISCOUNT);
        assertEq(r.maxUnitsPerInvestor, CAP);
    }

    function test_UnverifiedReceivableCanBeListed() public {
        uint256 id = _listed();
        assertFalse(upfront.getReceivable(id).verified);
    }

    function test_VerifiedReceivableCanBeListed() public {
        uint256 id = _create();
        _verify(id);
        _list(id);

        Receivable memory r = upfront.getReceivable(id);
        assertTrue(r.verified);
        assertEq(uint8(r.status), uint8(Status.Listed));
    }

    function test_OnlySellerCanList() public {
        uint256 id = _create();
        vm.expectRevert(Upfront.NotSeller.selector);
        vm.prank(stranger);
        upfront.listReceivable(id, DISCOUNT, CAP);
    }

    function test_SellerWithRevokedRoleCannotList() public {
        uint256 id = _create();
        bytes32 role = access.SELLER_ROLE();
        vm.prank(admin);
        access.revokeRole(role, seller);

        vm.expectRevert(abi.encodeWithSelector(Upfront.NotAllowed.selector, seller, role));
        _list(id);
    }

    function test_CannotListTwice() public {
        uint256 id = _listed();
        vm.expectRevert(abi.encodeWithSelector(Upfront.InvalidStatus.selector, Status.Listed));
        _list(id);
    }

    function test_CannotListClosedReceivable() public {
        uint256 id = _create();
        _cancel(id);
        vm.expectRevert(abi.encodeWithSelector(Upfront.InvalidStatus.selector, Status.Cancelled));
        _list(id);
    }

    function test_ListFailsAtDueDate() public {
        uint256 id = _create();
        vm.warp(dueDate);
        vm.expectRevert(Upfront.DueDatePassed.selector);
        _list(id);
    }

    function test_ListRejectsBadDiscount() public {
        uint256 id = _create();
        vm.startPrank(seller);

        vm.expectRevert(Upfront.InvalidDiscount.selector);
        upfront.listReceivable(id, 0, CAP);

        vm.expectRevert(Upfront.InvalidDiscount.selector);
        upfront.listReceivable(id, 10_000, CAP);
        vm.stopPrank();
    }

    function test_ListRejectsBadCap() public {
        uint256 id = _create();
        vm.startPrank(seller);

        vm.expectRevert(Upfront.InvalidCap.selector);
        upfront.listReceivable(id, DISCOUNT, 0);

        vm.expectRevert(Upfront.InvalidCap.selector);
        upfront.listReceivable(id, DISCOUNT, 11);
        vm.stopPrank();
    }

    // Invest

    function test_InvestSwapsUsdtAndUnitsAtomically() public {
        uint256 id = _listed();
        uint256 startBalance = usdt.balanceOf(investor);

        vm.expectEmit(address(upfront));
        emit Invested(id, investor, 6, 5_820_000);
        _invest(investor, id, 6);

        assertEq(usdt.balanceOf(seller), 5_820_000);
        assertEq(usdt.balanceOf(investor), startBalance - 5_820_000);
        assertEq(usdt.balanceOf(address(upfront)), 0);
        assertEq(upfront.balanceOf(investor, id), 6);
        assertEq(upfront.balanceOf(seller, id), 4);

        Receivable memory r = upfront.getReceivable(id);
        assertEq(r.unitsSold, 6);
        assertEq(uint8(r.status), uint8(Status.Listed));
    }

    function test_TwoInvestorsFundTheReceivable() public {
        uint256 id = _listed();
        _invest(investor, id, 6);

        vm.expectEmit(address(upfront));
        emit ReceivableFunded(id);
        _invest(investor2, id, 4);

        Receivable memory r = upfront.getReceivable(id);
        assertEq(uint8(r.status), uint8(Status.Funded));
        assertEq(r.unitsSold, 10);
        assertEq(usdt.balanceOf(seller), 9_700_000);
        assertEq(upfront.balanceOf(investor, id), 6);
        assertEq(upfront.balanceOf(investor2, id), 4);
        assertEq(upfront.balanceOf(seller, id), 0);
        assertEq(upfront.totalSupply(id), 10);
    }

    function test_UnverifiedReceivableCanBeBought() public {
        uint256 id = _funded();

        Receivable memory r = upfront.getReceivable(id);
        assertEq(uint8(r.status), uint8(Status.Funded));
        assertFalse(r.verified);
    }

    function test_InvestInStepsWithinCap() public {
        uint256 id = _listed();
        _invest(investor, id, 2);
        _invest(investor, id, 4);

        assertEq(upfront.balanceOf(investor, id), 6);
        assertEq(usdt.balanceOf(seller), 5_820_000);
    }

    function _assertNothingMoved(uint256 id, uint256 sellerUnits) private view {
        assertEq(usdt.balanceOf(seller), 0);
        assertEq(upfront.balanceOf(seller, id), sellerUnits);
        assertEq(upfront.getReceivable(id).unitsSold, 0);
    }

    function test_InvestRequiresInvestorRole() public {
        uint256 id = _listed();
        vm.expectRevert(abi.encodeWithSelector(Upfront.NotAllowed.selector, stranger, access.INVESTOR_ROLE()));
        _invest(stranger, id, 1);
        _assertNothingMoved(id, 10);
    }

    function test_SellerCannotInvest() public {
        uint256 id = _listed();
        bytes32 role = access.INVESTOR_ROLE();
        vm.prank(admin);
        access.grantRole(role, seller);

        vm.expectRevert(Upfront.PartyCannotInvest.selector);
        _invest(seller, id, 1);
        _assertNothingMoved(id, 10);
    }

    function test_BuyerCannotInvest() public {
        uint256 id = _listed();
        bytes32 role = access.INVESTOR_ROLE();
        vm.prank(admin);
        access.grantRole(role, buyer);

        vm.expectRevert(Upfront.PartyCannotInvest.selector);
        _invest(buyer, id, 1);
        _assertNothingMoved(id, 10);
    }

    function test_CannotInvestBeforeListing() public {
        uint256 id = _create();
        vm.expectRevert(abi.encodeWithSelector(Upfront.InvalidStatus.selector, Status.Created));
        _invest(investor, id, 1);
        _assertNothingMoved(id, 10);
    }

    function test_CannotInvestOnceFunded() public {
        uint256 id = _funded();
        vm.expectRevert(abi.encodeWithSelector(Upfront.InvalidStatus.selector, Status.Funded));
        _invest(investor2, id, 1);
    }

    function test_CannotInvestAtDueDate() public {
        uint256 id = _listed();
        vm.warp(dueDate);
        vm.expectRevert(Upfront.DueDatePassed.selector);
        _invest(investor, id, 1);
        _assertNothingMoved(id, 10);
    }

    function test_CannotInvestOverCap() public {
        uint256 id = _listed();
        vm.expectRevert(Upfront.ExceedsCap.selector);
        _invest(investor, id, 7);
        _assertNothingMoved(id, 10);
    }

    function test_CapCountsEarlierPurchases() public {
        uint256 id = _listed();
        _invest(investor, id, 6);

        vm.expectRevert(Upfront.ExceedsCap.selector);
        _invest(investor, id, 1);
        assertEq(upfront.balanceOf(investor, id), 6);
    }

    function test_CannotBuyMoreThanAvailable() public {
        uint256 id = _listed();
        _invest(investor, id, 6);

        vm.expectRevert(Upfront.ExceedsAvailable.selector);
        _invest(investor2, id, 5);
        assertEq(upfront.balanceOf(investor2, id), 0);
    }

    function test_CannotInvestZeroUnits() public {
        uint256 id = _listed();
        vm.expectRevert(Upfront.InvalidUnits.selector);
        _invest(investor, id, 0);
        _assertNothingMoved(id, 10);
    }

    function test_InvestRevertsWithoutAllowance() public {
        uint256 id = _listed();
        vm.prank(investor);
        usdt.approve(address(upfront), 0);

        vm.expectRevert(
            abi.encodeWithSelector(IERC20Errors.ERC20InsufficientAllowance.selector, address(upfront), 0, PRICE)
        );
        _invest(investor, id, 1);
        _assertNothingMoved(id, 10);
        assertEq(upfront.balanceOf(investor, id), 0);
    }

    function test_InvestRevertsWhenSellerRoleRevoked() public {
        uint256 id = _listed();
        bytes32 role = access.SELLER_ROLE();
        vm.prank(admin);
        access.revokeRole(role, seller);

        vm.expectRevert(abi.encodeWithSelector(Upfront.NotAllowed.selector, seller, role));
        _invest(investor, id, 1);
        _assertNothingMoved(id, 10);
    }

    function test_InvestRevertsWhenBuyerRoleRevoked() public {
        uint256 id = _listed();
        bytes32 role = access.BUYER_ROLE();
        vm.prank(admin);
        access.revokeRole(role, buyer);

        vm.expectRevert(abi.encodeWithSelector(Upfront.NotAllowed.selector, buyer, role));
        _invest(investor, id, 1);
        _assertNothingMoved(id, 10);
    }

    function test_UnknownIdRevertsOnListAndInvest() public {
        vm.expectRevert(Upfront.UnknownReceivable.selector);
        upfront.listReceivable(1, DISCOUNT, CAP);

        vm.expectRevert(Upfront.UnknownReceivable.selector);
        upfront.invest(1, 1);
    }

    function test_SellerUnitsStayLockedAfterInvest() public {
        uint256 id = _listed();
        _invest(investor, id, 6);

        vm.expectRevert(Upfront.UnitsLocked.selector);
        vm.prank(seller);
        upfront.safeTransferFrom(seller, investor2, id, 1, "");
    }

    // Verify, reject, and cancel on Listed and Funded

    function test_BuyerCanVerifyWhileListed() public {
        uint256 id = _listed();
        _verify(id);

        Receivable memory r = upfront.getReceivable(id);
        assertTrue(r.verified);
        assertEq(uint8(r.status), uint8(Status.Listed));
    }

    function test_BuyerCanVerifyWhileFunded() public {
        uint256 id = _funded();
        _verify(id);

        Receivable memory r = upfront.getReceivable(id);
        assertTrue(r.verified);
        assertEq(uint8(r.status), uint8(Status.Funded));
    }

    function test_CancelWorksOnListedWithNoSales() public {
        uint256 id = _listed();
        _cancel(id);

        assertEq(uint8(upfront.getReceivable(id).status), uint8(Status.Cancelled));
        assertEq(upfront.totalSupply(id), 0);
        assertEq(upfront.receivableIdByDocHash(DOC), 0);
    }

    function test_RejectWorksOnListedWithNoSales() public {
        uint256 id = _listed();
        _reject(id);

        assertEq(uint8(upfront.getReceivable(id).status), uint8(Status.Rejected));
        assertEq(upfront.totalSupply(id), 0);
    }

    function test_CancelFailsOnceUnitsAreSold() public {
        uint256 id = _listed();
        _invest(investor, id, 1);

        vm.expectRevert(Upfront.UnitsAlreadySold.selector);
        _cancel(id);
    }

    function test_RejectFailsOnceUnitsAreSold() public {
        uint256 id = _listed();
        _invest(investor, id, 1);

        vm.expectRevert(Upfront.UnitsAlreadySold.selector);
        _reject(id);
    }

    function test_CancelAndRejectFailOnceFunded() public {
        uint256 id = _funded();
        bytes memory invalid = abi.encodeWithSelector(Upfront.InvalidStatus.selector, Status.Funded);

        vm.expectRevert(invalid);
        _cancel(id);

        vm.expectRevert(invalid);
        _reject(id);
    }

    function test_CannotRejectVerifiedListedReceivable() public {
        uint256 id = _listed();
        _verify(id);

        vm.expectRevert(Upfront.AlreadyVerified.selector);
        _reject(id);
    }

    // Attacks

    function test_ReceiverCannotReenterInvest() public {
        uint256 id = _listed();
        ReentrantInvestor attacker = new ReentrantInvestor(upfront, id);
        _enlist(address(attacker));

        vm.expectRevert(ReentrancyGuard.ReentrancyGuardReentrantCall.selector);
        attacker.attack();
        _assertNothingMoved(id, 10);
    }

    /// @dev The seller approved an operator, so only the `UnitsLocked` rule protects their units.
    function test_ReceiverCannotUseFundingFlagToTakeSellerUnits() public {
        uint256 id = _listed();
        FlagThief attacker = new FlagThief(upfront, seller, id);
        _enlist(address(attacker));
        vm.prank(seller);
        upfront.setApprovalForAll(address(attacker), true);

        vm.expectRevert(Upfront.UnitsLocked.selector);
        attacker.attack();
        _assertNothingMoved(id, 10);
    }

    function _enlist(address wallet) private {
        bytes32 role = access.INVESTOR_ROLE();
        vm.prank(admin);
        access.grantRole(role, wallet);
        usdt.mint(wallet, 100e6);
    }

    function testFuzz_InvestPaysExactly(uint16 discountBps, uint8 units) public {
        discountBps = uint16(bound(discountBps, 1, 9_999));
        units = uint8(bound(units, 1, 10));
        uint256 id = _create();

        vm.prank(seller);
        upfront.listReceivable(id, discountBps, 10);
        _invest(investor, id, units);

        uint256 expected = uint256(units) * (1_000_000 * (10_000 - uint256(discountBps)) / 10_000);
        assertEq(usdt.balanceOf(seller), expected);
        assertEq(upfront.balanceOf(investor, id), units);
        assertEq(upfront.balanceOf(seller, id), 10 - uint256(units));
    }
}
