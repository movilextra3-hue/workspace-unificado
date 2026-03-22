require('dotenv').config();
module.exports = {
  solidity: {
    version: '0.8.25',
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: 'shanghai',
      /* Misma semántica que config/trc20-networks.js (despliegue / compile-with-solc.js) */
      metadata: { bytecodeHash: 'none' }
    }
  },
  paths: { sources: './contracts' }
};
