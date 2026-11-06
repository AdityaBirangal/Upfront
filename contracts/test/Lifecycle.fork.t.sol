// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test, console} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Receivable, Status, Upfront} from "../src/Upfront.sol";
import {UpfrontAccess} from "../src/UpfrontAccess.sol";

/// @notice Runs against the real USDT on a fork of Whitechain Sepolia. Nothing here is broadcast.
contract LifecycleForkTest is Test {
    using SafeERC20 for IERC20;

    IERC20 constant USDT = IERC20(0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7);
    address constant USDT_HOLDER = 0x73374fe93c8e296c49E76D81D335bCe816bfa64B; // Admin wallet

    address admin = makeAddr("admin");
    address seller = makeAddr("seller");
    address buyer = makeAddr("buyer");
    address investor = makeAddr("investor");
    address investor2 = makeAddr("investor2");

    UpfrontAccess access;
    Upfront upfront;
    uint256 id;

    function setUp() public {
        vm.createSelectFork("whitechain_sepolia");

        access = new UpfrontAccess(admin);
        upfront = new Upfront(access, IERC20Metadata(address(USDT)), "");

        vm.startPrank(admin);
        access.grantRole(access.SELLER_ROLE(), seller);
        access.grantRole(access.BUYER_ROLE(), buyer);
        access.grantRole(access.INVESTOR_ROLE(), investor);
        access.grantRole(access.INVESTOR_ROLE(), investor2);
        vm.stopPrank();

        vm.startPrank(USDT_HOLDER);
        USDT.safeTransfer(investor, 6e6);
        USDT.safeTransfer(investor2, 4e6);
        vm.stopPrank();

        vm.startPrank(seller);
        id = upfront.createReceivable(buyer, 10e6, uint64(block.timestamp + 1 days), keccak256("doc"), "RCV-1001");
        upfront.listReceivable(id, 300, 6);
        vm.stopPrank();
    }

    function _approveAndInvest(address who, uint256 units) private {
        vm.startPrank(who);
        USDT.safeIncreaseAllowance(address(upfront), units * 970_000);
        upfront.invest(id, units);
        vm.stopPrank();
    }

    function test_UnitIsReadFromRealUsdt() public view {
        assertEq(upfront.UNIT(), 1_000_000);
    }

    function test_InvestWorksWithRealUsdt() public {
        _approveAndInvest(investor, 6);
        _approveAndInvest(investor2, 4);

        assertEq(USDT.balanceOf(seller), 9_700_000);
        assertEq(USDT.balanceOf(address(upfront)), 0);
        assertEq(USDT.balanceOf(investor), 180_000);
        assertEq(USDT.balanceOf(investor2), 120_000);
        assertEq(upfront.balanceOf(investor, id), 6);
        assertEq(upfront.balanceOf(investor2, id), 4);
        assertEq(uint8(upfront.getReceivable(id).status), uint8(Status.Funded));
    }

    function test_FullLifecycleWithRealUsdt() public {
        _approveAndInvest(investor, 6);
        _approveAndInvest(investor2, 4);

        vm.prank(buyer);
        upfront.verifyReceivable(id);

        vm.prank(USDT_HOLDER);
        USDT.safeTransfer(seller, 1e6); // covers the yield

        vm.startPrank(seller);
        USDT.safeIncreaseAllowance(address(upfront), 10e6);
        upfront.settle(id);
        vm.stopPrank();

        assertEq(USDT.balanceOf(seller), 700_000); // 9.70 raised, 1 top-up, 10 repaid
        assertEq(USDT.balanceOf(investor), 6_180_000);
        assertEq(USDT.balanceOf(investor2), 4_120_000);
        assertEq(USDT.balanceOf(address(upfront)), 0);
        assertEq(upfront.totalSupply(id), 0);
        assertEq(uint8(upfront.getReceivable(id).status), uint8(Status.Settled));
    }

    function test_FailedInvestMovesNoRealUsdt() public {
        uint256 start = USDT.balanceOf(investor);

        vm.expectRevert();
        vm.prank(investor);
        upfront.invest(id, 1); // no allowance

        assertEq(USDT.balanceOf(investor), start);
        assertEq(USDT.balanceOf(seller), 0);
    }

    /// @dev Classic USDT refuses this, so the UI would have to approve 0 first.
    function test_ProbeChangingNonZeroAllowance() public {
        vm.startPrank(investor);
        (bool first,) = address(USDT).call(abi.encodeCall(IERC20.approve, (address(upfront), 1_000_000)));
        (bool second,) = address(USDT).call(abi.encodeCall(IERC20.approve, (address(upfront), 2_000_000)));
        vm.stopPrank();

        assertTrue(first);
        console.log("non-zero to non-zero approve allowed:", second);
        console.log("allowance now:", USDT.allowance(investor, address(upfront)));
    }
}
