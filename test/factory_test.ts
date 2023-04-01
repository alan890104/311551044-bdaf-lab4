import { ethers } from "hardhat"
import { Signer } from "ethers";
import { expect } from "chai";
import { SafeFactory, SafeProxy, SafeUpgradeable } from "../typechain-types";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("SafeFactory", () => {
    let owner: Signer;
    let user1: Signer;
    let impl: SafeUpgradeable;
    let proxy: SafeProxy;
    let factory: SafeFactory;

    async function deployFixutre() {
        // Deploy the implementation contract
        const implFactory = await ethers.getContractFactory("SafeUpgradeable");
        const _impl = await implFactory.deploy();
        await _impl.deployed()

        // Deploy the factory contract with implementation and owner
        const SafeFactory = await ethers.getContractFactory("SafeFactory");
        const _factory = await SafeFactory.deploy(owner.getAddress(), _impl.address);
        await _factory.deployed()
        return { _impl, _factory };
    }

    async function proxyFactoryFixture() {
        const proxyFactory = await ethers.getContractFactory("SafeProxy");
        return proxyFactory
    }

    async function implFactoryFixure() {
        const implFactory = await ethers.getContractFactory("SafeUpgradeable");
        return implFactory
    }

    beforeEach(async () => {
        const [_owner, _user1] = await ethers.getSigners();
        owner = _owner;
        user1 = _user1;

        let { _impl, _factory } = await loadFixture(deployFixutre)
        impl = _impl;
        factory = _factory;
    })

    describe("Deploy safe", () => {
        it("Should deploy a new safe", async () => {
            const tx = factory.connect(owner).depolySafe()
            await expect(tx).to.emit(factory, "SafeDeployed")
        })
    })

    describe("Update implementation", () => {
        it("normal user should not be able to update implementation", async () => {
            await expect(factory.connect(user1).updateImplementation(impl.address))
                .to.be.revertedWith("only owner can call this function")
        })
        it("Should update the implementation", async () => {
            await expect(factory.connect(owner).updateImplementation(impl.address))
                .to.emit(factory, "ImplementationUpdated")
                .withArgs(impl.address, await owner.getAddress())

            // Check the implementation is updated
            await expect(factory.connect(user1).getImpl())
                .to.eventually.be.eq(impl.address)
        })
    })

    describe("Deploy safe proxy", () => {
        it("Should deploy a new proxy", async () => {
            await expect(factory.connect(owner).deploySafeProxy())
                .to.emit(factory, "ProxyDeployed")
        })
        it("Should failed to deploy proxy", async () => {
            // Deploy new Implementation
            let tx = await factory.connect(owner).depolySafe()
            let receipt = await tx.wait()
            let events = receipt.events!;
            let contractAddr = `0x${events[1].topics[1].slice(26)}`;
            let implFactory = await loadFixture(implFactoryFixure)
            impl = implFactory.attach(contractAddr)

            // Update the implementation
            await factory.connect(owner).updateImplementation(impl.address)


            // Deploy the proxy
            await expect(factory.connect(user1).deploySafeProxy())
                .to.revertedWith("failed to initialize proxy")
        })
        it("Should check the ownership of the proxy and impl", async () => {
            // Deploy new safeupgradeable
            const implFactory = await implFactoryFixure()
            const newImpl = await implFactory.deploy();

            // Update the implementation
            const updateTmplPromise = factory.connect(owner).updateImplementation(newImpl.address)
            await expect(updateTmplPromise).to.emit(factory, "ImplementationUpdated")

            // Deploy new proxy by deploySafeProxy
            const deployProxyPromise = factory.connect(owner).deploySafeProxy()
            await expect(deployProxyPromise).to.emit(factory, "ProxyDeployed")

            // Get the proxy address
            const deployProxyEvents = await factory.queryFilter(factory.filters.ProxyDeployed())
            const proxyAddress = deployProxyEvents[0].args.proxy

            // Get the proxy contract and check ownership
            const deployedProxy = await ethers.getContractAt("SafeProxy", proxyAddress)
            await expect(deployedProxy.getOwner())
                .to.be.eventually.eq(await owner.getAddress())

            // Get the implementation contract and check ownership
            let deployedImpl = await ethers.getContractAt("SafeUpgradeable", await deployedProxy.getImpl())
            deployedImpl = deployedImpl.attach(proxyAddress)
            await expect(deployedImpl.getOwner())
                .to.be.eventually.eq(await owner.getAddress())
        })
    })
})