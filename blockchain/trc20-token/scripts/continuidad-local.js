#!/usr/bin/env node
'use strict';
/**
 * Punto de control local verificable: no depende de Tronscan/OKLink.
 * Exit 0 solo si lint, tests, bytecode vs mainnet y datos de perfil están OK.
 *
 * Uso: npm run continuidad:local
 */
const { execSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

const STEPS = [
  ['lint:js', 'npm run lint:js'],
  ['test (compile + artifacts)', 'npm test'],
  ['check:alignment', 'npm run check:alignment'],
  ['check:perfil', 'npm run check:perfil']
];

function main() {
  console.log('');
  console.log('=== continuidad:local — comprobaciones sin explorador ===');
  console.log('');

  for (const [label, cmd] of STEPS) {
    console.log('>>> ' + label);
    execSync(cmd, { cwd: ROOT, stdio: 'inherit', env: process.env });
    console.log('');
  }

  console.log('=== CONTINUIDAD LOCAL — OK ===');
  console.log('');
  console.log('Bytecode, tests y requisitos de perfil listos. No implica verificación en explorador.');
  console.log('Siguiente (manual / explorador):');
  console.log('  • Implementation: verification/PAQUETE-VERIFICACION-POST-UPGRADE/VERIFICAR_AHORA.txt');
  console.log('  • Perfil token:    npm run perfil  →  Tronscan TRC20 profile');
  console.log('');
}

main();
