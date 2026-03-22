#!/usr/bin/env node
'use strict';
/**
 * Puerta de calidad mainnet: cadena + bytecode alineados; opcionalmente verificación Tronscan.
 * Uso (desde blockchain/trc20-token):
 *   npm run gate:mainnet
 *   npm run gate:mainnet:strict
 * Flags:
 *   --strict  Exige además verify_status en Tronscan para proxy, implementation y proxyAdmin.
 */
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const NODE = process.execPath;
const strict = process.argv.includes('--strict');

function run(label, scriptName, extraArgs = []) {
  console.log('\n' + '='.repeat(60));
  console.log(label);
  console.log('='.repeat(60) + '\n');
  const scriptPath = path.join(ROOT, 'scripts', scriptName);
  const r = spawnSync(NODE, [scriptPath, ...extraArgs], {
    cwd: ROOT,
    stdio: 'inherit',
    env: process.env
  });
  if (r.status !== 0 && r.status !== null) process.exit(r.status);
  if (r.error) throw r.error;
}

function main() {
  console.log('\n>>> GATE MAINNET — Operación on-chain + alineación repo\n');
  console.log('Fecha:', new Date().toISOString());
  if (strict) {
    console.log('Modo: --strict (también se exige verificación en Tronscan)\n');
  } else {
    console.log('Modo: estándar (Tronscan: advertencia si falta verificación)\n');
  }

  run('PASO 1/2 — Red viva: proxy, token, admin, implementation()', 'check-mainnet-live.js');
  run('PASO 2/2 — Bytecode local = mainnet (implementation)', 'check-alignment-mainnet.js');

  if (strict) {
    run('PASO 3 — Verificación Tronscan (proxy + implementation + proxyAdmin)', 'check-contract-verified.js', ['--all']);
  } else {
    console.log('\n' + '='.repeat(60));
    console.log('PASO 3 (opcional) — Estado Tronscan');
    console.log('='.repeat(60) + '\n');
    const scriptPath = path.join(ROOT, 'scripts', 'check-contract-verified.js');
    const r = spawnSync(NODE, [scriptPath, '--all'], {
      cwd: ROOT,
      stdio: 'inherit',
      env: process.env
    });
    if (r.status !== 0 && r.status !== null) {
      console.log('\n⚠ ADVERTENCIA: Algún contrato sigue sin verificación de código en Tronscan.');
      console.log('   Eso no implica que la cadena esté mal; falta transparencia en el explorador.');
      console.log('   Siguiente: npm run guardar:verificacion → OKLink / procedimiento en README.');
      console.log('   Para FALLAR el gate si falta verificación: npm run gate:mainnet:strict\n');
    } else {
      console.log('\n✓ Tronscan: contratos comprobados como verificados.\n');
    }
  }

  console.log('=== GATE MAINNET: OK ===\n');
}

try {
  main();
} catch (e) {
  console.error(e.message || e);
  process.exit(1);
}
