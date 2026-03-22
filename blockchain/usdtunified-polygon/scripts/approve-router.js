#!/usr/bin/env node
/**
 * approve-router.js — Aprueba USDTUnified al Router de QuickSwap para añadir liquidez.
 * Uso: node scripts/approve-router.js [amount]
 * amount opcional: default es max uint256
 */
'use strict';

require('dotenv').config();
const { ethers } = require('ethers');
const { CONTRACT_ADDRESS, QUICKSWAP_ROUTER, ABI } = require('../config.js');

const MAX_UINT256 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

async function main() {
  const pk = process.env.PRIVATE_KEY;
  const { POLYGON_RPC_DEFAULT } = require('../config.js');
  const rpc = process.env.POLYGON_RPC || POLYGON_RPC_DEFAULT;
  const amount = process.argv[2] || MAX_UINT256;

  if (!pk) {
    console.error('ERROR: PRIVATE_KEY no definida en .env');
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(rpc);
  const wallet = new ethers.Wallet(pk, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

  console.log('=== Approve Router ===\n');
  console.log('Token:', CONTRACT_ADDRESS);
  console.log('Spender (Router):', QUICKSWAP_ROUTER);
  console.log('Amount:', amount === MAX_UINT256 ? 'MAX' : amount);
  console.log('Wallet:', wallet.address);
  console.log('');

  const tx = await contract.approve(QUICKSWAP_ROUTER, amount);
  console.log('TX enviada:', tx.hash);
  await tx.wait();
  console.log('Confirmado.');
  console.log('OK: Router aprobado. Ahora puedes añadir liquidez en QuickSwap.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
