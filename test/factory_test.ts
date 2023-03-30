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
                .withArgs(impl.address, await owner.getAddress)

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
        it("Should check the ownership of the proxy and impl", async () => {
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
            tx = await factory.connect(user1).deploySafeProxy()
            receipt = await tx.wait()
            events = receipt.events!;
            contractAddr = `0x${events[2].topics[1].slice(26)}`;
            let proxyFactory = await loadFixture(proxyFactoryFixture)
            proxy = proxyFactory.attach(contractAddr)


            // Check implementation owner is set
            let result = await owner.sendTransaction({
                to: proxy.address,
                data: impl.interface.encodeFunctionData("getOwner"),
            })
            await expect(impl.getOwner())
                .to.eventually.be.equal(await user1.getAddress())
        })
    })

    describe("Deploy SafeUpgradeable", () => {
        it("Should deploy a new safe upgradeable impl", async () => {
            const tx = factory.connect(owner).deploySafeUpgradeable()
            await expect(tx).to.emit(factory, "ImplementationDeployed")
        })
    })
})