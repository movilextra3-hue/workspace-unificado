#!/usr/bin/env node
/**
 * check-flow.js — Pre-chequeo del flujo SIN PRIVATE_KEY.
 * Valida: config, RPC, contrato, estado on-chain.
 * Uso: node scripts/check-flow.js
 */
'use strict';

require('dotenv').config();
const { ethers } = require('ethers');
const {
  CONTRACT_ADDRESS,
  USDT_POLYGON,
  QUICKSWAP_FACTORY,
  WMATIC,
  ABI,
  POLYGON_RPC_DEFAULT,
} = require('../config.js');

const ZERO = '0x0000000000000000000000000000000000000000';

function ok(msg) {
  console.log('  OK:', msg);
}
function warn(msg) {
  console.log('  AVISO:', msg);
}
function fail(msg) {
  console.error('  ERROR:', msg);
  return false;
}

async function main() {
  console.log('=== Check Flow USDTUnified ===\n');

  let hasError = false;

  // 1. Config
  console.log('1. Configuración:');
  if (!CONTRACT_ADDRESS || !USDT_POLYGON || !QUICKSWAP_FACTORY || !WMATIC) {
    hasError = fail('Faltan direcciones en config.js');
  } else {
    ok('Direcciones cargadas');
  }

  if (!ABI || !Array.isArray(ABI) || ABI.length === 0) {
    hasError = fail('ABI vacío o inválido');
  } else {
    ok('ABI cargado (' + ABI.length + ' funciones)');
  }

  // 2. RPC
  console.log('\n2. RPC Polygon:');
  const rpc = process.env.POLYGON_RPC || POLYGON_RPC_DEFAULT;
  if (!rpc) {
    hasError = fail('No hay RPC configurado');
  } else {
    ok('RPC: ' + rpc);
  }

  // 3. Conexión y contrato
  console.log('\n3. Conexión on-chain:');
  try {
    const provider = new ethers.JsonRpcProvider(rpc);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

    const target = await contract.getFunction('target').staticCall();
    const factory = await contract.factory();
    const wbnb = await contract.WBNB();
    const name = await contract.name();
    const symbol = await contract.symbol();
    const decimals = await contract.decimals();

    const targetOk = target && target.toLowerCase() === USDT_POLYGON.toLowerCase();
    const factoryOk = factory && factory !== ZERO && factory.toLowerCase() === QUICKSWAP_FACTORY.toLowerCase();
    const wmaticOk = wbnb && wbnb !== ZERO && wbnb.toLowerCase() === WMATIC.toLowerCase();

    if (targetOk) ok('target = USDT Polygon'); else warn('target pendiente: ' + target);
    if (factoryOk) ok('factory configurado'); else warn('factory pendiente');
    if (wmaticOk) ok('WMATIC configurado'); else warn('WMATIC pendiente');
    ok('name=' + name + ', symbol=' + symbol + ', decimals=' + (decimals !== undefined ? Number(decimals) : '?'));
  } catch (e) {
    hasError = true;
    fail('Conexión/RPC: ' + (e.message || e));
  }

  // 4. PRIVATE_KEY (opcional para check)
  console.log('\n4. Ejecución:');
  if (process.env.PRIVATE_KEY) {
    ok('PRIVATE_KEY definida en .env');
    console.log('\nComandos disponibles:');
    console.log('  npm run fix:target    - Corregir target');
    console.log('  npm run fix:dex       - Configurar DEX');
    console.log('  npm run fix:metadata  - Refrescar metadatos');
    console.log('  npm run setup:paso    - Ejecutar todo paso a paso');
  } else {
    warn('PRIVATE_KEY no definida. Copia env.example a .env para ejecutar correcciones.');
  }

  console.log('\n  npm run verify        - Verificar estado (solo lectura)');
  console.log('');

  if (hasError) {
    process.exit(1);
  }
  console.log('=== Check flow completado ===');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
