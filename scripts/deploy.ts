import { ethers } from "hardhat";

async function main() {
    const Implementation = await ethers.getContractFactory("SafeUpgradeable");
    const implementation = await Implementation.deploy();
    await implementation.deployed();
    console.log("Implementation deployed to:", implementation.address);

    const Factory = await ethers.getContractFactory("SafeFactory");
    const factory = await Factory.deploy("", implementation.address);
    console.log("Factory deployed to:", factory.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
