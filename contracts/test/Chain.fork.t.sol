// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

/// @notice Checks the chain facts every later version depends on.
contract ChainForkTest is Test {
    address constant USDT = 0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7;
    address constant MULTICALL3 = 0xcA11bde05977b3631167028862bE2a173976CA11;

    function setUp() public {
        vm.createSelectFork("whitechain_sepolia");
    }

    function test_ChainIdIsWhitechainSepolia() public view {
        assertEq(block.chainid, 1874);
    }

    function test_UsdtHasSixDecimals() public view {
        assertEq(IERC20Metadata(USDT).decimals(), 6);
    }

    function test_Multicall3IsDeployed() public view {
        assertGt(MULTICALL3.code.length, 0);
    }
}
