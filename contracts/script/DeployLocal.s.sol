// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Script, console} from "forge-std/Script.sol";
import {Upfront} from "../src/Upfront.sol";
import {UpfrontAccess} from "../src/UpfrontAccess.sol";
import {MockUSDT} from "../test/mocks/MockUSDT.sol";

/// @notice Anvil only. Deploys a mock USDT and both contracts, then funds the demo wallets, which are
/// anvil's default accounts: 0 Admin, 1 Seller, 2 Buyer, 3 Investor 1, 4 Investor 2, 5 Outsider.
/// Set GRANT_ROLES=false to start with no roles, for testing the Admin page.
contract DeployLocal is Script {
    string constant MNEMONIC = "test test test test test test test test test test test junk";

    function run() external returns (MockUSDT usdt, UpfrontAccess access, Upfront upfront) {
        require(block.chainid == 31337, "Anvil only");

        address admin = _wallet(0);
        address seller = _wallet(1);
        address buyer = _wallet(2);
        address investor1 = _wallet(3);
        address investor2 = _wallet(4);

        vm.startBroadcast(vm.deriveKey(MNEMONIC, 0));
        usdt = new MockUSDT();
        access = new UpfrontAccess(admin);
        upfront = new Upfront(access, usdt, "");

        usdt.mint(seller, 20e6); // covers the yield when settling
        usdt.mint(investor1, 12e6);
        usdt.mint(investor2, 8e6);

        if (vm.envOr("GRANT_ROLES", true)) {
            access.grantRole(access.SELLER_ROLE(), seller);
            access.grantRole(access.BUYER_ROLE(), buyer);
            access.grantRole(access.INVESTOR_ROLE(), investor1);
            access.grantRole(access.INVESTOR_ROLE(), investor2);
        }
        vm.stopBroadcast();

        console.log("USDT:", address(usdt));
        console.log("UpfrontAccess:", address(access));
        console.log("Upfront:", address(upfront));
    }

    function _wallet(uint32 index) private returns (address) {
        return vm.addr(vm.deriveKey(MNEMONIC, index));
    }
}
