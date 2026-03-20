#!/usr/bin/env node
'use strict';
/**
 * NOTA: Comprobado 2026-03-07: abrir varias pestañas seguidas activa Cloudflare.
 * Pestaña 1 OK; pestaña 2+ bloqueada. Este script NO es viable.
 *
 * Usar en su lugar: npm run verify:5:unverified
 * (uno por uno, 3 min entre cada uno; no cerrar el navegador)
 */
console.error('');
console.error('*** verify:5:all-tabs NO RECOMENDADO ***');
console.error('Comprobado: abrir varias pestañas activa Cloudflare (pestaña 2+ bloqueada).');
console.error('');
console.error('Usar: npm run verify:5:unverified');
console.error('(uno por uno, 3 min entre cada contrato; no cerrar el navegador)');
console.error('');
process.exit(1);

/* Código original (no ejecutable; mantiene estructura para referencia)
const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.join(__dirname, '..');
const VERIFICATION_DIR = path.join(ROOT, 'verification');
const TRONSCAN_VERIFY_URL = 'https://tronscan.org/#/contracts/verify';

const CONTRACTS_TO_VERIFY = [
  { address: 'TTTT4AeRUjJEmTepb9X4uK4f6Pxg8UwwkW', mainContract: 'ProxyAdmin', sourceFile: 'ProxyAdmin.sol' },
  { address: 'TQJ6f3eczr2rK9x9kN2JMTdDN1zTm46XxE', mainContract: 'ProxyAdmin', sourceFile: 'ProxyAdmin.sol' },
  { address: 'TYqRvxioNWBqVa2nJGog8RkYQrXQdPJwR3', mainContract: 'TRC20TokenUpgradeable', sourceFile: 'TRC20TokenUpgradeable.sol' },
  { address: 'TPK7VWSGSH1nK4jetcNCz1BQqMU7gmnaLe', mainContract: 'TRC20TokenUpgradeable', sourceFile: 'TRC20TokenUpgradeable.sol' },
  { address: 'TNduz3PrYRDDN9HmEWXFn3nEsXKCaJt9er', mainContract: 'TRC20TokenUpgradeable', sourceFile: 'TRC20TokenUpgradeable.sol' }
];
*/
const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.join(__dirname, '..');
const VERIFICATION_DIR = path.join(ROOT, 'verification');
const TRONSCAN_VERIFY_URL = 'https://tronscan.org/#/contracts/verify';

const CONTRACTS_TO_VERIFY = [
  { address: 'TTTT4AeRUjJEmTepb9X4uK4f6Pxg8UwwkW', mainContract: 'ProxyAdmin', sourceFile: 'ProxyAdmin.sol' },
  { address: 'TQJ6f3eczr2rK9x9kN2JMTdDN1zTm46XxE', mainContract: 'ProxyAdmin', sourceFile: 'ProxyAdmin.sol' },
  { address: 'TYqRvxioNWBqVa2nJGog8RkYQrXQdPJwR3', mainContract: 'TRC20TokenUpgradeable', sourceFile: 'TRC20TokenUpgradeable.sol' },
  { address: 'TPK7VWSGSH1nK4jetcNCz1BQqMU7gmnaLe', mainContract: 'TRC20TokenUpgradeable', sourceFile: 'TRC20TokenUpgradeable.sol' },
  { address: 'TNduz3PrYRDDN9HmEWXFn3nEsXKCaJt9er', mainContract: 'TRC20TokenUpgradeable', sourceFile: 'TRC20TokenUpgradeable.sol' }
];

async function main() {
  require('./prepare-verification.js');

  const sourceProxyAdmin = path.resolve(VERIFICATION_DIR, 'ProxyAdmin.sol');
  const source025 = path.resolve(VERIFICATION_DIR, 'TRC20TokenUpgradeable.sol');

  for (const c of CONTRACTS_TO_VERIFY) {
    const srcPath = c.sourceFile === 'ProxyAdmin.sol' ? sourceProxyAdmin : source025;
    if (!fs.existsSync(srcPath)) {
      console.error('Falta archivo:', srcPath, '- Ejecuta npm run prepare:verification');
      process.exit(1);
    }
  }

  let playwright;
  try {
    playwright = require('playwright');
  } catch (e) {
    console.error('Instala Playwright: npm install playwright && npx playwright install chromium');
    process.exit(1);
  }

  const browser = await playwright.chromium.launch({ headless: false });
  const context = await browser.newContext({ acceptDownloads: true });

  const fill = async (page, name, fn) => {
    try {
      await fn();
    } catch (e) {
      console.warn('  (omitido:', name, ')', e.message);
    }
  };

  const pages = [];
  for (let i = 0; i < CONTRACTS_TO_VERIFY.length; i++) {
    const c = CONTRACTS_TO_VERIFY[i];
    const srcPath = c.sourceFile === 'ProxyAdmin.sol' ? sourceProxyAdmin : source025;

    console.log('\n=== Pestaña', i + 1, 'de 5:', c.address, '===');
    const page = await context.newPage();
    pages.push(page);

    try {
      await page.goto(TRONSCAN_VERIFY_URL, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(3000);
    } catch (e) {
      console.error('No se pudo cargar la página:', e.message);
      await browser.close();
      process.exit(1);
    }

    const bodyText = (await page.textContent('body').catch(() => '')) || '';
    if (/sorry,\s*you\s*have\s*been\s*blocked|unable\s*to\s*access\s*tronscan|attention\s*required/i.test(bodyText)) {
      console.error('\n*** TRONSCAN BLOQUEADO POR CLOUDFLARE ***');
      console.error('Alternativas: verificación manual en navegador normal; OKLink web.');
      await browser.close();
      process.exit(1);
    }

    await fill(page, 'Contract Address', async () => {
      const el = page.locator('input[placeholder="Contract Address"]').first();
      await el.waitFor({ state: 'visible', timeout: 15000 });
      await el.fill('');
      await el.fill(c.address);
    });
    await fill(page, 'Main Contract', async () => {
      const el = page.locator('input[placeholder*="main contract"], input[placeholder*="Main contract"]').first();
      await el.waitFor({ state: 'visible', timeout: 5000 });
      await el.fill('');
      await el.fill(c.mainContract);
    });
    await fill(page, 'Runs', async () => {
      const el = page.getByRole('spinbutton', { name: /Runs/i }).first();
      await el.fill('200');
    });
    await fill(page, 'Compiler', async () => {
      const selects = await page.locator('select').all();
      for (const sel of selects) {
        const opts = await sel.locator('option').allTextContents();
        const idx = opts.findIndex((t) => /0\.8\.25|0\.8\.30|tronbox_soljson_v3/.test(t));
        if (idx >= 0) {
          await sel.selectOption({ index: idx }).catch(() => {});
          return;
        }
      }
    });
    await fill(page, 'Optimization', async () => {
      const labels = await page.getByText(/Optimization|optimization/i).all();
      for (const lb of labels.slice(0, 2)) {
        const chk = lb.locator('..').locator('input[type="checkbox"]').first();
        if (await chk.count() > 0) {
          await chk.check().catch(() => {});
          return;
        }
      }
    });
    await fill(page, 'Archivo', async () => {
      const fileInputs = page.locator('input[type="file"]');
      const n = await fileInputs.count();
      for (let j = 0; j < n; j++) {
        try {
          await fileInputs.nth(j).setInputFiles(srcPath);
          console.log('  Archivo subido.');
          break;
        } catch (_) { /* intentar siguiente */ }
      }
      if (n === 0) {
        const btn = page.locator('button').filter({ hasText: /Upload|upload/ }).first();
        await btn.click();
        await page.waitForTimeout(1500);
        const inp = page.locator('input[type="file"]').first();
        if (await inp.count() > 0) await inp.setInputFiles(srcPath);
      }
    });
  }

  console.log('\n*** 5 pestañas abiertas. Resuelve el CAPTCHA en cada una y pulsa "Verify and Publish". ***');
  console.log('El navegador permanecerá abierto 30 minutos. Cierra manualmente cuando termines.');
  await new Promise((r) => setTimeout(r, 30 * 60 * 1000));
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
