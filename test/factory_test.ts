import { ethers } from "hardhat"
import { BigNumber, Signer } from "ethers";
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

    beforeEach(async () => {
        const [_owner, _user1] = await ethers.getSigners();
        owner = _owner;
        user1 = _user1;
        let { _impl, _factory } = await loadFixture(deployFixutre)
        impl = _impl;
        factory = _factory;
    })

    describe("Deploy safe proxy", async () => {
        const proxyFactory = await ethers.getContractFactory("SafeProxy");

        it("Should deploy a new proxy", async () => {
            expect(factory.connect(owner).deploySafeProxy())
                .to.emit(factory, "ProxyDeployed")
        })
        it("Should check the ownership of the proxy and impl", async () => {
            const tx = await factory.connect(user1).deploySafeProxy()
            const receipt = await tx.wait()
            proxy = proxyFactory.attach(receipt.contractAddress)
            // Check proxy owner is set
            await expect(proxy.getOwner())
                .to.eventually.be.equal(await user1.getAddress())
            // Check implementation owner is set
            await expect(impl.getOwner())
                .to.eventually.be.equal(await user1.getAddress())
        })
    })
})