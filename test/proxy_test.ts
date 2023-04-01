import { ethers } from "hardhat"
import { Signer } from "ethers";
import { expect } from "chai";
import { BaseToken, SafeProxy, SafeUpgradeable } from "../typechain-types";
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

    context("Should deposit by delegatecall", async () => {
        let suite_proxy: SafeProxy;
        let suite_impl: SafeUpgradeable;
        let suite_owner: Signer;
        let initialBalance = ethers.utils.parseEther("10000.0");

        async function deployTokensFixture() {
            const BasicTokenFactories = await ethers.getContractFactory("BaseToken");
            const basicTokens = await BasicTokenFactories.deploy(initialBalance)
            await basicTokens.deployed()
            return basicTokens;
        }

        before(async () => {
            const [_owner, _user1] = await ethers.getSigners();
            suite_owner = _owner;
        })

        async function suiteFixture() {
            // Deploy the implementation contract
            const implFactory = await ethers.getContractFactory("SafeUpgradeable");
            const _impl = await implFactory.deploy();
            await _impl.deployed()

            // Deploy the proxy contract with implementation and owner
            const SafeProxyFactory = await ethers.getContractFactory("SafeProxy");
            let _proxy = await SafeProxyFactory.deploy(suite_owner.getAddress(), _impl.address);
            await _proxy.deployed()

            return { _impl, _proxy };
        }

        it("Shoule deposit into impl by delegate call", async () => {
            const { _impl, _proxy } = await loadFixture(suiteFixture)
            suite_proxy = _proxy;
            suite_impl = _impl;

            // Should initialize the impl once
            await expect(suite_owner.sendTransaction({
                to: ethers.utils.getAddress(suite_proxy.address),
                gasLimit: 500000,
                data: suite_impl.interface.encodeFunctionData("initialize", [await suite_owner.getAddress()]),
            })).not.to.be.reverted;

            // Should check impl owner is suite_owner
            expect(await suite_impl.attach(suite_proxy.address).getOwner())
                .to.be.eq(await suite_owner.getAddress())

            // Deploy token and transfer to suite_owner
            const token = await loadFixture(deployTokensFixture)
            const amount = ethers.utils.parseEther("1.0")
            await token.transfer(suite_owner.getAddress(), amount)
            await token.connect(suite_owner).approve(suite_proxy.address, amount)

            // Deposit into impl by delegate call
            const attachedImpl = suite_impl.attach(suite_proxy.address)
            await expect(attachedImpl.connect(suite_owner).deposit(token.address, amount))
                .not.to.be.reverted;

            // Should check impl owner balance
            expect(await attachedImpl.getBalance(token.address, suite_owner.getAddress()))
                .to.be.eq(amount)
        })
    })
})