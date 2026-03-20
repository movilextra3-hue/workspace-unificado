#!/usr/bin/env node
'use strict';
/* eslint-disable no-undef -- document/window only in page.evaluate() (browser context) */
/**
 * Verificación del contrato TYqRvxio... en Tronscan con resolución automática de CAPTCHA (2captcha).
 *
 * Requisitos:
 * - .env con CAPTCHA_2CAPTCHA_API_KEY (API key de https://2captcha.com, tiene coste por CAPTCHA).
 * - npm run prepare:verification ya ejecutado.
 *
 * Uso: npm run verify:tronscan:2captcha
 */
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const fs = require('node:fs');
const https = require('node:https');

const ROOT = path.join(__dirname, '..');
const VERIFICATION_DIR = path.join(ROOT, 'verification');
const SOURCE_FILE = path.resolve(VERIFICATION_DIR, 'TRC20TokenUpgradeable.sol');
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

const CAPTCHA_API_KEY = (process.env.CAPTCHA_2CAPTCHA_API_KEY || '').trim();

function postForm(url, params) {
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams(params).toString();
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) }
    };
    const req = (u.protocol === 'https:' ? https : require('node:http')).request(opts, (res) => {
      let d = '';
      res.on('data', (c) => { d += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch (e) { resolve({}); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function solveRecaptcha(sitekey, pageurl) {
  const inRes = await postForm('https://2captcha.com/in.php', {
    key: CAPTCHA_API_KEY,
    method: 'userrecaptcha',
    googlekey: sitekey,
    pageurl,
    json: 1
  });
  if (inRes.status !== 1 || !inRes.request) throw new Error(inRes.request || '2captcha in.php: ' + JSON.stringify(inRes));
  const taskId = inRes.request;
  for (let i = 0; i < 24; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const resRes = await postForm('https://2captcha.com/res.php', {
      key: CAPTCHA_API_KEY,
      action: 'get',
      id: taskId,
      json: 1
    });
    if (resRes.status === 1 && resRes.request) return resRes.request;
    if (resRes.request === 'CAPCHA_NOT_READY') continue;
    throw new Error(resRes.request || '2captcha res.php: ' + JSON.stringify(resRes));
  }
  throw new Error('2captcha timeout');
}

async function main() {
  if (!fs.existsSync(SOURCE_FILE)) {
    console.error('Ejecuta antes: npm run prepare:verification');
    process.exit(1);
  }
  if (!CAPTCHA_API_KEY) {
    console.error('Falta CAPTCHA_2CAPTCHA_API_KEY en .env. Obtén una en https://2captcha.com (tiene coste por CAPTCHA).');
    process.exit(1);
  }

  const playwright = require('playwright');
  console.log('Abriendo Tronscan y rellenando formulario...');

  const browser = await playwright.chromium.launch({ headless: process.env.HEADLESS === '1' });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  const fill = async (name, fn) => {
    try { await fn(); } catch (e) { console.warn('  (omitido:', name, ')', e.message); }
  };

  try {
    await page.goto(TRONSCAN_VERIFY_URL, { waitUntil: 'load', timeout: 25000 });
    await page.waitForTimeout(4000);
  } catch (e) {
    console.error('No se pudo cargar la página:', e.message);
    await browser.close();
    process.exit(1);
  }

  await fill('Contract Address', async () => {
    const el = page.locator('input[placeholder="Contract Address"]').first();
    await el.waitFor({ state: 'visible', timeout: 10000 });
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
      const idx = opts.findIndex((t) => /0\.8\.34|0\.8\.30|tronbox_soljson_v3/.test(t));
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
      try {
        await fileInputs.nth(i).setInputFiles(SOURCE_FILE);
        console.log('  Archivo subido.');
        return;
      } catch (_) { /* input no acepta archivo; intentar siguiente */ }
    }
    const btn = page.locator('button').filter({ hasText: /Upload|upload/ }).first();
    await btn.click();
    await page.waitForTimeout(2000);
    const inp = page.locator('input[type="file"]').first();
    if (await inp.count() > 0) await inp.setInputFiles(SOURCE_FILE);
  });

  await page.waitForTimeout(1000);

  const verifyBtn = page.locator('button').filter({ hasText: /Verify and Publish|Verify|verificar/i }).first();
  await verifyBtn.click().catch(() => { /* ignore */ });
  await page.waitForTimeout(3000);

  /* eslint-disable no-undef -- page.evaluate runs in browser; document/window exist */
  const sitekey = await page.evaluate(() => {
    const el = document.querySelector('[data-sitekey]');
    if (el) return el.getAttribute('data-sitekey');
    const iframe = document.querySelector('iframe[src*="recaptcha"]');
    if (iframe?.src) {
      const m = /[?&]k=([^&]+)/.exec(iframe.src);
      if (m) return m[1];
    }
    return null;
  }).catch(() => null);
  /* eslint-enable no-undef */

  if (!sitekey) {
    console.log('No se detectó reCAPTCHA en la página. Resuelve el CAPTCHA manualmente y envía el formulario.');
    if (process.env.HEADLESS !== '1') await page.waitForTimeout(300000);
    await browser.close();
    process.exit(0);
  }

  console.log('Resolviendo CAPTCHA con 2captcha...');
  let token;
  try {
    token = await solveRecaptcha(sitekey, TRONSCAN_VERIFY_URL);
  } catch (e) {
    console.error('Error 2captcha:', e.message);
    await browser.close();
    process.exit(1);
  }

  /* page.evaluate runs in browser; document/window exist there */
  /* eslint-disable no-undef */
  const injected = await page.evaluate((t) => {
    const textarea = document.querySelector('textarea[name="g-recaptcha-response"]');
    if (textarea) {
      textarea.value = t;
      textarea.style.display = 'block';
      return true;
    }
    const div = document.querySelector('.g-recaptcha');
    const cb = div?.getAttribute('data-callback');
    if (cb && typeof window[cb] === 'function') {
      window[cb](t);
      return true;
    }
    const all = document.querySelectorAll('iframe[src*="recaptcha"]');
    for (const f of all) {
      const wrap = f.closest('[data-callback]') || f.parentElement;
      const name = wrap?.getAttribute?.('data-callback');
      if (name && typeof window[name] === 'function') {
        window[name](t);
        return true;
      }
    }
    return false;
  }, token).catch(() => false);
  /* eslint-enable no-undef */

  if (injected) {
    console.log('Token inyectado. Enviando formulario...');
    await page.waitForTimeout(1500);
    await verifyBtn.click().catch(() => { /* ignore */ });
    await page.waitForTimeout(5000);
  }

  console.log('');
  console.log('Comprueba el resultado en el navegador o en: https://tronscan.org/#/contract/' + CONTRACT_ADDRESS);
  console.log('Para confirmar: npm run verify:contract:check');
  await page.waitForTimeout(10000);
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
