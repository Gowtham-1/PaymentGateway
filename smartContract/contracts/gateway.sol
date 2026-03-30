// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract gateway {
    event PaymentReceived(address indexed from, address indexed token, uint256 amount);
    event NativeReceived(address indexed from, uint256 amount);

    function receiveERC20(address token, uint256 amount) external {
        require(IERC20(token).transferFrom(msg.sender, address(this), amount), "Transfer failed");
        emit PaymentReceived(msg.sender, token, amount);
    }

    // Receive native currency (e.g., ETH)
    receive() external payable {
        emit NativeReceived(msg.sender, msg.value);
    }
}
