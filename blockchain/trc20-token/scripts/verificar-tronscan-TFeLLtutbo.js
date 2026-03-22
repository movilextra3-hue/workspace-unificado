#!/usr/bin/env node
'use strict';
/**
 * Verificación asistida en Tronscan (Implementation desde deploy-info / abi).
 * 1. Comprueba que el bytecode local coincida con mainnet (check-alignment).
 * 2. Muestra pasos exactos para verificación manual en Tronscan.
 *
 * Uso: node scripts/verificar-tronscan-TFeLLtutbo.js
 *      npm run verify:tronscan
 *      npm run verify:tronscan:prepare   (regenera paquete + este script)
 */
const path = require('node:path');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const { loadImplementationAddress } = require('./lib/implementation-address.js');

const ROOT = path.join(__dirname, '..');
const PKG_DIR = path.join(ROOT, 'verification', 'PAQUETE-VERIFICACION-POST-UPGRADE');
const VERIFY_URL = 'https://tronscan.org/#/contracts/verify';

function main() {
  const IMPL_ADDR = loadImplementationAddress();
  console.log('\n=== VERIFICACIÓN TRONSCAN — Implementation ' + IMPL_ADDR + ' ===\n');

  console.log(
    'NOTA: El despliegue usa metadata.bytecodeHash:none (config/trc20-networks.js). ' +
      'Tronscan no suele permitir elegir eso en el formulario; si falla la verificación ' +
      'con "confirm the correct parameters", usar OKLink + Standard JSON: npm run verify:oklink:prepare\n'
  );

  // 1. Verificar que el paquete existe
  const sourcePath = path.join(PKG_DIR, 'TRC20TokenUpgradeable.sol');
  if (!fs.existsSync(sourcePath)) {
    console.error('❌ Falta paquete de verificación. Ejecutar: npm run guardar:verificacion');
    process.exit(1);
  }

  // 2. Ejecutar check-alignment para confirmar bytecode match
  console.log('Comprobando coincidencia bytecode local vs mainnet...');
  const r = spawnSync('node', ['scripts/check-alignment-mainnet.js'], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: 'pipe'
  });
  const out = (r.stdout || '') + (r.stderr || '');
  if (r.status !== 0) {
    console.error('❌ check:alignment falló. El bytecode local no coincide con mainnet.');
    console.error(out);
    process.exit(1);
  }
  if (!out.includes('Bytecode idéntico') && !out.includes('compila a bytecode idéntico')) {
    console.error('❌ El bytecode local NO coincide con mainnet. No se puede verificar.');
    console.error(out);
    process.exit(1);
  }
  console.log('✅ Bytecode local = mainnet. Verificación factible.\n');

  // 3. Instrucciones
  console.log('--- PASOS PARA VERIFICAR EN TRONSCAN ---\n');
  console.log('1. Abrir:', VERIFY_URL);
  console.log('');
  console.log('2. Rellenar el formulario EXACTAMENTE con:');
  console.log('   Contract Address:  ', IMPL_ADDR);
  console.log('   Main Contract:     TRC20TokenUpgradeable');
  console.log('   Compiler Version:   v0.8.25 (o 0.8.25)');
  console.log('   License:           MIT');
  console.log('   Optimization:      Yes');
  console.log('   Runs:              200');
  console.log('   VM version:        Shanghai');
  console.log('   ViaIR:             No');
  console.log('');
  console.log('3. Subir archivo:');
  console.log('   ', path.join(PKG_DIR, 'TRC20TokenUpgradeable.sol'));
  console.log('');
  console.log('4. Completar CAPTCHA y clicar "Verify and Publish".');
  console.log('');
  console.log('Automatizar relleno en navegador (Playwright): npm run verify:tronscan:playwright');
  console.log('');
  console.log('--- Si falla "confirm the correct parameters" ---');
  console.log('- Probar VM version: default o "evm" en lugar de Shanghai');
  console.log('- Verificar que Compiler sea ETHEREUM (no TRON) si Tronscan ofrece ambos');
  console.log('- Alternativa OKLink: https://www.oklink.com/tron/verify-contract-preliminary');
  console.log('  (ejecutar npm run generate:standard-input y subir standard-input-TFeLLtutbo.json)');
  console.log('');

  // Abrir Tronscan en el navegador si se pasa --open
  if (process.argv.includes('--open')) {
    const { execSync } = require('node:child_process');
    try {
      if (process.platform === 'win32') {
        execSync(`start "" "${VERIFY_URL}"`, { stdio: 'ignore' });
      } else if (process.platform === 'darwin') {
        execSync(`open "${VERIFY_URL}"`, { stdio: 'ignore' });
      } else {
        execSync(`xdg-open "${VERIFY_URL}"`, { stdio: 'ignore' });
      }
      console.log('Tronscan abierto en el navegador.');
    } catch {
      console.log('Abrir manualmente:', VERIFY_URL);
    }
  }
}

main();
