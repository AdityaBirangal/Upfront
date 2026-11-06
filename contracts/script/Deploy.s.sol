// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Script, console} from "forge-std/Script.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {Upfront} from "../src/Upfront.sol";
import {UpfrontAccess} from "../src/UpfrontAccess.sol";

/// @notice Deploys both contracts on Whitechain Sepolia against the real USDT, and grants demo roles.
/// Aditya and Niranjan each get one wallet per role, so the app can be tested without shared keys.
/// The final V6 deploy leaves Niranjan's wallets out.
contract Deploy is Script {
    address constant USDT = 0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7;

    address constant ADMIN = 0x73374fe93c8e296c49E76D81D335bCe816bfa64B;
    address constant SELLER = 0x8277639565AAE46ba7D3d8fA73A3fFC0b9c5BF50;
    address constant BUYER = 0xe58d750c4f22dD374476D73f0b9E6BEb34b1e4AD;
    address constant INVESTOR_1 = 0x48542534dF28c01768aCF552Effc30221e92b03f;
    address constant INVESTOR_2 = 0xbc5A7B66B53CBDa69AEb5516E4B58B8649815d2A;

    address constant NIRANJAN_ADMIN = 0x3271DdCFd5C38d8282F65693622330cE3b134c53;
    address constant NIRANJAN_SELLER = 0x6991180a1230543790998B8b6c8a105Df0D639A0;
    address constant NIRANJAN_BUYER = 0xdE060B17340D615b071AD1f69103d371D196882c;
    address constant NIRANJAN_INVESTOR = 0x5218F17e4EA85746E62b70634899F4abd7cF2634;

    function run() external returns (UpfrontAccess access, Upfront upfront) {
        require(block.chainid == 1874, "Whitechain Sepolia only");

        vm.startBroadcast(ADMIN);
        access = new UpfrontAccess(ADMIN);
        upfront = new Upfront(access, IERC20Metadata(USDT), "");

        bytes32 seller = access.SELLER_ROLE();
        bytes32 buyer = access.BUYER_ROLE();
        bytes32 investor = access.INVESTOR_ROLE();

        access.grantRole(seller, SELLER);
        access.grantRole(buyer, BUYER);
        access.grantRole(investor, INVESTOR_1);
        access.grantRole(investor, INVESTOR_2);

        access.grantRole(access.DEFAULT_ADMIN_ROLE(), NIRANJAN_ADMIN);
        access.grantRole(seller, NIRANJAN_SELLER);
        access.grantRole(buyer, NIRANJAN_BUYER);
        access.grantRole(investor, NIRANJAN_INVESTOR);
        vm.stopBroadcast();

        console.log("UpfrontAccess:", address(access));
        console.log("Upfront:", address(upfront));
    }
}
