require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");

//const { mnemonic } = require("./secrets.json");

const PRIVATE_KEY_1 = process.env.PRIVATE_TMDTEST_KEY
const BASE_API = process.env.BASE_API_KEY
  ? process.env.BASE_API_KEY : "ce0d7f26-7250-4867-a5aa-b5a253a569ec";
const BASESEPOLIA_API = process.env.BASESCAN_API_KEY
  ? process.env.BASESCAN_API_KEY : "ce0d7f26-7250-4867-a5aa-b5a253a569ec";

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  defaultNetwork: "mainnet",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    hardhat: {},
    testnet: {
      url: "https://data-seed-prebsc-1-s1.bnbchain.org:8545",
      chainId: 97,
      gasPrice: 20000000000,
      accounts: [PRIVATE_KEY_1],
    },
    mainnet: {
      url: "https://bsc-dataseed.bnbchain.org/",
      chainId: 56,
      gasPrice: 20000000000,
      accounts: [PRIVATE_KEY_1],
    },
    base_sepolia: {
      url: "https://sepolia.base.org",
      gasPrice: 20000000000,
      accounts: [PRIVATE_KEY_1]
    }
  },
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
      },
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 20000,
  },
  etherscan: {
    apiKey: {
      base: BASE_API,
      base_sepolia: BASESEPOLIA_API,
    },
    customChains: [
      {
        network: "base",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org"
        },
      },
      {
      network: "base_sepolia",
      chainId: 84532,
      urls: {
        apiURL: "https://base-sepolia.blockscout.com/api",
        browserURL: "https://base-sepolia.blockscout.com"
      }
    }]
  }
};
