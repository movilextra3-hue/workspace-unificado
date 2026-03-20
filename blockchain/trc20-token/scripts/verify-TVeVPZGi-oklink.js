#!/usr/bin/env node
'use strict';
/**
 * Abre OKLink para verificar TVeVPZGi (ProxyAdmin activo).
 * TVeVPZGi está compilado con 0.8.34+default → NO TronScan, solo OKLink.
 *
 * Uso: npm run verify:TVeVPZGi:oklink
 */
const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.join(__dirname, '..');
const VERIFICATION_DIR = path.join(ROOT, 'verification');
const OKLINK_URL = 'https://www.oklink.com/tron/verify-contract-preliminary';

const CONTRACT = {
  address: 'TVeVPZGiMc9GWQ8sQHvUwhfg19EDZt3UjZ',
  mainContract: 'ProxyAdmin',
  sourceFile: 'ProxyAdmin.sol',
  compiler: '0.8.34',
  runs: 200
};

async function main() {
  require('./prepare-verification.js');

  const srcPath = path.join(VERIFICATION_DIR, CONTRACT.sourceFile);
  if (!fs.existsSync(srcPath)) {
    console.error('Falta:', srcPath);
    process.exit(1);
  }
  const sourceCode = fs.readFileSync(srcPath, 'utf8');

  let playwright;
  try {
    playwright = require('playwright');
  } catch (e) {
    console.error('npm install playwright && npx playwright install chromium');
    process.exit(1);
  }

  console.log('\n=== Verificación TVeVPZGi (ProxyAdmin) en OKLink ===\n');
  console.log('Dirección:', CONTRACT.address);
  console.log('Archivo:', srcPath);
  console.log('Compiler: 0.8.34 | Runs: 200');
  console.log('');
  console.log('Abriendo OKLink...');

  const browser = await playwright.chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    await page.goto(OKLINK_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
  } catch (e) {
    console.error('Error:', e.message);
    await browser.close();
    process.exit(1);
  }

  const fill = async (name, fn) => {
    try {
      await fn();
    } catch (e) {
      console.warn('  (omitido', name, ')', e.message);
    }
  };

  await fill('Dirección', async () => {
    const inp = page.locator('input[placeholder*="Enter"], input[placeholder*="Address"]').first();
    await inp.waitFor({ state: 'visible', timeout: 10000 });
    await inp.fill('');
    await inp.fill(CONTRACT.address);
  });
  await page.waitForTimeout(800);

  await fill('Compiler 0.8.34', async () => {
    const combos = page.getByRole('combobox');
    if (await combos.count() >= 2) {
      await combos.nth(1).click();
      await page.waitForTimeout(800);
      const opt = page.getByRole('option').filter({ hasText: /0\.8\.34|v0\.8\.34/ });
      if (await opt.count() > 0) await opt.first().click();
    }
  });
  await page.waitForTimeout(500);

  const nextBtn = page.getByRole('button', { name: /Next|Siguiente/i });
  if (await nextBtn.isEnabled().catch(() => false)) {
    await nextBtn.click();
    await page.waitForTimeout(2500);
  }

  await fill('Código fuente', async () => {
    const ta = page.locator('textarea').first();
    await ta.waitFor({ state: 'visible', timeout: 5000 });
    await ta.fill('');
    await ta.fill(sourceCode);
  });
  await page.waitForTimeout(500);

  await fill('Main Contract', async () => {
    const inputs = page.locator('input:not([type="hidden"])');
    for (let i = 0; i < await inputs.count(); i++) {
      const el = inputs.nth(i);
      const ph = (await el.getAttribute('placeholder') || '').toLowerCase();
      if (ph.includes('contract') && !ph.includes('address')) {
        await el.fill(CONTRACT.mainContract);
        break;
      }
    }
  });

  const runsInp = page.locator('input[type="number"]').first();
  if (await runsInp.count() > 0) await runsInp.fill('200').catch(() => {});

  console.log('');
  console.log('Resuelve el CAPTCHA y pulsa Enviar/Submit.');
  console.log('Navegador abierto 5 min.');
  await page.waitForTimeout(300000);
  await browser.close();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
