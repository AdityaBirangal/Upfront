// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Script, console} from "forge-std/Script.sol";
import {InvestorGate} from "../src/InvestorGate.sol";
import {UpfrontAccess} from "../src/UpfrontAccess.sol";

/// @notice Deploys InvestorGate beside the existing contracts and makes it an admin of UpfrontAccess, so
/// verified humans can join as investors. Run it from an admin wallet. Existing investors keep their role.
/// Set ACCESS_ADDRESS, and GATE_SIGNER to the address of the backend's GATE_SIGNER_KEY. When replacing a
/// gate, set OLD_GATE to remove its admin role, and REVOKE_WALLETS (comma separated) for wallets it let in.
contract DeployGate is Script {
    function run() external returns (InvestorGate gate) {
        UpfrontAccess access = UpfrontAccess(vm.envAddress("ACCESS_ADDRESS"));
        address signer = vm.envAddress("GATE_SIGNER");
        address oldGate = vm.envOr("OLD_GATE", address(0));
        address[] memory wallets = vm.envOr("REVOKE_WALLETS", ",", new address[](0));

        vm.startBroadcast();
        gate = new InvestorGate(access, signer);
        access.grantRole(access.DEFAULT_ADMIN_ROLE(), address(gate));
        if (oldGate != address(0)) access.revokeRole(access.DEFAULT_ADMIN_ROLE(), oldGate);
        for (uint256 i = 0; i < wallets.length; ++i) {
            access.revokeRole(access.INVESTOR_ROLE(), wallets[i]);
        }
        vm.stopBroadcast();

        console.log("InvestorGate:", address(gate));
    }
}
