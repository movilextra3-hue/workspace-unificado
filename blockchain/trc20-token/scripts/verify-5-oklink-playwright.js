#!/usr/bin/env node
'use strict';
/**
 * Verifica los 5 contratos no verificados en OKLink (evita bloqueo Cloudflare de TronScan).
 * Abre el navegador para cada uno; revisa Submit si el script no lo completa (OKLink: sin CAPTCHA en este flujo).
 *
 * Los 5 contratos:
 * - 2 ProxyAdmin: TTTT4AeRUjJEmTepb9X4uK4f6Pxg8UwwkW, TQJ6f3eczr2rK9x9kN2JMTdDN1zTm46XxE
 * - 3 TRC20TokenUpgradeable: TYqRvxio, TPK7VWSGSH1nK4jetcNCz1BQqMU7gmnaLe, TNduz3PrYRDDN9HmEWXFn3nEsXKCaJt9er
 *
 * Uso: npm run verify:5:oklink
 *      CONTRACT_INDEX=2 node scripts/verify-5-oklink-playwright.js  (solo contrato 3)
 */
const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.join(__dirname, '..');
const VERIFICATION_DIR = path.join(ROOT, 'verification');
const OKLINK_URL = 'https://www.oklink.com/tron/verify-contract-preliminary';

const CONTRACTS = [
  { address: 'TTTT4AeRUjJEmTepb9X4uK4f6Pxg8UwwkW', mainContract: 'ProxyAdmin', sourceFile: 'ProxyAdmin.sol', compilerRegex: /0\.8\.25|v0\.8\.25/ },
  { address: 'TQJ6f3eczr2rK9x9kN2JMTdDN1zTm46XxE', mainContract: 'ProxyAdmin', sourceFile: 'ProxyAdmin.sol', compilerRegex: /0\.8\.25|v0\.8\.25/ },
  { address: 'TYqRvxioNWBqVa2nJGog8RkYQrXQdPJwR3', mainContract: 'TRC20TokenUpgradeable', sourceFile: 'TRC20TokenUpgradeable-oklink.sol', compilerRegex: /0\.8\.34|v0\.8\.34/ },
  { address: 'TPK7VWSGSH1nK4jetcNCz1BQqMU7gmnaLe', mainContract: 'TRC20TokenUpgradeable', sourceFile: 'TRC20TokenUpgradeable-oklink.sol', compilerRegex: /0\.8\.34|v0\.8\.34/ },
  { address: 'TNduz3PrYRDDN9HmEWXFn3nEsXKCaJt9er', mainContract: 'TRC20TokenUpgradeable', sourceFile: 'TRC20TokenUpgradeable-oklink.sol', compilerRegex: /0\.8\.34|v0\.8\.34/ }
];

function log(msg) { console.log('[verify-5-oklink] ' + msg); }

async function fillAndSubmit(page, c, sourceCode) {
  const fill = async (name, fn) => {
    try { await fn(); } catch (e) { log('  (omitido ' + name + ') ' + e.message); }
  };

  await fill('Dirección', async () => {
    const inp = page.locator('input[placeholder*="Enter"], input[placeholder*="Ingresar"]').first();
    await inp.waitFor({ state: 'visible', timeout: 10000 });
    await inp.fill('');
    await inp.fill(c.address);
  });
  await page.waitForTimeout(600);

  await fill('Compiler type', async () => {
    const combo = page.getByRole('combobox').first();
    await combo.click();
    await page.waitForTimeout(800);
    const opt = page.getByRole('option', { name: /Solidity\(SingleFile\)/ });
    if (await opt.count() > 0) await opt.first().click();
    else await page.keyboard.press('Escape');
  });
  await page.waitForTimeout(800);

  await fill('Compiler version', async () => {
    const combos = page.getByRole('combobox');
    if (await combos.count() >= 2) {
      await combos.nth(1).click();
      await page.waitForTimeout(800);
      const opt = page.getByRole('option').filter({ hasText: c.compilerRegex });
      if (await opt.count() > 0) await opt.first().click();
      else await page.keyboard.press('Escape');
    }
  });
  await page.waitForTimeout(500);

  const nextBtn = page.getByRole('button', { name: /Next|Siguiente/i });
  for (let i = 0; i < 20; i++) {
    if (await nextBtn.isEnabled().catch(() => false)) {
      await nextBtn.click();
      log('Next/Siguiente');
      break;
    }
    await page.waitForTimeout(400);
  }
  await page.waitForTimeout(2500);

  await fill('Código fuente', async () => {
    const ta = page.locator('textarea').first();
    await ta.waitFor({ state: 'visible', timeout: 5000 });
    await ta.fill('');
    await ta.fill(sourceCode);
  });
  await page.waitForTimeout(600);

  await fill('Main Contract', async () => {
    const inputs = page.locator('input:not([type="hidden"])');
    for (let i = 0; i < await inputs.count(); i++) {
      const el = inputs.nth(i);
      const ph = (await el.getAttribute('placeholder') || '') + (await el.getAttribute('name') || '');
      if (/main\s*contract|contrato\s*principal|contract\s*name/i.test(ph) && !/address|dirección/i.test(ph)) {
        await el.fill(c.mainContract);
        break;
      }
    }
  });
  await page.waitForTimeout(400);

  const runsInp = page.locator('input[type="number"]').first();
  if (await runsInp.count() > 0) await runsInp.fill('200').catch(() => {});

  const optCombo = page.getByRole('combobox').filter({ hasText: /optimization|optimiz/i }).first();
  if (await optCombo.count() > 0) {
    await optCombo.click();
    await page.waitForTimeout(600);
    const yes = page.getByRole('option').filter({ hasText: /^Yes$|^Sí$/i });
    if (await yes.count() > 0) await yes.first().click();
  }

  const submitBtn = page.locator('button').filter({ hasText: /enviar|submit|verificar/i }).first();
  if (await submitBtn.count() > 0) {
    await submitBtn.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await submitBtn.click({ force: true }).catch(() => {});
    log('Submit pulsado.');
  }
}

async function main() {
  require('./prepare-verification.js');

  const idx = parseInt(process.env.CONTRACT_INDEX || '0', 10);
  const start = Math.max(0, Math.min(idx, 4));
  const end = process.env.CONTRACT_INDEX !== undefined ? start : 4;

  let playwright;
  try { playwright = require('playwright'); } catch (e) {
    log('Playwright no instalado. npm install playwright && npx playwright install chromium');
    process.exit(1);
  }

  const browser = await playwright.chromium.launch({ headless: false });
  const context = await browser.newContext();

  for (let i = start; i <= end; i++) {
    const c = CONTRACTS[i];
    const srcPath = path.join(VERIFICATION_DIR, c.sourceFile);
    if (!fs.existsSync(srcPath)) {
      log('Falta: ' + srcPath);
      continue;
    }
    const sourceCode = fs.readFileSync(srcPath, 'utf8');

    log('\n=== Contrato ' + (i + 1) + '/5: ' + c.address + ' (' + c.mainContract + ') ===');
    const page = await context.newPage();
    try {
      await page.goto(OKLINK_URL, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(3000);
    } catch (e) {
      log('Error cargando OKLink: ' + e.message);
      await browser.close();
      process.exit(1);
    }

    const bodyText = (await page.textContent('body').catch(() => '')) || '';
    if (/blocked|unable\s*to\s*access|attention\s*required/i.test(bodyText)) {
      log('OKLink bloqueado. Usa verificación manual en navegador normal.');
      await browser.close();
      process.exit(1);
    }

    await fillAndSubmit(page, c, sourceCode);
    log('Pulsa Enviar/Submit si no se envió.');
    if (i < end) {
      log('Cuando termines (o en 2 min), siguiente contrato.');
      await page.waitForTimeout(120000);
      await page.close();
    } else {
      log('Último. Navegador abierto 3 min.');
      await page.waitForTimeout(180000);
      await browser.close();
    }
  }
}

main().catch(e => { log('Error: ' + e.message); process.exit(1); });
