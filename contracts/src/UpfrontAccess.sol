// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {AccessControlEnumerable} from "@openzeppelin/contracts/access/extensions/AccessControlEnumerable.sol";

/// @title UpfrontAccess
/// @notice Records which wallets may act as Seller, Buyer, or Investor. Roles are managed with the
/// standard `grantRole` and `revokeRole`, and enumerable so the UI can list members from the chain.
contract UpfrontAccess is AccessControlEnumerable {
    uint256 public constant VERSION = 2;

    bytes32 public constant SELLER_ROLE = keccak256("SELLER_ROLE");
    bytes32 public constant BUYER_ROLE = keccak256("BUYER_ROLE");
    bytes32 public constant INVESTOR_ROLE = keccak256("INVESTOR_ROLE");

    error ZeroAddress();

    constructor(address admin) {
        if (admin == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }
}
