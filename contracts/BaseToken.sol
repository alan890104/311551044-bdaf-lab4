// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// This is blacklisted custom ERC20
// We should always consider inheriting from OpenZeppelin's ERC20
// But for testing purposes, we can use this
// In order to trigger the trasnfer failed event
contract BaseToken is IERC20, Ownable {
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    mapping(address => bool) blacklist;

    constructor(uint256 initialBalance) {
        balanceOf[msg.sender] += initialBalance;
        totalSupply += initialBalance;
    }

    function name() external pure returns (string memory) {
        return "Base";
    }

    function symbol() external pure returns (string memory) {
        return "ADRY";
    }

    function decimals() external pure returns (uint8) {
        return 18;
    }

    // Add address to blacklist
    function addBlacklist(address _blacklist) external onlyOwner {
        blacklist[_blacklist] = true;
    }

    // Custom transfer function
    // if recipient is in blacklist, then return false
    // Otherwise, return true
    function transfer(
        address recipient,
        uint256 amount
    ) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[recipient] += amount;
        emit Transfer(msg.sender, recipient, amount);
        return !blacklist[recipient];
    }

    // Approve allows the spender to spend the amount of tokens
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    // TransferFrom spend the amount of tokens from the sender to the recipient
    // if sender or recipient is in blacklist, then return false
    // Otherwise, return true
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool) {
        require(
            allowance[sender][msg.sender] >= amount,
            "ERC20: insufficient allowance"
        );
        allowance[sender][msg.sender] -= amount;
        balanceOf[sender] -= amount;
        balanceOf[recipient] += amount;
        emit Transfer(sender, recipient, amount);
        return !blacklist[sender] || !blacklist[recipient];
    }

    // Mint function to mint tokens
    function mint(uint256 amount) external {
        balanceOf[msg.sender] += amount;
        totalSupply += amount;
        emit Transfer(address(0), msg.sender, amount);
    }
}
