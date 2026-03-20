#!/usr/bin/env node
'use strict';
/**
 * Comprueba si el Implementation está verificado en OKLink.
 * OKLink API no soporta TRX para verify-contract-info; usa Playwright para cargar la página.
 * Lee implementationAddress desde deploy-info.json o abi/addresses.json.
 * Uso: node scripts/check-oklink-verified.js
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const DEPLOY = path.join(ROOT, 'deploy-info.json');
const ADDRS = path.join(ROOT, 'abi', 'addresses.json');

function getImplAddress() {
  if (fs.existsSync(DEPLOY)) {
    const d = JSON.parse(fs.readFileSync(DEPLOY, 'utf8'));
    if (d.implementationAddress) return d.implementationAddress;
  }
  if (fs.existsSync(ADDRS)) {
    const a = JSON.parse(fs.readFileSync(ADDRS, 'utf8'));
    if (a.implementationAddress) return a.implementationAddress;
  }
  return 'TFeLLtutboNwVwSSdNqAiXoQGzXZrbTDMC';
}

const IMPL_ADDRESS = getImplAddress();
const OKLINK_URL = 'https://www.oklink.com/tron/address/' + IMPL_ADDRESS;

async function main() {
  let playwright;
  try {
    playwright = require('playwright');
  } catch (err) {
    console.error('Playwright no instalado:', err?.message ?? err, '- npm install playwright');
    process.exit(2);
  }
  const browser = await playwright.chromium.launch({ headless: true });
  try {
    const page = await (await browser.newContext()).newPage();
    await page.goto(OKLINK_URL, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(3000);
    const text = await page.textContent('body');
    const lower = (text || '').toLowerCase();
    const verified = /\bverified\b/.test(lower) || /\bverificado\b/.test(lower);
    await browser.close();
    if (verified) {
      console.log('OKLink: Implementation', IMPL_ADDRESS, 'VERIFICADO');
      console.log(OKLINK_URL);
      process.exit(0);
    }
    console.log('OKLink: Implementation', IMPL_ADDRESS, 'aún no verificado');
    console.log(OKLINK_URL);
    process.exit(1);
  } catch (err) {
    await browser.close().catch(() => {});
    console.error('Error:', err?.message ?? err);
    process.exit(2);
  }
}

main().catch(err => { console.error(err); process.exit(2); }); // NOSONAR - CommonJS sin top-level await
