import { ethers } from "hardhat"
import { Signer } from "ethers";
import { expect } from "chai";
import { SafeFactory, SafeProxy, SafeUpgradeable } from "../typechain-types";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("BaseToken", () => {
    async function deployFixutre() {
        // get signers
        const [owner, user1, user2] = await ethers.getSigners();

        // Deploy base token contract
        const initialBalance = ethers.utils.parseEther("10000")
        const baseTokenFactory = await ethers.getContractFactory("BaseToken");
        const baseToken = await baseTokenFactory.deploy(initialBalance);
        await baseToken.deployed()
        return { owner, user1, user2, baseToken };
    }

    describe("Should deploy a new base token", async () => {
        it("Should get basic info", async () => {
            const { owner, baseToken } = await loadFixture(deployFixutre)
            expect(await baseToken.name()).to.equal("Base")
            expect(await baseToken.symbol()).to.equal("ADRY")
            expect(await baseToken.decimals()).to.equal(18)
            expect(await baseToken.totalSupply()).to.equal(ethers.utils.parseEther("10000"))
            expect(await baseToken.balanceOf(owner.address)).to.equal(ethers.utils.parseEther("10000"))
        })
        it("Sould transfer tokens", async () => {
            const { owner, user1, baseToken } = await loadFixture(deployFixutre)
            const amount = ethers.utils.parseEther("100")
            await baseToken.transfer(user1.address, amount)
            expect(await baseToken.balanceOf(owner.address)).to.equal(ethers.utils.parseEther("9900"))
            expect(await baseToken.balanceOf(user1.address)).to.equal(ethers.utils.parseEther("100"))
        })
        it("Should approve and transferFrom", async () => {
            const { owner, user1, user2, baseToken } = await loadFixture(deployFixutre)
            const amount = ethers.utils.parseEther("100")
            await baseToken.connect(owner).approve(user1.address, amount)
            expect(await baseToken.allowance(owner.address, user1.address)).to.equal(amount)
            await baseToken.connect(user1).transferFrom(owner.address, user2.address, amount)
            expect(await baseToken.balanceOf(owner.address)).to.equal(ethers.utils.parseEther("9900"))
            expect(await baseToken.balanceOf(user2.address)).to.equal(ethers.utils.parseEther("100"))
        })
        it("Should ming", async () => {
            const { owner, baseToken } = await loadFixture(deployFixutre)
            const amount = ethers.utils.parseEther("100")
            await baseToken.connect(owner).mint(amount)
            expect(await baseToken.totalSupply()).to.equal(ethers.utils.parseEther("10100"))
            expect(await baseToken.balanceOf(owner.address)).to.equal(ethers.utils.parseEther("10100"))
        })
    })
    describe("Blacklist test", async () => {
        it("Should owner can add  address into blacklist", async () => {
            const { owner, user1, baseToken } = await loadFixture(deployFixutre)
            await expect(baseToken.connect(owner).addBlacklist(user1.address))
                .to.not.reverted;
        })
        it("Should revert when user1 add address into blacklist", async () => {
            const { user1, baseToken } = await loadFixture(deployFixutre)
            await expect(baseToken.connect(user1).addBlacklist(user1.address))
                .to.be.revertedWith("Ownable: caller is not the owner")
        })
    })
})