#!/usr/bin/env node
'use strict';
/**
 * Flujo seguro para migrate -f 3 en mainnet:
 * 1. Compila con tronbox (artefactos TVM)
 * 2. Ejecuta verify-before-migrate-3 (balance, energía, ProxyAdmin)
 * 3. Si pasa: ejecuta tronbox migrate -f 3 con MIGRATE_3_VERIFIED=1
 *
 * Uso: npm run migrate-3-safe
 * Solo mainnet. No testnets.
 */
const { execSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const network = 'mainnet';

console.log('\n=== migrate-3-safe ===\n');
console.log('1. Compilando (compile)...');
try {
  execSync('npm run compile', { cwd: ROOT, stdio: 'inherit' });
} catch (e) {
  console.error('Compilación falló.');
  process.exit(1);
}

console.log('\n2. Verificando (verify-before-migrate-3)...');
try {
  execSync('node scripts/verify-before-migrate-3.js', { cwd: ROOT, stdio: 'inherit' });
} catch (e) {
  console.error('Verificación falló. No se ejecutará migrate.');
  process.exit(1);
}

console.log('\n3. Ejecutando tronbox migrate -f 3 --network ' + network + '...');
try {
  execSync('tronbox migrate -f 3 --network ' + network, {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, MIGRATE_3_VERIFIED: '1' }
  });
} catch (e) {
  console.error('Migración falló.');
  process.exit(1);
}

console.log('\n=== migrate-3-safe completado ===\n');
