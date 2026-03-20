#!/usr/bin/env node
'use strict';
/**
 * Pipeline automatizado: preparación verificación Implementation (OKLink / paquete).
 * No abre navegador; el paso final humano es: npm run verify:oklink:playwright
 *
 * Uso: node scripts/verify-implementation-pipeline.js
 *      npm run verify:implementation:pipeline
 */
const { execSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

function run(label, script) {
  console.log('\n>>> ' + label + '\n');
  try {
    execSync('npm run ' + script, { cwd: ROOT, stdio: 'inherit', env: process.env });
  } catch (e) {
    const code = e.status ?? 1;
    console.error('\n[FALLO] ' + label + ' (exit ' + code + ')');
    process.exit(code);
  }
}

function main() {
  console.log('========================================');
  console.log('  PIPELINE VERIFICACIÓN IMPLEMENTATION');
  console.log('  (compile → bytecode → JSON OKLink → mainnet → lint)');
  console.log('========================================');

  run('1/6 compile', 'compile');
  run('2/6 verificar:bytecode-match', 'verificar:bytecode-match');
  run('3/6 generate:standard-input:oklink', 'generate:standard-input:oklink');
  run('4/6 check:alignment (bytecode local vs mainnet)', 'check:alignment');
  run('5/6 check:bytecode:mainnet (informe detallado)', 'check:bytecode:mainnet');
  run('6/6 lint:js', 'lint:js');

  console.log('\n========================================');
  console.log('  PIPELINE OK — Sin errores de procedimiento.');
  console.log('  Siguiente (manual en navegador): npm run verify:oklink:playwright');
  console.log('  Luego pulsar Submit/Enviar en OKLink y esperar resultado.');
  console.log('  Opcional: npm run verify:oklink:proxy');
  console.log('  Si cambió contracts/: ejecutar también npm run guardar:verificacion');
  console.log('========================================\n');
}

main();
