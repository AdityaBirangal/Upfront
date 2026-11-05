// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @notice Tops up the demo wallets from the Admin wallet. Only sends what each wallet is short of,
/// so it is safe to run again between demo runs.
contract FundDemoWallets is Script {
    using SafeERC20 for IERC20;

    IERC20 constant USDT = IERC20(0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7);

    address constant SELLER = 0x8277639565AAE46ba7D3d8fA73A3fFC0b9c5BF50;
    address constant BUYER = 0xe58d750c4f22dD374476D73f0b9E6BEb34b1e4AD;
    address constant INVESTOR_1 = 0x48542534dF28c01768aCF552Effc30221e92b03f;
    address constant INVESTOR_2 = 0xbc5A7B66B53CBDa69AEb5516E4B58B8649815d2A;
    address constant OUTSIDER = 0x669406cE512732B8A32edde5566E17a8309E1DE1;

    function run() external {
        require(block.chainid == 1874, "Whitechain Sepolia only");

        vm.startBroadcast();
        _topUp(SELLER, 0.05 ether, 0);
        _topUp(BUYER, 0.05 ether, 20e6);
        _topUp(INVESTOR_1, 0.05 ether, 12e6);
        _topUp(INVESTOR_2, 0.05 ether, 8e6);
        _topUp(OUTSIDER, 0.01 ether, 0);
        vm.stopBroadcast();
    }

    function _topUp(address wallet, uint256 wbt, uint256 usdt) private {
        if (wallet.balance < wbt) {
            (bool ok,) = wallet.call{value: wbt - wallet.balance}("");
            require(ok, "WBT transfer failed");
        }
        uint256 held = USDT.balanceOf(wallet);
        if (held < usdt) USDT.safeTransfer(wallet, usdt - held);
        console.log(wallet, wallet.balance, USDT.balanceOf(wallet));
    }
}
