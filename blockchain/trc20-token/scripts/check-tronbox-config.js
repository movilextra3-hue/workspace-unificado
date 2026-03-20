#!/usr/bin/env node
'use strict';
/**
 * Comprueba que la config que usa TronBox (tronbox.js) tenga claves correctas
 * y compilador/EVM compatibles con Tronscan (0.8.25, Shanghai).
 * NO gasta TRX. NO muestra valores. Solo dice si privateKey, fullHost y build config están bien.
 * Ejecutar desde raíz: node scripts/check-tronbox-config.js
 */
const path = require('node:path');
const { assertTronscanCompatibleOrExit } = require('./lib/tronscan-build-requirements');

const root = path.join(__dirname, '..');
const configPath = path.join(root, 'config', 'trc20-networks.js');

let config;
try {
  config = require(configPath);
} catch (e) {
  console.error('');
  console.error('ERROR: No se pudo cargar tronbox.js:', e.message);
  process.exit(1);
}

// Primero: compilador y EVM deben ser los que Tronscan acepta (evita gastar TRX en bytecode no verificable)
assertTronscanCompatibleOrExit();

const mainnet = config?.networks?.mainnet;
if (!mainnet) {
  console.error('');
  console.error('ERROR: tronbox.js no exporta networks.mainnet');
  process.exit(1);
}

const pk = mainnet.privateKey;
const fullHost = mainnet.fullHost || '';
const pkOk = typeof pk === 'string' && pk.length === 64 && /^[a-fA-F0-9]{64}$/.test(pk);
const urlOk = fullHost.includes('api_key=');

console.log('');
console.log('=== Comprobación de lo que TronBox ve (tronbox.js) ===');
console.log('');
let pkStatus;
if (pkOk) pkStatus = 'OK (64 hex)';
else if (pk === undefined) pkStatus = 'FALTA (undefined)';
else pkStatus = 'INVÁLIDO (longitud o formato)';
console.log('  privateKey (mainnet):', pkStatus);
console.log('  fullHost con API key: ', urlOk ? 'OK' : 'FALTA (sin api_key en la URL)');
console.log('  feeLimit:            ', mainnet.feeLimit === 450000000 ? 'OK (450 TRX)' : 'Revisar (esperado 450000000)');
console.log('');

if (!pkOk || !urlOk) {
  console.log('  Las migraciones (tronbox migrate) usarán esta config.');
  console.log('  Si privateKey o fullHost fallan, el deploy fallará o no enviará tx.');
  console.log('  Revisa .env: PRIVATE_KEY (64 hex) y TRON_PRO_API_KEY (sin espacios).');
  console.log('  Luego ejecuta: npm run check:env');
  console.log('');
  process.exit(1);
}

console.log('  Configuración correcta para que TronBox use las claves.');
console.log('');
process.exit(0);
