// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {SafeProxy} from "./SafeProxy.sol";
import {Safe} from "./Safe.sol";

contract SafeFactory {
    address owner;
    address implementation;

    event SafeDeployed(address indexed safe, address indexed owner);
    event ProxyDeployed(address indexed proxy, address indexed owner);
    event ImplementationUpdated(address indexed newImpl, address indexed owner);

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner can call this function");
        _;
    }

    constructor(address _owner, address _impl) {
        owner = _owner;
        implementation = _impl;
    }

    // Only owner can update implementation by giving newImpl address
    function updateImplementation(address newImpl) external onlyOwner {
        implementation = newImpl;
        emit ImplementationUpdated(newImpl, msg.sender);
    }

    // Deploy proxy, call initialize() in implementation
    function deploySafeProxy() external {
        // deploy safe proxy with owner, and point it to the implementation
        SafeProxy proxy = new SafeProxy(msg.sender, implementation);
        // get the depolyed proxy address
        address proxyAddress = address(proxy);
        // Call function initialize() in proxy
        // However, this function is not in the ABI of proxy
        // It will be "redirect" by the proxy to the implementation
        // We actually call initialize() in the implementation
        (bool success, ) = proxyAddress.call(
            abi.encodeWithSignature("initialize(address)", msg.sender)
        );
        require(success, "failed to initialize proxy");
        emit ProxyDeployed(proxyAddress, msg.sender);
    }

    // Deploy Implementation contract
    function depolySafe() external {
        // deploy safe contract with owner `msg.sender`
        Safe vault = new Safe(msg.sender);
        emit SafeDeployed(address(vault), msg.sender);
    }

    // Get the implementation address
    function getImpl() external view returns (address) {
        return implementation;
    }
}
