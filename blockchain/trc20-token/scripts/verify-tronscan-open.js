#!/usr/bin/env node
'use strict';
/**
 * Abre Tronscan Contract Verify, rellena el formulario y sube el archivo.
 * Uso: npm run verify:tronscan:open
 */
const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.join(__dirname, '..');
const VERIFICATION_DIR = path.join(ROOT, 'verification');
// Implementation TYqRvxio compilado con 0.8.34. Probar oklink (0.8.34) primero; si Tronscan no tiene 0.8.34, fallará bytecode.
const SOURCE_034 = path.resolve(VERIFICATION_DIR, 'TRC20TokenUpgradeable-oklink.sol');
const SOURCE_025 = path.resolve(VERIFICATION_DIR, 'TRC20TokenUpgradeable.sol');
const SOURCE_FILE = fs.existsSync(SOURCE_034) ? SOURCE_034 : SOURCE_025;
const DEPLOY_INFO = path.join(ROOT, 'deploy-info.json');
const ADDRESSES = path.join(ROOT, 'abi', 'addresses.json');

function getImplementationAddress() {
  if (fs.existsSync(DEPLOY_INFO)) {
    const info = JSON.parse(fs.readFileSync(DEPLOY_INFO, 'utf8'));
    if (info.implementationAddress) return info.implementationAddress;
  }
  if (fs.existsSync(ADDRESSES)) {
    const addr = JSON.parse(fs.readFileSync(ADDRESSES, 'utf8'));
    if (addr.implementationAddress) return addr.implementationAddress;
  }
  return 'TPK7VWSGSH1nK4jetcNCz1BQqMU7gmnaLe';
}

const CONTRACT_ADDRESS = getImplementationAddress();
const MAIN_CONTRACT = 'TRC20TokenUpgradeable';
const TRONSCAN_VERIFY_URL = 'https://tronscan.org/#/contracts/verify';

async function main() {
  if (!fs.existsSync(SOURCE_FILE)) {
    console.error('Ejecuta antes: npm run prepare:verification');
    process.exit(1);
  }

  let playwright;
  try {
    playwright = require('playwright');
  } catch (e) {
    console.error('Instala Playwright: npm install playwright && npx playwright install chromium');
    process.exit(1);
  }

  console.log('Abriendo Tronscan...');
  console.log('Dirección:', CONTRACT_ADDRESS);
  console.log('Archivo:', SOURCE_FILE);

  const browser = await playwright.chromium.launch({ headless: false });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  try {
    await page.goto(TRONSCAN_VERIFY_URL, { waitUntil: 'load', timeout: 20000 });
    await page.waitForTimeout(3000);
  } catch (e) {
    console.error('No se pudo cargar la página:', e.message);
    await browser.close();
    process.exit(1);
  }

  const fill = async (name, fn) => {
    try {
      await fn();
    } catch (e) {
      console.warn('  (omitido:', name, ')', e.message);
    }
  };

  await fill('Contract Address', async () => {
    const el = page.locator('input[placeholder="Contract Address"]').first();
    await el.waitFor({ state: 'visible', timeout: 8000 });
    await el.fill('');
    await el.fill(CONTRACT_ADDRESS);
  });

  await fill('Main Contract', async () => {
    const el = page.locator('input[placeholder*="main contract"]').first();
    await el.fill('');
    await el.fill(MAIN_CONTRACT);
  });

  await fill('Runs', async () => {
    const el = page.getByRole('spinbutton', { name: /Runs/i }).first();
    await el.fill('200');
  });

  await fill('Compiler', async () => {
    const selects = await page.locator('select').all();
    for (const sel of selects) {
      const opts = await sel.locator('option').allTextContents();
      const idx034 = opts.findIndex((t) => /0\.8\.34|v0\.8\.34/.test(t));
      const idx = idx034 >= 0 ? idx034 : opts.findIndex((t) => /0\.8\.30|0\.8\.25|tronbox_soljson_v3/.test(t));
      if (idx >= 0) { await sel.selectOption({ index: idx }).catch(() => {}); return; }
    }
  });

  await fill('Optimization', async () => {
    const labels = await page.getByText(/Optimization|optimization/i).all();
    for (const lb of labels.slice(0, 2)) {
      const chk = lb.locator('..').locator('input[type="checkbox"]').first();
      if (await chk.count() > 0) { await chk.check().catch(() => {}); return; }
    }
  });

  await fill('Archivo', async () => {
    const fileInputs = page.locator('input[type="file"]');
    const n = await fileInputs.count();
    for (let i = 0; i < n; i++) {
      const inp = fileInputs.nth(i);
      try {
        await inp.setInputFiles(SOURCE_FILE);
        console.log('  Archivo subido.');
        break;
      } catch (_) { /* input no acepta archivo; intentar siguiente */ }
    }
    if (n === 0) {
      const btn = page.locator('button').filter({ hasText: /Upload|upload/ }).first();
      await btn.click();
      await page.waitForTimeout(1500);
      const inp2 = page.locator('input[type="file"]').first();
      if (await inp2.count() > 0) await inp2.setInputFiles(SOURCE_FILE);
    }
  });

  console.log('');
  console.log('En el navegador: revisa Compiler/Optimization (el script intenta rellenarlos), resuelve CAPTCHA y pulsa Verify and Publish.');
  console.log('El navegador se cerrará en 5 minutos o cierra la ventana cuando termines.');

  await page.waitForTimeout(300000);
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
