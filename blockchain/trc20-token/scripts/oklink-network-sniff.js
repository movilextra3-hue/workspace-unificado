#!/usr/bin/env node
'use strict';
/**
 * Abre el paso 2 de verificación OKLink y registra TODAS las respuestas HTTP relevantes
 * (no solo application/json) en oklink-network-sniff.log — útil cuando la UI muestra
 * "ocurrió un error" sin detalle.
 *
 * Uso: node scripts/oklink-network-sniff.js
 *      npm run verify:oklink:sniff
 *
 * Tras enviar el formulario en el navegador, vuelve a la terminal y pulsa Enter.
 */
const path = require('node:path');
const readline = require('node:readline');
const { loadImplementationAddress } = require(path.join(__dirname, 'lib', 'implementation-address.js'));
const { attachOklinkNetworkDebug } = require(path.join(__dirname, 'lib', 'oklink-network-debug.js'));

const ROOT = path.join(__dirname, '..');
const PKG = path.join(ROOT, 'verification', 'PAQUETE-VERIFICACION-POST-UPGRADE');
const LOG = path.join(PKG, 'oklink-network-sniff.log');
const ADDR = loadImplementationAddress();
const STEP2 =
  'https://www.oklink.com/tron/verify-contract-sourcecode-sol-single#' +
  'address=' +
  encodeURIComponent(ADDR) +
  '&edition=' +
  encodeURIComponent('v0.8.25+commit.b61c2a91') +
  '&zk-version=&type=json';

async function main() {
  let playwright;
  try {
    playwright = require('playwright');
  } catch (e) {
    console.error('Instala Playwright: npm install playwright');
    process.exit(1);
  }

  console.log('');
  console.log('=== OKLink — captura de red (diagnóstico) ===');
  console.log('Implementation:', ADDR);
  console.log('Log:', LOG);
  console.log('');
  console.log('1) En el navegador: pega el JSON, revisa combos y pulsa Submit.');
  console.log('2) Cuando veas el mensaje (éxito o error), vuelve aquí y pulsa Enter.');
  console.log('');

  const browser = await playwright.chromium.launch({ headless: false });
  const page = await browser.newPage();
  attachOklinkNetworkDebug(page, LOG, { overwrite: true });

  await page.goto(STEP2, { waitUntil: 'domcontentloaded', timeout: 120000 });
  console.log('Página cargada. Log en tiempo real en:', LOG);

  await new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('Pulsa Enter cuando hayas enviado y revisado el resultado… ', () => {
      rl.close();
      resolve();
    });
  });

  await browser.close();
  console.log('');
  console.log('Abre el log y busca status=, body:, REQUEST_FAILED:');
  console.log(LOG);
  console.log('');
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
