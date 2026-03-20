#!/usr/bin/env node
'use strict';
/**
 * Flujo para cumplir el objetivo: Implementation verificado + perfil Tronscan.
 *
 * Si el bytecode actual NO coincide con mainnet (TXaXTSUK no verificable):
 *   1. npm run upgrade  — despliega nueva Implementation (0.8.25, verificable) y actualiza proxy
 *   2. Tras upgrade, deploy-info.json tendrá la nueva implementationAddress
 *
 * Luego:
 *   3. prepare:verification
 *   4. Verificar en Tronscan (manual o verify:oklink:playwright)
 *   5. perfil:tronscan:open
 *
 * Uso: node scripts/completar-objetivo.js
 */
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.join(__dirname, '..');

function getImplAddress() {
  const deployPath = path.join(ROOT, 'deploy-info.json');
  const addrPath = path.join(ROOT, 'abi', 'addresses.json');
  if (fs.existsSync(deployPath)) {
    const d = JSON.parse(fs.readFileSync(deployPath, 'utf8'));
    if (d.implementationAddress) return d.implementationAddress;
  }
  if (fs.existsSync(addrPath)) {
    const a = JSON.parse(fs.readFileSync(addrPath, 'utf8'));
    if (a.implementationAddress) return a.implementationAddress;
  }
  return null;
}

function run(cmd, opts = {}) {
  console.log('\n>', cmd);
  execSync(cmd, { stdio: 'inherit', cwd: ROOT, ...opts });
}

async function main() {
  console.log('=== Completar objetivo: Token verificado + perfil Tronscan ===\n');

  const implAddr = getImplAddress();
  if (implAddr) {
    console.log('Implementation actual:', implAddr);
  }

  run('npm run prepare:verification');

  console.log('\n1. Comprobando si la Implementation es verificable (bytecode coincide)...');
  try {
    run('node scripts/check-impl-verifiable.js', { stdio: 'pipe' });
  } catch {
    console.log('\n*** El bytecode no coincide exactamente. ***');
    console.log('Alternativa sin redespliegue: verification/SOLUCION-SIN-REDESPLIEGUE.txt');
    console.log('Continuando: intentar verificación + completar perfil.');
  }

  console.log('\n2. Verificando contrato...');
  const isTFeLLtutbo = implAddr && implAddr.startsWith('TFeLLtutbo');
  try {
    if (isTFeLLtutbo) {
      run('npm run verify:oklink:playwright', { timeout: 240000 });
    } else {
      run('npm run verify:oklink:playwright:legacy -- --step2', { timeout: 240000 });
    }
  } catch (e) {
    console.log('Verificación automática falló. Verifica manualmente en Tronscan:');
    console.log('  https://tronscan.org/#/contracts/verify');
    console.log('  Dirección:', implAddr || '(ver deploy-info.json)');
  }
  try {
    run('npm run check:oklink');
    console.log('Implementation verificado.');
  } catch (e) {
    const addr = implAddr || getImplAddress();
    console.log('Revisar en OKLink:', addr ? `https://www.oklink.com/tron/address/${addr}` : '');
  }
  console.log('\n3. Abriendo Tronscan para perfil del token. Conecta tu wallet (owner) y guarda.');
  run('npm run perfil:tronscan:open', { timeout: 360000 });
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
