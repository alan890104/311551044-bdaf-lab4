import { ethers } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);

    const Implementation = await ethers.getContractFactory("SafeUpgradeable");
    const implementation = await Implementation.deploy();
    await implementation.deployed();
    console.log("Implementation deployed to:", implementation.address);

    const Factory = await ethers.getContractFactory("SafeFactory");
    const factory = await Factory.deploy(deployer.address, implementation.address);
    console.log("Factory deployed to:", factory.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
