'use strict';
/**
 * Configuración TronBox para TRC-20
 * En Windows CMD puede haber conflicto; usar PowerShell o Git Bash.
 */
require('dotenv').config();

module.exports = {
  networks: {
    development: {
      privateKey: process.env.PRIVATE_KEY,
      userFeePercentage: 0,
      feeLimit: 1000 * 1e6,
      fullHost: 'http://127.0.0.1:9090',
      network_id: '*'
    },
    shasta: {
      privateKey: process.env.PRIVATE_KEY,
      userFeePercentage: 50,
      feeLimit: 1000 * 1e6,
      fullHost: 'https://api.shasta.trongrid.io',
      network_id: '2'
    },
    nile: {
      privateKey: process.env.PRIVATE_KEY,
      userFeePercentage: 100,
      feeLimit: 1000 * 1e6,
      fullHost: 'https://nile.trongrid.io',
      network_id: '3'
    },
    mainnet: {
      privateKey: process.env.PRIVATE_KEY,
      userFeePercentage: 100,
      feeLimit: 1e8,
      fullHost: 'https://api.trongrid.io',
      network_id: '1'
    }
  },
  compilers: {
    solc: {
      version: '0.8.34',
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    }
  },
  contracts_directory: './contracts',
  contracts_build_directory: './build/contracts',
  migrations_directory: './migrations'
};
