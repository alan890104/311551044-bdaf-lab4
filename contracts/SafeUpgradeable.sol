// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract SafeUpgradeable {
    // Upgradeable pattern variables, check if contract is initialized
    bool isInitialized;
    // Upgradeable pattern variables, owner of the contract
    address owner;
    // Balance mapping {user: {token: amount}}
    mapping(address => mapping(address => uint256)) private _balances;
    // Balance of fees {token: amount}
    mapping(address => uint256) _fees;

    event Initialized(address owner);
    event Deposited(address token, address from, uint amount);
    event Withdrawed(address token, address to, uint amount, uint fee);
    event FeeTaken(address token, address owner, uint amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier afterInitialized() {
        require(isInitialized, "Contract is not initialized");
        _;
    }

    modifier nonZeroAmount(uint256 amount) {
        require(amount > 0, "Amount should be greater than 0");
        _;
    }

    // Set owner, only once
    function initialize(address _owner) external {
        require(!isInitialized, "Contract is already initialized");
        owner = _owner;
        isInitialized = true;
        emit Initialized(_owner);
    }

    // Deposit function allows user to deposit tokens into the vault
    function deposit(
        address token,
        uint256 amount
    ) external afterInitialized nonZeroAmount(amount) {
        // Transfer tokens from the user to the vault
        require(
            IERC20(token).transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );

        // Update the user's balance
        _balances[msg.sender][token] += amount;

        // Emit an event
        emit Deposited(token, msg.sender, amount);
    }

    // Withdraw function allows user to withdraw tokens from the vault
    function withdraw(
        address token,
        uint256 amount
    ) external afterInitialized nonZeroAmount(amount) {
        require(_balances[msg.sender][token] >= amount, "Insufficient balance");

        // Calculate the fee and the net amount
        uint256 fee = amount / 1000;
        uint256 net = amount - fee;

        // Update the balances
        _balances[msg.sender][token] -= amount;

        // Save to fees
        _fees[token] += fee;

        // Transfer the net amount to the user
        require(IERC20(token).transfer(msg.sender, net), "Transfer failed");

        // Emit an event
        emit Withdrawed(token, msg.sender, net, fee);
    }

    // getBalance function shows the balance of the specified token and user
    function getBalance(
        address token,
        address account
    ) external view afterInitialized returns (uint256) {
        return _balances[account][token];
    }

    // getFee function shows the fee of the specified token
    function getFee(
        address token
    ) external view afterInitialized onlyOwner returns (uint256) {
        return _fees[token];
    }

    // takeFee function allows owner to take the accumulated fees for a token
    function takeFee(address token) public afterInitialized onlyOwner {
        require(_fees[token] > 0, "No fees to take");

        // Get the fee
        uint256 fee = _fees[token];

        // Transfer the fee to the owner
        require(IERC20(token).transfer(owner, fee), "Transfer failed");

        // Reset the fee
        _fees[token] = 0;

        // Emit an event
        emit FeeTaken(token, owner, fee);
    }

    // getOwner function shows the owner of the contract
    function getOwner() external view afterInitialized returns (address) {
        return owner;
    }
}
