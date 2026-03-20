#!/usr/bin/env node
'use strict';
/**
 * Verifica los 5 contratos no verificados en TronScan.
 * Abre el navegador para cada uno; el usuario debe resolver CAPTCHA y enviar.
 *
 * Los 5 contratos:
 * - 2 ProxyAdmin: TTTT4AeRUjJEmTepb9X4uK4f6Pxg8UwwkW, TQJ6f3eczr2rK9x9kN2JMTdDN1zTm46XxE
 * - 3 TRC20TokenUpgradeable: TYqRvxioNWBqVa2nJGog8RkYQrXQdPJwR3, TPK7VWSGSH1nK4jetcNCz1BQqMU7gmnaLe, TNduz3PrYRDDN9HmEWXFn3nEsXKCaJt9er
 *
 * Uso: npm run verify:5:unverified
 * O con 2captcha (automático): CONTRACT_INDEX=0 npm run verify:5:2captcha
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
  // Ejecutar prepare-verification
  require('./prepare-verification.js');

  const source025 = path.resolve(VERIFICATION_DIR, 'TRC20TokenUpgradeable.sol');
  const sourceProxyAdmin = path.resolve(VERIFICATION_DIR, 'ProxyAdmin.sol');

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

  const startIdx = Math.max(0, parseInt(process.env.CONTRACT_INDEX || '0', 10));
  const contracts = CONTRACTS_TO_VERIFY.slice(startIdx, startIdx + 1);
  if (contracts.length === 0) {
    console.error('CONTRACT_INDEX inválido. Use 0-4 (0=TTTT4Ae, 4=TNduz3).');
    process.exit(1);
  }
  if (startIdx > 0) console.log('Solo contrato índice', startIdx, '(CONTRACT_INDEX=' + startIdx + ')\n');

  for (let i = 0; i < contracts.length; i++) {
    const c = contracts[i];
    const srcPath = c.sourceFile === 'ProxyAdmin.sol'
      ? path.resolve(VERIFICATION_DIR, 'ProxyAdmin.sol')
      : path.resolve(VERIFICATION_DIR, 'TRC20TokenUpgradeable.sol');

    console.log('\n=== Contrato', i + 1, 'de 5 ===');
    console.log('Dirección:', c.address);
    console.log('Main Contract:', c.mainContract);
    console.log('Archivo:', srcPath);

    const page = await context.newPage();
    try {
      await page.goto(TRONSCAN_VERIFY_URL, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(5000);
    } catch (e) {
      console.error('No se pudo cargar la página:', e.message);
      await browser.close();
      process.exit(1);
    }

    // Comprobación previa: detectar bloqueo Cloudflare antes de intentar rellenar
    const bodyText = (await page.textContent('body').catch(() => '')) || '';
    if (/sorry,\s*you\s*have\s*been\s*blocked|unable\s*to\s*access\s*tronscan|attention\s*required/i.test(bodyText)) {
      console.error('\n*** TRONSCAN BLOQUEADO POR CLOUDFLARE ***');
      console.error('El acceso a tronscan.org está bloqueado (Cloudflare).');
      console.error('');
      console.error('Alternativas verificadas:');
      console.error('1. Verificación MANUAL en navegador normal (no via script):');
      console.error('   - Abre https://tronscan.org/#/contracts/verify en Chrome/Edge (sin Playwright)');
      console.error('   - Si sigue bloqueado: prueba otra red (móvil, VPN), modo incógnito');
      console.error('2. OKLink (puede no tener el mismo bloqueo):');
      console.error('   - https://www.oklink.com/tron/verify-contract-preliminary');
      console.error('   - Archivos: verification/ProxyAdmin.sol, verification/TRC20TokenUpgradeable.sol');
      console.error('');
      console.error('NOTA: OKLink API no soporta TRON (verificado). Solo web manual.');
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

    console.log('Resuelve el CAPTCHA y pulsa "Verify and Publish".');
    if (i < CONTRACTS_TO_VERIFY.length - 1) {
      console.log('Cuando termines (o en 3 min), se abrirá el siguiente contrato.');
      await page.waitForTimeout(180000);
      await page.close();
    } else {
      console.log('Último contrato. El navegador se cerrará en 5 minutos.');
      await page.waitForTimeout(300000);
      await browser.close();
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
