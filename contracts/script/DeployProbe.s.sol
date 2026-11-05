// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Script, console} from "forge-std/Script.sol";
import {Probe} from "../src/Probe.sol";

contract DeployProbe is Script {
    function run() external returns (Probe probe) {
        vm.startBroadcast();
        probe = new Probe();
        vm.stopBroadcast();
        console.log("Probe:", address(probe));
    }
}
