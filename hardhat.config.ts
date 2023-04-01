import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const privateKey = process.env.PRIVATE_KEY;
const endpoint = process.env.ENDPOINT;
const etherscanKey = process.env.ETHERSCAN_KEY;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.18",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    }
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    goerli: {
      url: endpoint,
      accounts: [`0x${privateKey}`],
    },
  },
  etherscan: {
    apiKey: etherscanKey,
  },
};

export default config;
