#!/usr/bin/env node
'use strict';
/**
 * Objetivo verificación Implementation (TFeLLtutbo): estado local + explorador.
 * No abre navegador. Ejecutar desde blockchain/trc20-token.
 *
 * Uso: node scripts/verify-objective-trc20.js
 *      npm run verify:objective:status
 */
const { execSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

function run(label, cmd) {
  console.log('\n>>> ' + label + '\n');
  execSync(cmd, { cwd: ROOT, stdio: 'inherit', env: process.env });
}

function main() {
  console.log('========================================');
  console.log('  OBJETIVO TRC20 — VERIFICACIÓN IMPLEMENTATION');
  console.log('  (alineación bytecode + estado Tronscan)');
  console.log('========================================');

  run('1/2 Bytecode local vs mainnet', 'npm run check:alignment');
  console.log('\n>>> 2/2 Estado verificación en explorador (Tronscan API)\n');
  try {
    execSync('node scripts/check-contract-verified.js', {
      cwd: ROOT,
      stdio: 'inherit',
      env: process.env
    });
  } catch (e) {
    const code = e.status ?? 1;
    console.log('\n--- Código salida ' + code + ' = Implementation aún no verificada en Tronscan (esperado hasta OKLink). ---');
  }

  console.log('\n========================================');
  console.log('  Siguiente: OKLink manual o npm run verify:oklink:playwright');
  console.log('  Paquete: verification/PAQUETE-VERIFICACION-POST-UPGRADE/VERIFICAR_AHORA.txt');
  console.log('========================================\n');
}

main();
