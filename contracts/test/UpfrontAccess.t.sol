// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {UpfrontAccess} from "../src/UpfrontAccess.sol";

contract UpfrontAccessTest is Test {
    address admin = makeAddr("admin");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    UpfrontAccess access;
    bytes32 sellerRole;

    function setUp() public {
        access = new UpfrontAccess(admin);
        sellerRole = access.SELLER_ROLE();
    }

    function test_ConstructorGrantsAdmin() public view {
        assertTrue(access.hasRole(access.DEFAULT_ADMIN_ROLE(), admin));
        assertEq(access.getRoleMemberCount(access.DEFAULT_ADMIN_ROLE()), 1);
    }

    function test_ConstructorRejectsZeroAdmin() public {
        vm.expectRevert(UpfrontAccess.ZeroAddress.selector);
        new UpfrontAccess(address(0));
    }

    function test_RoleConstantsMatchTheirNames() public view {
        assertEq(access.SELLER_ROLE(), keccak256("SELLER_ROLE"));
        assertEq(access.BUYER_ROLE(), keccak256("BUYER_ROLE"));
        assertEq(access.INVESTOR_ROLE(), keccak256("INVESTOR_ROLE"));
    }

    function test_AdminGrantsAndRevokes() public {
        vm.startPrank(admin);
        access.grantRole(sellerRole, alice);
        assertTrue(access.hasRole(sellerRole, alice));

        access.revokeRole(sellerRole, alice);
        assertFalse(access.hasRole(sellerRole, alice));
        vm.stopPrank();
    }

    function test_NonAdminCannotGrant() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector, alice, access.DEFAULT_ADMIN_ROLE()
            )
        );
        vm.prank(alice);
        access.grantRole(sellerRole, alice);
    }

    function test_NonAdminCannotRevoke() public {
        vm.prank(admin);
        access.grantRole(sellerRole, bob);

        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector, alice, access.DEFAULT_ADMIN_ROLE()
            )
        );
        vm.prank(alice);
        access.revokeRole(sellerRole, bob);
    }

    function test_RoleMembersCanBeListed() public {
        vm.startPrank(admin);
        access.grantRole(sellerRole, alice);
        access.grantRole(sellerRole, bob);
        vm.stopPrank();

        assertEq(access.getRoleMemberCount(sellerRole), 2);
        assertEq(access.getRoleMember(sellerRole, 0), alice);
        assertEq(access.getRoleMember(sellerRole, 1), bob);

        address[] memory members = access.getRoleMembers(sellerRole);
        assertEq(members.length, 2);
    }

    function test_RevokedMemberLeavesTheList() public {
        vm.startPrank(admin);
        access.grantRole(sellerRole, alice);
        access.revokeRole(sellerRole, alice);
        vm.stopPrank();

        assertEq(access.getRoleMemberCount(sellerRole), 0);
    }
}
