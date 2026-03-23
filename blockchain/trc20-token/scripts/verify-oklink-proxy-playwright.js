#!/usr/bin/env node
'use strict';
/**
 * Verificación de proxy en OKLink (TRON) vía Playwright — ejecuta el agente (regla #1).
 * Abre la página, rellena proxy e implementación y hace clic en Siguiente.
 * Ref: https://www.oklink.com/es-la/tron/verify-proxy-contract
 *
 * Uso: node scripts/verify-oklink-proxy-playwright.js
 *      npm run verify:oklink:proxy:playwright
 */
const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.join(__dirname, '..');
const URL = 'https://www.oklink.com/tron/verify-proxy-contract';

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

function log(msg) {
  console.log('[verify-oklink-proxy] ' + msg);
}

async function main() {
  let playwright;
  try {
    playwright = require('playwright');
  } catch (e) {
    log('Playwright no instalado. npm install playwright');
    process.exit(1);
  }

  const { proxy, impl } = loadAddresses();
  log('Proxy: ' + proxy);
  log('Implementation: ' + impl);

  log('Abriendo OKLink verify-proxy-contract (headless: false)');
  const browser = await playwright.chromium.launch({ headless: false });
  const page = await (await browser.newContext()).newPage();

  try {
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    const inputs = page.locator('input[type="text"], input:not([type="hidden"]):visible');
    const n = await inputs.count();
    if (n >= 1) {
      await inputs.first().fill(proxy);
      log('Campo 1 (proxy) rellenado');
    }
    if (n >= 2) {
      await inputs.nth(1).fill(impl);
      log('Campo 2 (implementation) rellenado');
    }
    await page.waitForTimeout(1000);

    const btn = page.getByRole('button', { name: /Siguiente|Next|RestablecerSiguiente|Submit/i }).first();
    if (await btn.count() > 0 && await btn.isVisible().catch(() => false)) {
      await btn.click();
      log('Botón Siguiente/Next pulsado');
      await page.waitForTimeout(5000);
    }

    log('Comprobar resultado en la página.');
    log('Proxy en OKLink: https://www.oklink.com/tron/address/' + proxy);
    await page.waitForTimeout(30000);
  } catch (e) {
    log('Error: ' + e.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

(async () => {
  try {
    await main();
  } catch (e) {
    log('Error: ' + e.message);
    process.exit(1);
  }
})();
