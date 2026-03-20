'use strict';
require('hardhat/config');
require('@nomicfoundation/hardhat-ethers');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'config', '.env') });
require('dotenv').config({ path: path.join(__dirname, '.env') });

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: '0.8.20',
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    localhost: {
      url: 'http://127.0.0.1:8545',
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC || process.env.RPC_SEPOLIA || 'https://rpc.sepolia.org',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    mainnet: {
      url: process.env.RPC_MAINNET || process.env.MAINNET_RPC || 'https://eth.llamarpc.com',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
};
