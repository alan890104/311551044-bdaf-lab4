// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

contract SafeProxy {
    bytes32 private constant ownerPos = keccak256("safe.proxy.owner");
    bytes32 private constant implPos = keccak256("safe.proxy.implementation");

    event ImplChanged(address indexed implementation);
    event OwnerChanged(address indexed owner);

    modifier onlyOwner() {
        require(msg.sender == getOwner(), "only owner can call this function");
        _;
    }

    constructor(address owner, address impl) {
        _setOwner(owner);
        _setImpl(impl);
    }

    function getImpl() public view returns (address impl) {
        // read impl position from storage
        bytes32 position = implPos;
        // load impl address which is saved in the position
        assembly {
            impl := sload(position)
        }
    }

    function getOwner() public view returns (address owner) {
        // read owner position from storage
        bytes32 position = ownerPos;
        // load owner address which is saved in the position
        assembly {
            owner := sload(position)
        }
    }

    function _setOwner(address newOwner) internal {
        // read owner position from storage
        bytes32 position = ownerPos;
        // save owner address into position
        assembly {
            sstore(position, newOwner)
        }
        // emit event
        emit OwnerChanged(newOwner);
    }

    function _setImpl(address newImpl) internal {
        // read impl position from storage
        bytes32 position = implPos;
        // save impl address into position
        assembly {
            sstore(position, newImpl)
        }
        // emit event
        emit ImplChanged(newImpl);
    }

    function _delegate(address impl) internal {
        // delegate call of address impl
        // reference: openzeppelin proxy contract
        assembly {
            // calldatacopy copies msg.data with size calldatasize()
            // at the position 0 (second arg)
            // into memory offset 0 (first arg)
            calldatacopy(0, 0, calldatasize())

            // delegatecall executes the code of address impl
            // args: (gas, to, in_offset, in_size, out_offset, out_size)
            let res := delegatecall(gas(), impl, 0, calldatasize(), 0, 0)

            // returndatacopy copies the return data of the delegatecall
            returndatacopy(0, 0, returndatasize())

            // revert if delegatecall failed (return 0)
            // otherwise return the data
            switch res
            case 0 {
                revert(0, returndatasize())
            }
            default {
                return(0, returndatasize())
            }
        }
    }

    // fallback function is triggered when call data is not empty
    fallback() external payable {
        _delegate(getImpl());
    }

    // receive function is triggered when call data is empty
    receive() external payable {
        _delegate(getImpl());
    }
}
