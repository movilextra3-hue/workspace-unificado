#!/usr/bin/env node
/**
 * full-setup.js — Ejecuta en orden: fix-target → setPancakeParams → refreshMetadataCache
 * Uso: node scripts/full-setup.js [--dry-run]
 */
'use strict';

require('dotenv').config();
const { ethers } = require('ethers');
const {
  CONTRACT_ADDRESS,
  USDT_POLYGON,
  QUICKSWAP_FACTORY,
  WMATIC,
  USDC,
  ABI,
} = require('../config.js');

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  const pk = process.env.PRIVATE_KEY;
  const { POLYGON_RPC_DEFAULT } = require('../config.js');
  const rpc = process.env.POLYGON_RPC || POLYGON_RPC_DEFAULT;

  if (!pk) {
    console.error('ERROR: PRIVATE_KEY no definida en .env');
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(rpc);
  const wallet = new ethers.Wallet(pk, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

  const owner = await contract.owner();
  if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
    console.error('ERROR: La wallet', wallet.address, 'no es owner. Owner:', owner);
    process.exit(1);
  }

  console.log('=== USDTUnified Full Setup ===\n');
  console.log('Wallet:', wallet.address);
  console.log('Modo:', DRY_RUN ? 'DRY-RUN (no envía TX)' : 'EJECUCIÓN REAL');
  console.log('');

  // 1. setTarget
  const currentTarget = await contract.getFunction('target').staticCall();
  if (currentTarget.toLowerCase() !== USDT_POLYGON.toLowerCase()) {
    if (DRY_RUN) {
      console.log('[DRY-RUN] setTarget(', USDT_POLYGON, ')');
    } else {
      const tx1 = await contract.setTarget(USDT_POLYGON);
      console.log('setTarget tx:', tx1.hash);
      await tx1.wait();
      console.log('setTarget OK\n');
    }
  } else {
    console.log('Target ya correcto\n');
  }

  // 2. setPancakeParams
  const currentFactory = await contract.factory();
  const zero = '0x0000000000000000000000000000000000000000';
  const needsParams =
    currentFactory === zero || currentFactory.toLowerCase() !== QUICKSWAP_FACTORY.toLowerCase();

  if (needsParams) {
    if (DRY_RUN) {
      console.log('[DRY-RUN] setPancakeParams(factory, wmatic, usdc)');
    } else {
      const tx2 = await contract.setPancakeParams(QUICKSWAP_FACTORY, WMATIC, USDC);
      console.log('setPancakeParams tx:', tx2.hash);
      await tx2.wait();
      console.log('setPancakeParams OK\n');
    }
  } else {
    console.log('PancakeParams ya configurados\n');
  }

  // 3. refreshMetadataCache
  if (DRY_RUN) {
    console.log('[DRY-RUN] refreshMetadataCache()');
  } else {
    const tx3 = await contract.refreshMetadataCache();
    console.log('refreshMetadataCache tx:', tx3.hash);
    await tx3.wait();
    console.log('refreshMetadataCache OK\n');
  }

  console.log('=== Setup completo ===');
  if (!DRY_RUN) {
    console.log('Ejecutar: npm run verify para comprobar estado');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
