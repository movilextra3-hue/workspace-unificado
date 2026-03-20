require('dotenv').config();
module.exports = {
  solidity: {
    version: '0.8.25',
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: 'shanghai'
      /* Sin metadata.bytecodeHash para coincidir con Tronscan (igual que config/trc20-networks.js) */
    }
  },
  paths: { sources: './contracts' }
};
