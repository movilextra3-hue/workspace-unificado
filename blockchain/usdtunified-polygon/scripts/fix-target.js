#!/usr/bin/env node
/**
 * fix-target.js — Corrige el target del contrato USDTUnified a USDT oficial de Polygon.
 * Uso: node scripts/fix-target.js
 * Requiere: PRIVATE_KEY y POLYGON_RPC en .env
 */
'use strict';

require('dotenv').config();
const { ethers } = require('ethers');
const { CONTRACT_ADDRESS, USDT_POLYGON, ABI } = require('../config.js');

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

  console.log('=== Fix Target USDTUnified ===\n');
  console.log('Contrato:', CONTRACT_ADDRESS);
  console.log('Nuevo target (USDT Polygon):', USDT_POLYGON);
  console.log('Wallet:', wallet.address);
  console.log('');

  const currentTarget = await contract.getFunction('target').staticCall();
  if (currentTarget.toLowerCase() === USDT_POLYGON.toLowerCase()) {
    console.log('OK: El target ya está correcto.');
    return;
  }

  console.log('Target actual:', currentTarget);
  console.log('Enviando setTarget...');

  const tx = await contract.setTarget(USDT_POLYGON);
  console.log('TX enviada:', tx.hash);
  await tx.wait();
  console.log('Confirmado.');

  const newTarget = await contract.getFunction('target').staticCall();
  if (newTarget.toLowerCase() !== USDT_POLYGON.toLowerCase()) {
    console.error('ERROR: Verificación fallida. Target esperado:', USDT_POLYGON, '| Obtenido:', newTarget);
    process.exit(1);
  }
  console.log('Target nuevo:', newTarget);
  console.log('OK: Paso 1 finalizado correctamente.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
