// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Script, console} from "forge-std/Script.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {Upfront} from "../src/Upfront.sol";
import {UpfrontAccess} from "../src/UpfrontAccess.sol";

/// @notice Deploys both contracts on Whitechain Sepolia against the real USDT, and grants demo roles.
contract Deploy is Script {
    address constant USDT = 0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7;

    address constant ADMIN = 0x73374fe93c8e296c49E76D81D335bCe816bfa64B;
    address constant SELLER = 0x8277639565AAE46ba7D3d8fA73A3fFC0b9c5BF50;
    address constant BUYER = 0xe58d750c4f22dD374476D73f0b9E6BEb34b1e4AD;
    address constant INVESTOR_1 = 0x48542534dF28c01768aCF552Effc30221e92b03f;
    address constant INVESTOR_2 = 0xbc5A7B66B53CBDa69AEb5516E4B58B8649815d2A;

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
        vm.stopBroadcast();

        console.log("UpfrontAccess:", address(access));
        console.log("Upfront:", address(upfront));
    }
}
