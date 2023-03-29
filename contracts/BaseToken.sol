// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Example class - a mock class using delivering from ERC20
contract BaseToken is ERC20 {
    constructor(uint256 initialBalance) ERC20("Base", "ADRY") {
        _mint(msg.sender, initialBalance);
    }
}
