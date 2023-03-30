import { ethers } from "hardhat"
import { Signer } from "ethers";
import { expect } from "chai";
import { SafeFactory, SafeProxy, SafeUpgradeable } from "../typechain-types";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("SafeProxy", () => {
    let owner: Signer;
    let user1: Signer;
    let impl: SafeUpgradeable;
    let proxy: SafeProxy;

    async function deployFixutre() {
        // Deploy the implementation contract
        const implFactory = await ethers.getContractFactory("SafeUpgradeable");
        const _impl = await implFactory.deploy();
        await _impl.deployed()

        // Deploy the proxy contract with implementation and owner
        const SafeProxyFactory = await ethers.getContractFactory("SafeProxy");
        const _proxy = await SafeProxyFactory.deploy(owner.getAddress(), _impl.address);
        await _proxy.deployed()
        return { _impl, _proxy };
    }

    beforeEach(async () => {
        const [_owner, _user1] = await ethers.getSigners();
        owner = _owner;
        user1 = _user1;

        let { _impl, _proxy } = await loadFixture(deployFixutre)
        impl = _impl;
        proxy = _proxy;
    })


    it("Should have owner", async () => {
        expect(await proxy.getOwner()).to.equal(await owner.getAddress())
    })

    it("Should have implementation", async () => {
        expect(await proxy.getImpl()).to.equal(impl.address)
    })

    it("Non-owner cannot update implementation", async () => {
        await expect(proxy.connect(user1).updateImplementation(impl.address))
            .to.be.revertedWith("only owner can call this function")
    })

    it("Owner can update implementation", async () => {
        const newImplFactory = await ethers.getContractFactory("SafeUpgradeable")
        const newImpl = await newImplFactory.deploy()
        await newImpl.deployed()

        await expect(proxy.connect(owner).updateImplementation(newImpl.address))
            .to.emit(proxy, "ImplChanged")
            .withArgs(newImpl.address)

        await expect(proxy.getImpl())
            .to.eventually.equal(newImpl.address)
    })

    it("Should receive", async () => {
        await owner.sendTransaction({
            to: ethers.utils.getAddress(proxy.address),
            value: ethers.utils.parseEther("1.0"),
            gasLimit: 500000,
        })
        expect(await ethers.provider.getBalance(proxy.address))
            .to.equal(ethers.utils.parseEther("1.0"))
    })


})