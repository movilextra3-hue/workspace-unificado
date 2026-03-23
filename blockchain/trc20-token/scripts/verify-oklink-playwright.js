/**
 * Verificación OKLink vía Playwright: rellena formulario completo y hace clic en Submit.
 * Flujo: paso 1 (address, compiler type Solidity(SingleFile), version 0.8.34) → Next → paso 2 (source) → Submit.
 * Requiere: playwright instalado. Uso: node scripts/verify-oklink-playwright.js [--step2]
 * NO ejecuta migraciones ni despliegues.
 * page.evaluate() ejecuta código en el navegador; window/document existen en ese contexto.
 */
'use strict';
/* global window, document */
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.join(__dirname, '..');
const SOURCE_FILE = path.join(ROOT, 'verification', 'TRC20TokenUpgradeable-oklink.sol');
const DEFAULT_URL = 'https://www.oklink.com/tron/verify-contract-preliminary';
const STEP2_URL = 'https://www.oklink.com/tron/verify-contract-sourcecode-sol-single#address=' + encodeURIComponent('TYqRvxioNWBqVa2nJGog8RkYQrXQdPJwR3') + '&edition=v0.8.34%2Bcommit.80d5c536&zk-version=';
const IMPL_ADDRESS = 'TYqRvxioNWBqVa2nJGog8RkYQrXQdPJwR3';
const MAIN_CONTRACT = 'TRC20TokenUpgradeable';

function log(msg) { console.log('[verify-oklink-playwright] ' + msg); }

async function main() {
  let playwright;
  try { playwright = require('playwright'); } catch (e) {
    log('Playwright no está instalado.'); process.exit(1);
  }
  if (!fs.existsSync(SOURCE_FILE)) {
    log('No existe: verification/TRC20TokenUpgradeable-oklink.sol'); process.exit(1);
  }
  const sourceCode = fs.readFileSync(SOURCE_FILE, 'utf8');
  const useStep2 = process.argv.includes('--step2');
  const url = useStep2 ? STEP2_URL : (process.argv.includes('--url') ? process.argv[process.argv.indexOf('--url') + 1] || DEFAULT_URL : DEFAULT_URL);
  log('Navegando a: ' + (useStep2 ? 'paso 2 directo' : url));
  const browser = await playwright.chromium.launch({ headless: false });
  const page = await (await browser.newContext()).newPage();
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  } catch (e) {
    log('Error: ' + e.message); await browser.close(); process.exit(1);
  }
  await page.waitForTimeout(useStep2 ? 3000 : 2000);

  // --- Forzar TRON: OKLink puede mostrar Solana u otra red por defecto. Seleccionar TRON explícitamente. ---
  const tronSelectors = [
    'a[href*="/tron/"]',
    '[data-chain="tron"]',
    'button:has-text("TRON")',
    'a:has-text("TRON")',
    'span:has-text("TRON")',
    '[aria-label*="TRON"]',
  ];
  for (const sel of tronSelectors) {
    try {
      const el = page.locator(sel).first();
      if (await el.count() > 0 && await el.isVisible().catch(() => false)) {
        await el.click({ timeout: 3000, force: true }).catch(() => {});
        log('TRON seleccionado en selector de red.');
        await page.waitForTimeout(1500);
        break;
      }
    } catch (_) { /* selector no encontrado o no visible; continuar con siguiente */ }
  }
  // Si la URL ya es /tron/, la página es correcta. Re-navegar por si el DOM mostró otra red.
  const currentUrl = page.url();
  if (!currentUrl.includes('/tron/') && !currentUrl.includes('tron')) {
    log('URL no contiene tron. Re-navegando a TRON.');
    await page.goto(DEFAULT_URL, { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(2000);
  }

  if (useStep2) {
    log('Modo --step2: rellenando código, Optimization Sí, License MIT, Enviar (página en español).');
  } else {
  // --- Paso 1: dirección (página en español: placeholder puede ser "Ingresar" o "Enter") ---
  const addrInputs = page.locator('input[placeholder*="Enter"], input[placeholder*="Ingresar"], input[placeholder*="Introducir"]');
  const nAddr = await addrInputs.count();
  const addrInp = nAddr >= 2 ? addrInputs.nth(1) : addrInputs.first();
  if (nAddr > 0) {
    await addrInp.fill('');
    await addrInp.fill(IMPL_ADDRESS);
    log('Dirección: ' + IMPL_ADDRESS);
  }
  await page.waitForTimeout(800);

  // --- Compiler type: Solidity(SingleFile) ---
  const combos = page.getByRole('combobox');
  const nCombos = await combos.count();
  if (nCombos >= 1) {
    await combos.first().click();
    await page.waitForTimeout(600);
    const optSingle = page.getByRole('option', { name: /Solidity\(SingleFile\)/ });
    if (await optSingle.count() > 0) {
      await optSingle.first().click();
      log('Compiler type: Solidity(SingleFile)');
    } else {
      await page.keyboard.press('Escape');
    }
    await page.waitForTimeout(1200);
  }

  // --- Compiler version: 0.8.34 ---
  if (nCombos >= 2) {
    await combos.nth(1).click();
    await page.waitForTimeout(800);
    const v034 = page.getByRole('option').filter({ hasText: /0\.8\.34|v0\.8\.34/ });
    if (await v034.count() > 0) {
      await v034.first().click();
      log('Compiler: 0.8.34');
    } else {
      await page.keyboard.press('Escape');
      log('0.8.34 no hallado; probando siguiente versión disponible.');
      await combos.nth(1).click();
      await page.waitForTimeout(500);
      const anyOpt = page.getByRole('option').first();
      if (await anyOpt.count() > 0) await anyOpt.click();
    }
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(500);

  // --- Clic Next/Siguiente (página en español usa "Siguiente") ---
  const nextBtn = page.getByRole('button', { name: /Next|Siguiente/i });
  let nextClicked = false;
  for (let i = 0; i < 25; i++) {
    const enabled = await nextBtn.isEnabled().catch(() => false);
    if (enabled) {
      await nextBtn.scrollIntoViewIfNeeded().catch(() => {});
      await nextBtn.click();
      log('Clic Next/Siguiente');
      nextClicked = true;
      break;
    }
    await page.waitForTimeout(500);
  }
  if (!nextClicked) log('Next/Siguiente no se habilitó; buscando textarea directamente...');
  await page.waitForTimeout(2500);
  }

  // --- Paso 2: código fuente ---
  if (useStep2) await page.evaluate(() => window.scrollBy(0, 400));
  const textareaSels = [
    'textarea[placeholder*="Please type" i]',
    'textarea[placeholder*="source" i]',
    'textarea[placeholder*="code" i]',
    'textarea[placeholder*="paste" i]',
    'textarea[name*="source" i]',
    'textarea',
  ];
  let filled = false;
  for (const sel of textareaSels) {
    try {
      const loc = page.locator(sel);
      const n = await loc.count();
      if (n > 0) {
        const el = loc.first();
        const b = await el.boundingBox().catch(() => null);
        if (b && b.height > 60) {
          await el.fill('');
          await el.fill(sourceCode);
      filled = true;
      log('Código pegado');
      break;
        }
      }
    } catch (_) { /* textarea no accesible; intentar siguiente selector */ }
  }
  if (!filled) {
    log('No textarea. Scroll y reintento...');
    await page.evaluate(() => window.scrollBy(0, 600));
    await page.waitForTimeout(1000);
    const ta = page.locator('textarea').first();
    if (await ta.count() > 0) {
      await ta.fill(sourceCode);
      filled = true;
    }
  }
  if (!filled) {
    log('No se encontró textarea. Navegador abierto 60s.');
    await page.waitForTimeout(60000);
    await browser.close();
    process.exit(1);
  }
  await page.waitForTimeout(800);

  // --- Main Contract (español: "Contrato principal", "Nombre del contrato"; inglés: "main contract") ---
  const allInputs = page.locator('input:not([type="hidden"])');
  const nInputs = await allInputs.count();
  for (let i = 0; i < nInputs; i++) {
    const el = allInputs.nth(i);
    const ph = (await el.getAttribute('placeholder').catch(() => '')) || '';
    const name = (await el.getAttribute('name').catch(() => '')) || '';
    const label = (await el.evaluate(e => e.closest('label')?.textContent || e.getAttribute('aria-label') || '').catch(() => '')) || '';
    const combined = ph + ' ' + name + ' ' + label;
    if (/address|dirección|enter|ingresar|introducir/i.test(combined)) continue; // no sobrescribir dirección
    if (/main\s*contract|contract\s*name|contrato\s*principal|nombre\s*contrato|contrato principal/i.test(combined)) {
      await el.scrollIntoViewIfNeeded().catch(() => {});
      await el.fill(MAIN_CONTRACT);
      log('Main Contract: ' + MAIN_CONTRACT);
      break;
    }
  }
  await page.waitForTimeout(400);

  // --- Optimization Runs: input numérico 200 (si existe) ---
  const runsInputs = page.locator('input[type="number"], input[min][max]');
  const nRuns = await runsInputs.count();
  for (let i = 0; i < Math.min(nRuns, 5); i++) {
    const inp = runsInputs.nth(i);
    const ph = await inp.getAttribute('placeholder').catch(() => '') || '';
    const name = await inp.getAttribute('name').catch(() => '') || '';
    if (/run|optim/i.test(ph + name) || (await inp.getAttribute('min') && await inp.getAttribute('max'))) {
      await inp.fill('200');
      log('Runs: 200');
      break;
    }
  }
  await page.waitForTimeout(300);

  /** Selecciona en un combo por índice. Scroll, click con force, elegir opción por regex. */
  async function selectComboByIndex(idx, optionRegex, label) {
    const combos = page.getByRole('combobox');
    if (await combos.count() <= idx) return false;
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
    const combo = combos.nth(idx);
    await combo.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await combo.click({ force: true });
    await page.waitForTimeout(1000);
    const opts = page.getByRole('option').filter({ hasText: optionRegex });
    if (await opts.count() > 0) {
      await opts.first().click({ force: true });
      log(label);
      await page.waitForTimeout(500);
      return true;
    }
    await page.keyboard.press('Escape');
    return false;
  }

  // --- Combos OKLink (página puede estar en ESPAÑOL: Sí, Licencia MIT, predeterminado, Enviar) ---
  // Parámetros correctos: Optimization Yes/Sí, Via IR No, License MIT, EVM default/predeterminado
  const allCombos = page.getByRole('combobox');
  const nCombos = await allCombos.count();
  log('Combos encontrados: ' + nCombos);

  const step2ComboStart = useStep2 ? 0 : 2;
  const comboSpecs = [
    { idx: step2ComboStart + 0, regex: /^Yes$|^Sí$|optimization\s*yes|optimizar.*sí/i, label: '1/4 Optimization: Yes/Sí' },
    { idx: step2ComboStart + 1, regex: /^No$/i, label: '2/4 Via IR: No' },
    { idx: step2ComboStart + 2, regex: /MIT License\s*\(MIT\)|Licencia MIT\s*\(MIT\)|MIT\s*\(MIT\)/i, label: '3/4 License: MIT (EN/ES)' },
    { idx: step2ComboStart + 3, regex: /default|predeterminado|por defecto/i, label: '4/4 EVM: default/predeterminado' },
  ];

  for (const spec of comboSpecs) {
    if (spec.idx < nCombos) {
      if (spec.idx >= 2) await page.evaluate(() => window.scrollBy(0, 500)); // License y EVM están abajo
      try {
        await selectComboByIndex(spec.idx, spec.regex, spec.label);
      } catch (e) {
        log('Combo ' + spec.idx + ': ' + e.message);
      }
    }
  }

  // Asegurar License MIT (obligatorio): español "Licencia MIT (MIT)" o inglés "MIT License (MIT)"
  if (nCombos > step2ComboStart + 2) {
    await page.evaluate(() => window.scrollBy(0, 600));
    await page.waitForTimeout(500);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    const licCombo = allCombos.nth(step2ComboStart + 2);
    await licCombo.scrollIntoViewIfNeeded();
    await licCombo.click({ force: true });
    await page.waitForTimeout(1200);
    const optMIT = page.getByRole('option').filter({ hasText: /MIT License\s*\(MIT\)|Licencia MIT\s*\(MIT\)|MIT\s*\(MIT\)/i });
    if (await optMIT.count() > 0) {
      await optMIT.first().click({ force: true });
      log('3/4 License: MIT confirmado (EN/ES)');
    } else {
      const optMIT2 = page.getByRole('option').filter({ hasText: /MIT/i });
      if (await optMIT2.count() > 0) { await optMIT2.first().click({ force: true }); log('3/4 License: MIT (alternativo)'); }
    }
    await page.waitForTimeout(400);
  }

  // Asegurar Optimization Yes/Sí si el combo 0 no lo seleccionó (página en español usa "Sí")
  if (nCombos > step2ComboStart) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    const optCombo = allCombos.nth(step2ComboStart);
    await optCombo.scrollIntoViewIfNeeded();
    await optCombo.click({ force: true });
    await page.waitForTimeout(800);
    const optYes = page.getByRole('option').filter({ hasText: /^Yes$|^Sí$/i });
    if (await optYes.count() > 0) { await optYes.first().click({ force: true }); log('1/4 Optimization Yes/Sí: confirmado'); }
    await page.waitForTimeout(300);
  }

  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  await page.evaluate(() => window.scrollBy(0, 400));
  await page.waitForTimeout(400);

  // OKLink TRON — verificación: sin CAPTCHA en el flujo real usado por el proyecto (no reCAPTCHA en pantalla).

  // --- Submit: todas las estrategias posibles ---
  let submitted = false;
  await page.evaluate(() => window.scrollBy(0, 500));
  await page.waitForTimeout(800);

  const submitBtn = page.locator('button').filter({ hasText: /enviar|submit|verificar/i }).first();
  if (await submitBtn.count() > 0) {
    await submitBtn.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await submitBtn.click({ force: true, timeout: 5000 });
    submitted = true;
    log('Submit realizado.');
  }
  if (!submitted) {
    const submitStrategies = [
      async () => { const b = page.getByRole('button', { name: /enviar|submit|verificar/i }); if (await b.count() > 0) { await b.first().scrollIntoViewIfNeeded(); await b.first().click({ force: true }); return true; } return false; },
      async () => page.evaluate(() => { const btns = [...document.querySelectorAll('button, [role="button"]')]; const sub = btns.find(b => /enviar|submit|verificar/i.test(b.textContent || '')); if (sub) { sub.scrollIntoView(); sub.click(); return true; } return false; }),
    ];
    for (let i = 0; i < submitStrategies.length && !submitted; i++) {
      try {
        submitted = await submitStrategies[i]();
        if (submitted) log('Submit realizado (estrategia ' + (i + 1) + ')');
      } catch (_) { /* estrategia falló; intentar siguiente */ }
    }
  }
  if (submitted) {
    log('Submit realizado. Esperando 5 minutos para que OKLink procese.');
    await page.waitForTimeout(300000);
    await page.goto('https://www.oklink.com/tron/address/' + IMPL_ADDRESS, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(5000);
    const bodyText = (await page.textContent('body').catch(() => '')) || '';
    const lower = bodyText.toLowerCase();
    if (/\bverified\b|verificado\b|verification successful|successfully verified/i.test(lower)) {
      log('RESULTADO: Verificación exitosa detectada.');
    } else if (/fail|error|bytecode mismatch|invalid contract/i.test(lower)) {
      log('RESULTADO: Posible fallo. Texto relevante: ' + bodyText.slice(0, 500).replace(/\s+/g, ' '));
    } else {
      log('RESULTADO: Sin mensaje claro. Comprobar captura y OKLink.');
    }
    try {
      const shotDir = path.join(ROOT, 'docs', 'vitacora', 'trc20-token');
      if (!fs.existsSync(shotDir)) fs.mkdirSync(shotDir, { recursive: true });
      const shotPath = path.join(shotDir, 'oklink-verification-result.png');
      await page.screenshot({ path: shotPath, fullPage: true });
      log('Captura guardada: ' + shotPath);
      fs.writeFileSync(path.join(shotDir, 'oklink-page-text.txt'), bodyText.slice(0, 3000), 'utf8');
    } catch (_) { /* captura/escritura opcional; continuar */ }
  } else {
    log('Submit no encontrado. Capturando pantalla...');
    try {
      const shotDir = path.join(ROOT, 'docs', 'vitacora', 'trc20-token');
      if (!fs.existsSync(shotDir)) fs.mkdirSync(shotDir, { recursive: true });
      await page.screenshot({ path: path.join(shotDir, 'oklink-paso2-sin-submit.png'), fullPage: true });
    } catch (_) { /* captura opcional; continuar */ }
    log('Esperando 60s para clic manual.');
    await page.waitForTimeout(60000);
  }
  await browser.close();
  log('Listo.');
}

main().catch(e => { log('Error: ' + e.message); process.exit(1); });
