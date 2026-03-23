#!/usr/bin/env node
'use strict';
/**
 * Verificación en OKLink para TFeLLtutboNwVwSSdNqAiXoQGzXZrbTDMC.
 * Standard JSON con metadata.bytecodeHash:none (config/trc20-networks.js) para que el bytecode coincida con mainnet.
 *
 * Uso: node scripts/verificar-oklink-TFeLLtutbo.js
 *      npm run verify:oklink
 */
const path = require('node:path');
const fs = require('node:fs');
const { execSync } = require('node:child_process');
const { loadImplementationAddress } = require(path.join(__dirname, 'lib', 'implementation-address.js'));

const ROOT = path.join(__dirname, '..');
const PKG_DIR = path.join(ROOT, 'verification', 'PAQUETE-VERIFICACION-POST-UPGRADE');
const STD_INPUT = path.join(PKG_DIR, 'standard-input-TFeLLtutbo.json');
const OKLINK_URL = 'https://www.oklink.com/tron/verify-contract-preliminary';
const IMPL_ADDR = loadImplementationAddress();

function main() {
  console.log('\n=== VERIFICACIÓN OKLINK — TFeLLtutboNwVwSSdNqAiXoQGzXZrbTDMC ===\n');
  console.log('Ejecución por el agente (regla #1): npm run verify:oklink:playwright');
  console.log('  (rellena dirección, Standard JSON, Main Contract y envía)\n');

  // Generar Standard Input si no existe (variantes OKLink: npm run generate:standard-input:oklink)
  if (!fs.existsSync(STD_INPUT)) {
    console.log('Generando standard-input-TFeLLtutbo.json...');
    try {
      execSync('npm run generate:standard-input', { cwd: ROOT, stdio: 'inherit', env: process.env });
    } catch {
      process.exit(1);
    }
  }
  const oklinkJson = path.join(PKG_DIR, 'standard-input-TFeLLtutbo-oklink.json');
  if (!fs.existsSync(oklinkJson)) {
    console.log('Generando variantes OKLink (sin evmVersion)...');
    try {
      execSync('npm run generate:standard-input:oklink', { cwd: ROOT, stdio: 'inherit', env: process.env });
    } catch {
      process.exit(1);
    }
  }

  if (!fs.existsSync(STD_INPUT)) {
    console.error('Falta', STD_INPUT);
    process.exit(1);
  }

  console.log('Referencia (si no se usa Playwright): Contract', IMPL_ADDR, '| Standard JSON:', STD_INPUT);
  console.log('Main contract: TRC20TokenUpgradeable | Compiler 0.8.25 | EVM Shanghai');
  console.log('');
  console.log('Después de verificar Implementation, vincular proxy (agente ejecuta): npm run verify:oklink:proxy');
  console.log('');

  if (process.argv.includes('--open')) {
    const { execSync } = require('node:child_process');
    try {
      if (process.platform === 'win32') {
        execSync(`start "" "${OKLINK_URL}"`, { stdio: 'ignore' });
      } else if (process.platform === 'darwin') {
        execSync(`open "${OKLINK_URL}"`, { stdio: 'ignore' });
      } else {
        execSync(`xdg-open "${OKLINK_URL}"`, { stdio: 'ignore' });
      }
      console.log('OKLink abierto en el navegador.');
    } catch (_e) {
      console.log('Abrir manualmente:', OKLINK_URL);
    }
  }
}

main();
