#!/usr/bin/env node
'use strict';
/**
 * Abre OKLink para verificación de contrato proxy (TRON).
 * Vincula el Proxy con la Implementation para que el explorador muestre ABI e implementación.
 * Ref: https://www.oklink.com/es-la/tron/verify-proxy-contract
 *
 * Compatible con: ERC-1967 Proxy Storage Slots, TransparentUpgradeableProxy (OpenZeppelin).
 *
 * Uso: node scripts/verify-oklink-proxy.js [--open]
 *      npm run verify:oklink:proxy
 *      npm run verify:oklink:proxy:open
 */
const path = require('node:path');
const fs = require('node:fs');
const { execSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const OKLINK_PROXY_URL = 'https://www.oklink.com/tron/verify-proxy-contract';

function loadAddresses() {
  for (const p of ['deploy-info.json', path.join('abi', 'addresses.json')]) {
    const fp = path.join(ROOT, p);
    if (fs.existsSync(fp)) {
      try {
        const d = JSON.parse(fs.readFileSync(fp, 'utf8'));
        const proxy = d.tokenAddress || d.token;
        const impl = d.implementationAddress || d.implementation;
        if (proxy && impl) return { proxy, impl };
      } catch (_e) { /* ignore parse: usar direcciones por defecto */ }
    }
  }
  return {
    proxy: 'TV4P3sVfSQULNnsCPyzLnofCbK6cwkHeDm',
    impl: 'TFeLLtutboNwVwSSdNqAiXoQGzXZrbTDMC'
  };
}

const { proxy, impl } = loadAddresses();

console.log('\n=== VERIFICACIÓN PROXY EN OKLINK (TRON) ===\n');
console.log('Vincula el proxy con la implementación para que OKLink muestre ABI e implementación.\n');
console.log('Dirección proxy:', proxy);
console.log('Dirección implementación:', impl);
console.log('');
console.log('Ejecución por el agente (regla #1): npm run verify:oklink:proxy');
console.log('  (Playwright rellena campos y pulsa Siguiente; solo CAPTCHA manual si aparece)');
console.log('');
console.log('Solo abrir URL (sin rellenar): npm run verify:oklink:proxy:open');
console.log('');

if (process.argv.includes('--open')) {
  try {
    if (process.platform === 'win32') {
      execSync(`start "" "${OKLINK_PROXY_URL}"`, { stdio: 'ignore' });
    } else if (process.platform === 'darwin') {
      execSync(`open "${OKLINK_PROXY_URL}"`, { stdio: 'ignore' });
    } else {
      execSync(`xdg-open "${OKLINK_PROXY_URL}"`, { stdio: 'ignore' });
    }
    console.log('OKLink (verificación proxy) abierto en el navegador.');
  } catch (_e) {
    console.log('Abrir manualmente:', OKLINK_PROXY_URL);
  }
}
