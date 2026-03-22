#!/usr/bin/env node
/**
 * setup-paso-a-paso.js — Ejecuta correcciones una a una, verificando cada paso
 * antes de continuar. Si un paso falla la verificación, se detiene.
 *
 * Uso: node scripts/setup-paso-a-paso.js [--dry-run]
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
  POLYGON_RPC_DEFAULT,
} = require('../config.js');

const DRY_RUN = process.argv.includes('--dry-run');
const ZERO = '0x0000000000000000000000000000000000000000';

function fail(msg) {
  console.error('\nERROR:', msg);
  process.exit(1);
}

async function main() {
  const pk = process.env.PRIVATE_KEY;
  const rpc = process.env.POLYGON_RPC || POLYGON_RPC_DEFAULT;

  if (!pk) {
    fail('PRIVATE_KEY no definida en .env');
  }

  const provider = new ethers.JsonRpcProvider(rpc);
  const wallet = new ethers.Wallet(pk, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

  const owner = await contract.owner();
  if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
    fail('La wallet ' + wallet.address + ' no es owner. Owner: ' + owner);
  }

  console.log('=== USDTUnified Setup Paso a Paso ===\n');
  console.log('Wallet:', wallet.address);
  console.log('Modo:', DRY_RUN ? 'DRY-RUN' : 'EJECUCIÓN REAL');
  console.log('');

  // ==================== PASO 1: Target ====================
  console.log('--- PASO 1: Target (USDT Polygon) ---\n');

  let currentTarget = await contract.getFunction('target').staticCall();
  if (currentTarget.toLowerCase() !== USDT_POLYGON.toLowerCase()) {
    if (DRY_RUN) {
      console.log('[DRY-RUN] Enviaría setTarget(' + USDT_POLYGON + ')');
    } else {
      console.log('Target actual:', currentTarget);
      const tx = await contract.setTarget(USDT_POLYGON);
      console.log('TX:', tx.hash);
      await tx.wait();
    }
  }

  currentTarget = await contract.getFunction('target').staticCall();
  if (currentTarget.toLowerCase() !== USDT_POLYGON.toLowerCase()) {
    if (DRY_RUN) {
      console.log('[DRY-RUN] Verificación omitida (no se envió TX). Estado actual: target=' + currentTarget + '\n');
    } else {
      fail('PASO 1 falló: target=' + currentTarget + ' (esperado ' + USDT_POLYGON + ')');
    }
  } else {
    console.log('PASO 1 OK: target=' + currentTarget + '\n');
  }

  // ==================== PASO 2: Pancake Params ====================
  console.log('--- PASO 2: Pancake Params (Factory, WMATIC, USDC) ---\n');

  let factory = await contract.factory();
  let wbnb = await contract.WBNB();
  const needsParams =
    factory === ZERO ||
    factory.toLowerCase() !== QUICKSWAP_FACTORY.toLowerCase() ||
    wbnb.toLowerCase() !== WMATIC.toLowerCase();

  if (needsParams) {
    if (DRY_RUN) {
      console.log('[DRY-RUN] Enviaría setPancakeParams(factory, wmatic, usdc)');
    } else {
      const tx = await contract.setPancakeParams(QUICKSWAP_FACTORY, WMATIC, USDC);
      console.log('TX:', tx.hash);
      await tx.wait();
    }
  }

  factory = await contract.factory();
  wbnb = await contract.WBNB();
  const paso2Ok =
    factory !== ZERO &&
    factory.toLowerCase() === QUICKSWAP_FACTORY.toLowerCase() &&
    wbnb.toLowerCase() === WMATIC.toLowerCase();
  if (!paso2Ok) {
    if (DRY_RUN) {
      console.log('[DRY-RUN] Verificación omitida. Estado actual: factory=' + factory + ', WBNB=' + wbnb + '\n');
    } else {
      fail(
        'PASO 2 falló: factory=' + factory + ', WBNB=' + wbnb + ' (esperado ' +
        QUICKSWAP_FACTORY + ', ' + WMATIC + ')'
      );
    }
  } else {
    console.log('PASO 2 OK: factory=' + factory + ', WMATIC=' + wbnb + '\n');
  }

  // ==================== PASO 3: Metadata ====================
  console.log('--- PASO 3: Refresh Metadata Cache ---\n');

  if (DRY_RUN) {
    console.log('[DRY-RUN] Enviaría refreshMetadataCache()');
  } else {
    const tx = await contract.refreshMetadataCache();
    console.log('TX:', tx.hash);
    await tx.wait();
  }

  const name = await contract.name();
  const symbol = await contract.symbol();
  const decimals = await contract.decimals();
  const paso3Ok = name && symbol && Number(decimals) === 6;
  if (!paso3Ok) {
    if (DRY_RUN) {
      console.log('[DRY-RUN] Verificación omitida. Estado actual: name=' + name + ', symbol=' + symbol + ', decimals=' + decimals + '\n');
    } else {
      fail('PASO 3 falló: name=' + name + ', symbol=' + symbol + ', decimals=' + decimals);
    }
  } else {
    console.log('PASO 3 OK: name=' + name + ', symbol=' + symbol + ', decimals=' + decimals + '\n');
  }

  // ==================== FINAL ====================
  console.log('=== TODOS LOS PASOS COMPLETADOS CORRECTAMENTE ===\n');
  console.log('Siguiente: npm run approve:router y añadir liquidez en QuickSwap.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
