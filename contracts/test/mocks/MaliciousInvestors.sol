// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC1155Holder} from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import {Upfront} from "../../src/Upfront.sol";

/// @notice Buys one unit, then tries to buy again from inside the transfer callback.
contract ReentrantInvestor is ERC1155Holder {
    Upfront immutable upfront;
    uint256 immutable id;

    constructor(Upfront upfront_, uint256 id_) {
        upfront = upfront_;
        id = id_;
    }

    function attack() external {
        IERC20(address(upfront.usdt())).approve(address(upfront), type(uint256).max);
        upfront.invest(id, 1);
    }

    function onERC1155Received(address, address, uint256, uint256, bytes memory) public override returns (bytes4) {
        upfront.invest(id, 1);
        return this.onERC1155Received.selector;
    }
}

/// @notice Buys one unit, then tries to pull more of the seller's units from inside the callback,
/// while `invest` is still running.
contract FlagThief is ERC1155Holder {
    Upfront immutable upfront;
    address immutable seller;
    uint256 immutable id;

    constructor(Upfront upfront_, address seller_, uint256 id_) {
        upfront = upfront_;
        seller = seller_;
        id = id_;
    }

    function attack() external {
        IERC20(address(upfront.usdt())).approve(address(upfront), type(uint256).max);
        upfront.invest(id, 1);
    }

    function onERC1155Received(address, address, uint256, uint256, bytes memory) public override returns (bytes4) {
        upfront.safeTransferFrom(seller, address(this), id, 5, "");
        return this.onERC1155Received.selector;
    }
}
