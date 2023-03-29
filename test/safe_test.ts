import { ethers } from "hardhat"
import { BigNumber, Signer } from "ethers";
import { expect } from "chai";
import { Safe, BaseToken } from "../typechain-types";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";


describe("Safe", () => {
    let owner: Signer;
    let user1: Signer;
    let user2: Signer;
    let token: BaseToken;
    let safe: Safe;
    const initialBalance = ethers.utils.parseEther("1000000");

    async function deploySafeFixutre() {
        const Safe = await ethers.getContractFactory("Safe");
        const safe = await Safe.deploy(owner.getAddress());
        return safe;
    }

    async function deployTokensFixture() {
        const BasicTokenFactories = await ethers.getContractFactory("BaseToken");
        const basicTokens = await BasicTokenFactories.deploy(initialBalance)
        await basicTokens.deployed()
        return basicTokens;
    }

    async function transferApprove(user: Signer, value: BigNumber) {
        await token.transfer(user.getAddress(), value)
        await token.connect(user).approve(safe.address, value);
    }

    beforeEach(async () => {
        const [_owner, _user1, _user2] = await ethers.getSigners();
        owner = _owner;
        user1 = _user1;
        user2 = _user2;
        token = await loadFixture(deployTokensFixture);
        safe = await loadFixture(deploySafeFixutre)
    });

    it("failed deposit on non zero amount of tokens", async () => {
        const depositAmount = ethers.utils.parseUnits("0", 18);
        await expect(safe.connect(user1).deposit(token.address, depositAmount))
            .to.be.revertedWith("Amount should be greater than 0");
    })

    it("failed deposit on transfer failed", async () => {
        // Issue and approve 100000 unit of token to user1
        const depositAmount = ethers.utils.parseUnits("100000", 18);
        await expect(safe.connect(user1).deposit(token.address, depositAmount))
            .revertedWith("ERC20: insufficient allowance");
    })

    it("should deposit tokens into the safe", async () => {
        // Issue and approve 100000 unit of token to user1
        const depositAmount = ethers.utils.parseUnits("100000", 18);
        await transferApprove(user1, depositAmount)

        // Check deposit event emitted
        await expect(safe.connect(user1).deposit(token.address, depositAmount))
            .to.emit(safe, "Deposited")
            .withArgs(token.address, await user1.getAddress(), depositAmount);

        // Check user1 balance of the safe
        await expect(safe.getBalance(token.address, user1.getAddress()))
            .to.eventually.be.eq(depositAmount);
    });

    it("failed withdraw on non zero amount of tokens", async () => {
        const withdrawAmount = ethers.utils.parseUnits("0", 18);
        await expect(safe.connect(user1).withdraw(token.address, withdrawAmount))
            .to.be.revertedWith("Amount should be greater than 0");
    })

    it("failed withdraw on insufficient balance", async () => {
        const withdrawAmount = ethers.utils.parseUnits("100000", 18);
        await expect(safe.connect(user1).withdraw(token.address, withdrawAmount))
            .to.be.revertedWith("Insufficient balance");
    })

    it("should withdraw tokens from the safe with correct fee", async () => {
        // Issue, approve, and save 100000 unit of token to user1
        const depositAmount = ethers.utils.parseUnits("100000", 18);
        await transferApprove(user1, depositAmount)
        await safe.connect(user1).deposit(token.address, depositAmount);

        // Check withdraw event emitted
        const withdrawAmount = ethers.utils.parseUnits("10000", 18);
        const fee = withdrawAmount.div(1000);
        await expect(safe.connect(user1).withdraw(token.address, withdrawAmount))
            .to.emit(safe, "Withdrawed")
            .withArgs(token.address, await user1.getAddress(), withdrawAmount.sub(fee), fee);

        // Check user1 balance of the safe
        const remain = depositAmount.sub(withdrawAmount);
        await expect(safe.getBalance(token.address, user1.getAddress()))
            .to.eventually.be.eq(remain);
    });

    it("should prevent non-owners from taking the fee", async () => {
        await expect(safe.connect(user1).takeFee(token.address))
            .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should prevent taking the fee if there is no fee", async () => {
        await expect(safe.connect(owner).takeFee(owner.getAddress()))
            .to.be.revertedWith("No fees to take");
    });

    it("should allow the owner to take the fee", async () => {
        // Issue, approve, and save 100000 unit of token to user1
        const depositAmount = ethers.utils.parseUnits("100000", 18);
        const withdrawAmount = ethers.utils.parseUnits("100000", 18);
        const fee = withdrawAmount.div(1000);
        await transferApprove(user1, depositAmount)
        await safe.connect(user1).deposit(token.address, depositAmount);
        await safe.connect(user1).withdraw(token.address, withdrawAmount)


        // Owner take fee
        await expect(safe.connect(owner).takeFee(token.address))
            .to.emit(safe, "FeeTaken")
            .withArgs(token.address, await owner.getAddress(), fee);

        // Check fee balance
        await expect(safe.connect(owner).getFee(token.address))
            .to.eventually.be.eq(0);
    });
});
