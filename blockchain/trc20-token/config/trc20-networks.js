'use strict';
/**
 * Configuración TronBox para TRC-20.
 * Fuente única: tronbox.js re-exporta este módulo (TronBox lo requiere por nombre).
 * Scripts y migraciones cargan este archivo directamente para evitar que Cursor abra tronbox.js.
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
      version: '0.8.25',
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        },
        evmVersion: 'shanghai',
        metadata: { bytecodeHash: 'none' }
        /* bytecodeHash:none obligatorio para que el bytecode coincida con mainnet y la verificación funcione (OKLink Standard JSON) */
      }
    }
  },
  contracts_directory: './contracts',
  contracts_build_directory: './build/contracts',
  migrations_directory: './migrations'
};
