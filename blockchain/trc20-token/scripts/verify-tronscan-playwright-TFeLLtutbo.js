#!/usr/bin/env node
'use strict';
/**
 * Abre Tronscan Contract Verification y rellena lo automatizable para TFeLLtutbo (Implementation).
 * Ref. oficial: https://developers.tron.network/docs/contract-verification
 * Formulario: https://tronscan.org/#/contracts/verify
 *
 * Límite comprobado en el proyecto: el despliegue usa metadata.bytecodeHash:none; Tronscan
 * no expone ese ajuste → la compilación del explorador suele no coincidir con el bytecode en
 * cadena ("Please confirm the correct parameters"). Si ocurre, la vía documentada es OKLink
 * + Standard JSON (ver TRONSCAN-POR-QUE-FALLA.txt en el paquete).
 *
 * Uso: node scripts/verify-tronscan-playwright-TFeLLtutbo.js [--no-wait]
 *      npm run verify:tronscan:playwright
 *      npm run verify:tronscan:playwright:auto   (--no-wait)
 *
 * Requiere: npm run guardar:verificacion (o al menos exista TRC20TokenUpgradeable.sol en el paquete).
 */
const path = require('node:path');
const fs = require('node:fs');
const readline = require('node:readline');
const { loadImplementationAddress } = require(path.join(__dirname, 'lib', 'implementation-address.js'));

const ROOT = path.join(__dirname, '..');
const PKG = path.join(ROOT, 'verification', 'PAQUETE-VERIFICACION-POST-UPGRADE');
const SOURCE_FILE = path.join(PKG, 'TRC20TokenUpgradeable.sol');
const ADDR = loadImplementationAddress();
const MAIN_CONTRACT = 'TRC20TokenUpgradeable';
const TRONSCAN_VERIFY_URL = 'https://tronscan.org/#/contracts/verify';

function log(msg) {
  console.log('[verify-tronscan-TFeLLtutbo] ' + msg);
}

async function main() {
  if (!fs.existsSync(SOURCE_FILE)) {
    log('Falta: ' + SOURCE_FILE);
    log('Ejecutar: npm run guardar:verificacion');
    process.exit(1);
  }

  let playwright;
  try {
    playwright = require('playwright');
  } catch {
    log('Instala Playwright: npm install playwright');
    process.exit(1);
  }

  log('Implementation: ' + ADDR);
  log('Fuente: ' + SOURCE_FILE);
  log('NOTA: Tronscan puede fallar por bytecodeHash:none — ver TRONSCAN-POR-QUE-FALLA.txt');
  log('Abriendo Tronscan (headless: false)...');

  const browser = await playwright.chromium.launch({ headless: false });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  try {
    await page.goto(TRONSCAN_VERIFY_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2500);
  } catch (e) {
    log('Error al cargar: ' + e.message);
    await browser.close();
    process.exit(1);
  }

  const fill = async (name, fn) => {
    try {
      await fn();
    } catch (e) {
      log('(omitido ' + name + ') ' + e.message);
    }
  };

  await fill('Contract Address', async () => {
    const el = page.locator('input[placeholder*="Contract Address" i], input[placeholder*="contract" i]').first();
    await el.waitFor({ state: 'visible', timeout: 15000 });
    await el.fill('');
    await el.fill(ADDR);
  });

  await fill('Main Contract', async () => {
    const el = page.locator('input[placeholder*="main contract" i], input[placeholder*="Main" i]').first();
    if (await el.count()) {
      await el.fill('');
      await el.fill(MAIN_CONTRACT);
    }
  });

  await fill('Runs', async () => {
    const el = page.getByRole('spinbutton', { name: /Runs/i }).first();
    if (await el.count()) await el.fill('200');
  });

  await fill('Compiler 0.8.25', async () => {
    const selects = await page.locator('select').all();
    for (const sel of selects) {
      const opts = await sel.locator('option').allTextContents();
      const idx =
        opts.findIndex((t) => /0\.8\.25|v0\.8\.25|b61c2a91/i.test(t));
      if (idx >= 0) {
        await sel.selectOption({ index: idx });
        log('Compiler: opción índice ' + idx + ' (0.8.25)');
        return;
      }
    }
    log('Compiler: selecciona manualmente v0.8.25 si el combo no coincidió.');
  });

  await fill('Optimization', async () => {
    const on = page.getByText(/Optimization|optimization/i).first();
    if (await on.count()) {
      const row = on.locator('xpath=ancestor::*[self::div or self::label][1]');
      const chk = row.locator('input[type="checkbox"]').first();
      if (await chk.count()) await chk.check({ force: true });
    }
  });

  await fill('EVM / VM', async () => {
    const selects = await page.locator('select').all();
    for (const sel of selects) {
      const opts = await sel.locator('option').allTextContents();
      const idx = opts.findIndex((t) => /shanghai|Shanghai/i.test(t));
      if (idx >= 0) {
        await sel.selectOption({ index: idx });
        log('EVM: Shanghai');
        return;
      }
    }
  });

  await fill('Archivo .sol', async () => {
    const inputs = page.locator('input[type="file"]');
    const n = await inputs.count();
    for (let i = 0; i < n; i++) {
      try {
        await inputs.nth(i).setInputFiles(SOURCE_FILE);
        log('Archivo subido: TRC20TokenUpgradeable.sol');
        return;
      } catch {
        /* siguiente */
      }
    }
    log('No se pudo setInputFiles; sube el .sol manualmente desde: ' + PKG);
  });

  log('');
  log('En el navegador: revisa Compiler (0.8.25), Optimization Yes, Runs 200, License MIT, EVM Shanghai.');
  log('Completa reCAPTCHA y pulsa "Verify and Publish".');
  log('Si falla "confirm the correct parameters": TRONSCAN-POR-QUE-FALLA.txt → OKLink + Standard JSON.');

  const noWait = process.argv.includes('--no-wait') || process.env.TRONSCAN_SKIP_WAIT_ENTER === '1';
  if (noWait) {
    log('--no-wait: esperando 120s; cierra el navegador antes si ya terminaste.');
    await page.waitForTimeout(120000);
  } else if (process.stdin.isTTY) {
    log('Pulsa Enter aquí cuando termines…');
    await new Promise((resolve) => {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      rl.question('', () => { rl.close(); resolve(); });
    });
  } else {
    log('Sin TTY: esperando 120s.');
    await page.waitForTimeout(120000);
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
