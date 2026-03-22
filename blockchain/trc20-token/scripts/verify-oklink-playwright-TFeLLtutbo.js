#!/usr/bin/env node
'use strict';
/**
 * Verificación TFeLLtutbo en OKLink vía Playwright.
 * Flujo alineado con verify-oklink-playwright.js (legacy): red TRON, dirección en el formulario
 * (no el buscador global), paso 1 → Next (espera a habilitarse) → paso 2: JSON + Main contract
 * + Optimization / Via IR / License / EVM como exige OKLink.
 * Standard JSON con metadata.bytecodeHash:none (trc20-networks.js).
 * Ref: https://www.oklink.com/tron/verify-contract-preliminary
 *
 * Uso: node scripts/verify-oklink-playwright-TFeLLtutbo.js
 *      npm run verify:oklink:playwright
 *
 * Envío automático (completa verificación sin pulsar Submit a mano):
 *   npm run verify:oklink:playwright:submit
 *   o: node scripts/verify-oklink-playwright-TFeLLtutbo.js --submit
 *   OKLINK_HEADLESS=1 — navegador sin ventana (p. ej. CI); si OKLink bloquea, probar sin headless.
 *
 * Variable opcional: OKLINK_STEP2_COMBO_OFFSET — salto sobre combobox VISIBLES del paso 2 en <main>
 * (p. ej. 2 si delante hay otros desplegables visibles antes de Optimization).
 *
 * UI en español (OKLink): las opciones suelen ser "Sí"/"No", "Licencia MIT (MIT)", "predeterminado"/"Shanghai".
 * El script prueba patrones EN+ES en cada desplegable (Standard JSON, combos paso 2).
 */
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const { loadImplementationAddress } = require(path.join(__dirname, 'lib', 'implementation-address.js'));
const { attachOklinkNetworkDebug } = require(path.join(__dirname, 'lib', 'oklink-network-debug.js'));

const ROOT = path.join(__dirname, '..');
const PKG = path.join(ROOT, 'verification', 'PAQUETE-VERIFICACION-POST-UPGRADE');
const STD_JSON = path.join(PKG, 'standard-input-TFeLLtutbo.json');
const STD_JSON_OKLINK = path.join(PKG, 'standard-input-TFeLLtutbo-oklink.json');
const STD_JSON_OKLINK_EVM_EMPTY = path.join(PKG, 'standard-input-TFeLLtutbo-oklink-evm-empty.json');
const ADDR = loadImplementationAddress();
const URL = 'https://www.oklink.com/tron/verify-contract-preliminary';
const MAIN_CONTRACT = 'TRC20TokenUpgradeable';

function log(msg) {
  console.log('[verify-oklink-TFeLLtutbo] ' + msg);
}

/**
 * Contenedor del formulario de verificación (NO toda la página).
 * Si usamos page.getByRole('combobox'), se incluyen desplegables del header/nav y el orden nth() queda mal.
 * @param {import('playwright').Page} page
 * @param {import('playwright').Locator | null} anchorInput input de dirección o textarea del paso 2
 */
async function getVerifyFormRoot(page, anchorInput) {
  if (anchorInput && (await anchorInput.count()) > 0) {
    const formAnc = anchorInput.locator('xpath=ancestor::form[1]');
    if (await formAnc.count()) {
      log('Ámbito formulario: ancestro <form> del campo (solo combos de verificación).');
      return formAnc;
    }
    const mainAnc = anchorInput.locator('xpath=ancestor::main[1]');
    if (await mainAnc.count()) {
      log('Ámbito formulario: ancestro <main> del campo.');
      return mainAnc;
    }
  }
  const main = page.locator('main').first();
  if (await main.count()) {
    log('Ámbito formulario: <main> (sin <form> en ancestro del anchor).');
    return main;
  }
  log('Ámbito formulario: body (fallback; revisar manualmente si los combos fallan).');
  return page.locator('body');
}

/**
 * En OKLink el paso 1 puede seguir en el DOM oculto; nth(0) mezcla combos viejos y nuevos.
 * @param {import('playwright').Locator} scope
 * @param {number} visibleIndex 0 = primer combobox visible en scope
 */
async function nthVisibleCombobox(scope, visibleIndex) {
  const all = scope.getByRole('combobox');
  const count = await all.count();
  let seen = -1;
  for (let i = 0; i < count; i++) {
    const box = all.nth(i);
    if (await box.isVisible().catch(() => false)) {
      seen += 1;
      if (seen === visibleIndex) return box;
    }
  }
  return null;
}

async function countVisibleComboboxes(scope) {
  const all = scope.getByRole('combobox');
  const count = await all.count();
  let n = 0;
  for (let i = 0; i < count; i++) {
    if (await all.nth(i).isVisible().catch(() => false)) n += 1;
  }
  return n;
}

/**
 * Pulsa el botón de envío del paso 2 (evita el primer "Verify" genérico de la cabecera).
 * @param {import('playwright').Page} page
 * @param {(msg: string) => void} logFn
 * @returns {Promise<boolean>}
 */
async function trySubmitVerification(page, logFn) {
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(600);

  const main = page.locator('main').first();
  const scope = (await main.count()) > 0 ? main : page;

  const formWithJson = scope.locator('form:has(textarea)').first();
  const hasForm = (await formWithJson.count()) > 0;

  const tryClick = async (loc, reason) => {
    if ((await loc.count()) === 0) return false;
    const b = loc.first();
    if (!(await b.isVisible().catch(() => false))) return false;
    await b.scrollIntoViewIfNeeded().catch(() => {});
    await b.click({ timeout: 20000, force: true }).catch(() => {});
    logFn('Submit pulsado (' + reason + ').');
    return true;
  };

  if (hasForm) {
    if (await tryClick(formWithJson.locator('button[type="submit"]'), 'form+textarea type=submit')) return true;
    if (await tryClick(
      formWithJson.getByRole('button', { name: /submit|enviar|confirmar/i }),
      'form+textarea nombre Submit/Enviar'
    )) return true;
    if (await tryClick(
      formWithJson.getByRole('button', { name: /verify\s+and\s+publish|verificar\s+y\s+publicar/i }),
      'form+textarea Verify and Publish'
    )) return true;
    if (await tryClick(
      formWithJson.getByRole('button', { name: /^Verificar$/i }),
      'form+textarea Verificar'
    )) return true;
    if (await tryClick(
      formWithJson.getByRole('button', { name: /^Verify$/i }),
      'form+textarea Verify (último recurso en formulario)'
    )) return true;
  }

  const ordered = [
    scope.getByRole('button', { name: /submit|enviar/i }),
    scope.getByRole('button', { name: /verify\s+and\s+publish|verificar\s+y\s+publicar/i }),
    scope.getByRole('button', { name: /^Confirmar$/i })
  ];
  for (let i = 0; i < ordered.length; i++) {
    const loc = ordered[i];
    if ((await loc.count()) === 0) continue;
    const last = await loc.last();
    if (await last.isVisible().catch(() => false)) {
      await last.scrollIntoViewIfNeeded().catch(() => {});
      await last.click({ timeout: 20000, force: true }).catch(() => {});
      logFn('Submit pulsado (patrón main, prioridad ' + i + ').');
      return true;
    }
  }

  // OKLink a veces no envuelve el textarea en <form>; recorrer controles de abajo arriba en <main>.
  const mainBtns = scope.locator('button, [role="button"]');
  const btnCount = await mainBtns.count();
  for (let i = btnCount - 1; i >= 0; i--) {
    const b = mainBtns.nth(i);
    if (!(await b.isVisible().catch(() => false))) continue;
    const t = ((await b.textContent().catch(() => '')) || '').trim();
    if (!t) continue;
    if (
      /^(Submit|Enviar|Verificar|Confirmar)$/i.test(t) ||
      /verify\s+and\s+publish|verificar\s+y\s+publicar/i.test(t)
    ) {
      await b.scrollIntoViewIfNeeded().catch(() => {});
      await b.click({ timeout: 20000, force: true }).catch(() => {});
      logFn('Submit pulsado (botón en main, de abajo arriba): ' + t.slice(0, 60));
      return true;
    }
  }

  // Botones fuera de <main> (footer fijo) o etiquetas largas con Submit/Enviar.
  const pageWide = page.locator('button, [role="button"]').filter({
    hasText: /submit|enviar|提交|verify|verificar|publicar|confirm/i
  });
  const nw = await pageWide.count();
  if (nw > 0) {
    const pick = pageWide.last();
    if (await pick.isVisible().catch(() => false)) {
      await pick.scrollIntoViewIfNeeded().catch(() => {});
      await pick.click({ timeout: 20000, force: true }).catch(() => {});
      logFn('Submit pulsado (último control coincidente en página, n=' + nw + ').');
      return true;
    }
  }

  logFn('No se localizó botón de envío (revisar paso 2 visible o anti-bot OKLink).');
  return false;
}

async function main() {
  let playwright;
  try {
    playwright = require('playwright');
  } catch (e) {
    log('Playwright no instalado. npm install playwright');
    process.exit(1);
  }

  // Por defecto: oklink.json (sin evmVersion). Solo evm-empty si OKLINK_JSON_VARIANT=evm-empty
  let jsonPath = STD_JSON;
  if (process.env.OKLINK_JSON_VARIANT === 'evm-empty' && fs.existsSync(STD_JSON_OKLINK_EVM_EMPTY)) {
    jsonPath = STD_JSON_OKLINK_EVM_EMPTY;
  } else if (fs.existsSync(STD_JSON_OKLINK)) {
    jsonPath = STD_JSON_OKLINK;
  } else if (fs.existsSync(STD_JSON_OKLINK_EVM_EMPTY)) {
    jsonPath = STD_JSON_OKLINK_EVM_EMPTY;
  }
  if (!fs.existsSync(jsonPath)) {
    log('Ejecutar: npm run generate:standard-input:oklink');
    process.exit(1);
  }

  const standardJson = fs.readFileSync(jsonPath, 'utf8');
  const jsonPathResolved = path.resolve(jsonPath);
  if (jsonPath === STD_JSON_OKLINK_EVM_EMPTY) log('Usando standard-input-TFeLLtutbo-oklink-evm-empty.json (evmVersion: "")');
  else if (jsonPath === STD_JSON_OKLINK) log('Usando standard-input-TFeLLtutbo-oklink.json (sin evmVersion)');

  const step2ComboOffset = Number.parseInt(process.env.OKLINK_STEP2_COMBO_OFFSET || '0', 10) || 0;
  const headless =
    process.argv.includes('--headless') ||
    process.env.OKLINK_HEADLESS === '1' ||
    process.env.OKLINK_HEADLESS === 'true';
  const autoSubmit =
    process.argv.includes('--submit') || process.env.OKLINK_AUTO_SUBMIT === '1';

  log('Implementation (deploy-info / abi/addresses): ' + ADDR);
  log(
    'Abriendo OKLink (headless: ' +
      headless +
      (autoSubmit ? '; modo --submit: envío automático' : '') +
      '). La verificación puede tardar varios minutos tras enviar.'
  );
  const browser = await playwright.chromium.launch({ headless });
  const context = await browser.newContext();
  const page = await context.newPage();
  const logPath = path.join(PKG, 'oklink-last-submit-debug.log');
  const oklinkDebug = attachOklinkNetworkDebug(page, logPath, { overwrite: true });

  try {
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2000);

    // Forzar TRON (legacy: la página puede abrir otra red)
    const tronSelectors = [
      'a[href*="/tron/"]',
      '[data-chain="tron"]',
      'button:has-text("TRON")',
      'a:has-text("TRON")',
      'span:has-text("TRON")',
      '[aria-label*="TRON"]'
    ];
    for (const sel of tronSelectors) {
      try {
        const el = page.locator(sel).first();
        if (await el.count() > 0 && await el.isVisible().catch(() => false)) {
          await el.click({ timeout: 3000, force: true }).catch(() => {});
          log('Red TRON seleccionada explícitamente.');
          await page.waitForTimeout(1500);
          break;
        }
      } catch (_) { /* siguiente */ }
    }
    const currentUrl = page.url();
    if (!currentUrl.includes('/tron/') && !currentUrl.includes('tron')) {
      await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(2000);
    }

    // 1) Dirección: preferir input dentro del formulario de verificación (evita el buscador global)
    const formScoped = page.locator('form').first().locator(
      'input[placeholder*="Enter" i], input[placeholder*="Ingresar" i], input[placeholder*="Introducir" i], input[placeholder*="address" i], input[placeholder*="Address" i], input[placeholder*="dirección" i], input[placeholder*="Dirección" i], input[placeholder*="contrato" i]'
    );
    let addrInp = null;
    if (await formScoped.count() > 0) {
      addrInp = formScoped.first();
      log('Dirección: campo dentro de <form> (evita buscador global).');
    } else {
      const addrInputs = page.locator(
        'input[placeholder*="Enter" i], input[placeholder*="Ingresar" i], input[placeholder*="Introducir" i], input[placeholder*="address" i], input[placeholder*="Address" i], input[placeholder*="dirección" i], input[placeholder*="Dirección" i], input[placeholder*="contrato" i]'
      );
      const nAddr = await addrInputs.count();
      addrInp = nAddr > 0 ? addrInputs.first() : null;
      if (nAddr > 0) log('Dirección: primer input coincidente (si falla, rellenar a mano o OKLINK_ADDR manual).');
    }
    if (addrInp) {
      await addrInp.scrollIntoViewIfNeeded().catch(() => {});
      await addrInp.fill('');
      await addrInp.fill(ADDR);
      log('Address: ' + ADDR);
    } else {
      log('No se encontró input de dirección; rellena la dirección a mano.');
    }
    await page.waitForTimeout(800);

    // El header de OKLink puede interceptar clics si el formulario queda bajo la barra fija
    await page.evaluate(() => window.scrollBy(0, 420));
    await page.waitForTimeout(400);

    let verifyRootStep1 = await getVerifyFormRoot(page, addrInp);
    const mainStep1 = page.locator('main').first();
    if (await mainStep1.count() > 0) {
      const nFormCombos = await verifyRootStep1.getByRole('combobox').count();
      const nMainCombos = await mainStep1.getByRole('combobox').count();
      if (nMainCombos >= 2 && nFormCombos < 2) {
        verifyRootStep1 = mainStep1;
        log('Paso 1: combos en <main> (el <form> del address no los contiene; evita nth incorrecto).');
      }
    }
    const combos = verifyRootStep1.getByRole('combobox');
    const nCombos = await combos.count();
    log('Combos en paso 1 (solo formulario verificación): ' + nCombos);

    // 2) Primer dropdown = Standard JSON Input (OKLink EN muestra "Solidity(StandardJsonInput)")
    if (nCombos >= 1) {
      await combos.first().scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await combos.first().click({ force: true });
      await page.waitForTimeout(600);
      // EN: Standard JSON Input | ES: Entrada JSON estándar | UI OKLink: Solidity(StandardJsonInput)
      const stdOptionPatterns = [
        /Solidity\s*\(\s*StandardJsonInput\s*\)|StandardJsonInput/i,
        /Standard\s*JSON|JSON\s*Input/i,
        /entrada.*json|json.*entrada/i,
        /json.*estándar|json.*estandar/i,
        /solidity.*json|entrada.*estándar|entrada.*estandar/i
      ];
      let pickedStd = false;
      for (const pat of stdOptionPatterns) {
        const optStd = page.getByRole('option').filter({ hasText: pat });
        if (await optStd.count() > 0) {
          await optStd.first().click({ force: true });
          log('Compiler type: Standard JSON Input (EN/ES)');
          pickedStd = true;
          break;
        }
      }
      if (!pickedStd) await page.keyboard.press('Escape');
      await page.waitForTimeout(800);
    }

    // 3) Segundo dropdown = 0.8.25 (mismo ámbito que paso 1, no mezclar con header)
    const combosAfter = verifyRootStep1.getByRole('combobox');
    const n2 = await combosAfter.count();
    if (n2 >= 2) {
      await combosAfter.nth(1).scrollIntoViewIfNeeded();
      await combosAfter.nth(1).click({ force: true });
      await page.waitForTimeout(400);
      try {
        await page.waitForSelector(
          '[role="listbox"], [role="menu"], [data-radix-collection-item], .rc-virtual-list',
          { timeout: 8000 }
        );
      } catch {
        /* UI puede no usar estos roles; seguir con intentos de clic */
      }
      await page.waitForTimeout(600);
      let picked025 = false;
      const tryClick025 = async () => {
        const locators = [
          page.getByRole('option').filter({ hasText: /0\.8\.25|v0\.8\.25/i }),
          page.locator('[role="option"]').filter({ hasText: /0\.8\.25/i }),
          page.locator('[role="menuitem"]').filter({ hasText: /0\.8\.25/i }),
          page.locator('li[role="option"], div[role="option"]').filter({ hasText: /0\.8\.25/i }),
          page.getByText(/v?0\.8\.25\+commit|v?0\.8\.25\b/i)
        ];
        for (const loc of locators) {
          try {
            const n = await loc.count();
            if (n > 0) {
              const el = loc.first();
              await el.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
              await el.click({ force: true, timeout: 5000 });
              return true;
            }
          } catch {
            /* siguiente selector */
          }
        }
        return false;
      };
      picked025 = await tryClick025();
      if (!picked025) {
        await page.keyboard.type('0.8.25', { delay: 80 });
        await page.waitForTimeout(800);
        picked025 = await tryClick025();
      }
      if (!picked025) {
        const loose = page.locator('div, span, li').filter({ hasText: /^v?0\.8\.25/i });
        try {
          if (await loose.count() > 0) {
            await loose.first().click({ force: true, timeout: 4000 });
            picked025 = true;
          }
        } catch {
          /* ignore */
        }
      }
      if (picked025) {
        log('Compiler version: 0.8.25');
      } else {
        await page.keyboard.press('Escape');
        log('No se encontró 0.8.25 en el desplegable; elige 0.8.25 a mano.');
      }
      await page.waitForTimeout(500);
    }

    // 4) Next: solo dentro del mismo ámbito que dirección + combos (no barra global)
    const nextBtn = verifyRootStep1.getByRole('button', { name: /Next|Siguiente/i }).first();
    let nextClicked = false;
    for (let i = 0; i < 40; i++) {
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
    if (!nextClicked) {
      log('Next no se habilitó; fallback: URL directa al paso 2 (edition 0.8.25 + type=json).');
      const step2Direct =
        'https://www.oklink.com/tron/verify-contract-sourcecode-sol-single#' +
        'address=' +
        encodeURIComponent(ADDR) +
        '&edition=' +
        encodeURIComponent('v0.8.25+commit.b61c2a91') +
        '&zk-version=&type=json';
      await page.goto(step2Direct, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await page.waitForSelector('textarea', { timeout: 90000 }).catch(() => {
        log('Aviso: no apareció textarea en 90s tras paso 2; la página puede haber cambiado.');
      });
      await page.waitForTimeout(5000);
    }
    await page.waitForTimeout(2000);

    // Paso 2: los combos suelen estar en <main> junto al JSON, no siempre en el mismo <form> que el textarea
    let verifyRootStep2 = page.locator('main').first();
    if (await verifyRootStep2.count() === 0) {
      const ta = page.locator('textarea').first();
      verifyRootStep2 = await getVerifyFormRoot(page, (await ta.count()) > 0 ? ta : null);
    } else {
      log('Paso 2: ámbito <main> para JSON + combos (evita form demasiado estrecho).');
    }

    // 5) Paso 2: JSON (archivo preferido; textarea grande)
    const fileInput = verifyRootStep2.locator('input[type="file"]');
    if (await fileInput.count() > 0 && await fileInput.first().isVisible().catch(() => false)) {
      await fileInput.first().setInputFiles(jsonPathResolved);
      log('JSON subido (archivo)');
    } else {
      const textareaSels = [
        'textarea[placeholder*="Please" i]',
        'textarea[placeholder*="source" i]',
        'textarea[placeholder*="code" i]',
        'textarea[placeholder*="paste" i]',
        'textarea[placeholder*="código" i]',
        'textarea[placeholder*="pegar" i]',
        'textarea[placeholder*="Introduzca" i]',
        'textarea[placeholder*="fuente" i]',
        'textarea'
      ];
      let filled = false;
      for (const sel of textareaSels) {
        const loc = verifyRootStep2.locator(sel);
        const n = await loc.count();
        if (n > 0) {
          const el = loc.first();
          const b = await el.boundingBox().catch(() => null);
          if (b && b.height > 8) {
            await el.fill(standardJson);
            log('JSON pegado en textarea');
            filled = true;
            break;
          }
        }
      }
      if (!filled) {
        const ta = verifyRootStep2.locator('textarea').first();
        if (await ta.count() > 0) {
          await ta.fill(standardJson);
          log('JSON pegado (primer textarea)');
          filled = true;
        }
      }
      if (!filled) {
        const taPage = page.locator('main textarea').first();
        if (await taPage.count() > 0) {
          await taPage.fill(standardJson);
          log('JSON pegado (main textarea, fallback página)');
        } else {
          log('ERROR: no se encontró textarea para el Standard JSON; revisa OKLink o ejecuta sin headless.');
        }
      }
    }
    await page.waitForTimeout(1000);

    // 6) Main contract (solo inputs dentro del mismo bloque que el JSON)
    const allInputs = verifyRootStep2.locator('input:not([type="hidden"])');
    const nInputs = await allInputs.count();
    for (let i = 0; i < nInputs; i++) {
      const el = allInputs.nth(i);
      const ph = (await el.getAttribute('placeholder').catch(() => '')) || '';
      const name = (await el.getAttribute('name').catch(() => '')) || '';
      const label = (await el.evaluate(e => e.closest('label')?.textContent || e.getAttribute('aria-label') || '').catch(() => '')) || '';
      const combined = ph + ' ' + name + ' ' + label;
      if (/address|dirección|library|biblioteca|search|buscar/i.test(combined)) continue;
      if (/main\s*contract|contract\s*name|contrato\s*principal|nombre.*contrato|nombre\s*del\s*contrato|contrato principal/i.test(combined)) {
        await el.scrollIntoViewIfNeeded().catch(() => {});
        await el.fill(MAIN_CONTRACT);
        log('Main Contract: ' + MAIN_CONTRACT);
        break;
      }
    }

    // Runs 200 si hay input numérico (legacy)
    const runsInputs = verifyRootStep2.locator('input[type="number"]');
    const nRuns = await runsInputs.count();
    for (let i = 0; i < Math.min(nRuns, 8); i++) {
      const inp = runsInputs.nth(i);
      const ph = (await inp.getAttribute('placeholder').catch(() => '')) || '';
      const name = (await inp.getAttribute('name').catch(() => '')) || '';
      if (/run|optim|ejecuc|veces/i.test(ph + name)) {
        await inp.fill('200');
        log('Runs: 200');
        break;
      }
    }
    await page.waitForTimeout(400);

    // 7) Combos paso 2: Optimization Sí, Via IR No, MIT, EVM — índice sobre combobox VISIBLES en verifyRootStep2
    /** @param {RegExp | RegExp[]} optionRegex uno o varios patrones (se prueba en orden hasta acertar). */
    async function selectComboByVisibleIndex(scope, visibleIdx, optionRegex, label) {
      const patterns = Array.isArray(optionRegex) ? optionRegex : [optionRegex];
      const combo = await nthVisibleCombobox(scope, visibleIdx);
      if (!combo) return false;
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
      await combo.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await combo.click({ force: true });
      await page.waitForTimeout(900);
      for (const pat of patterns) {
        const opts = page.getByRole('option').filter({ hasText: pat });
        if (await opts.count() > 0) {
          await opts.first().click({ force: true });
          log(label);
          await page.waitForTimeout(400);
          return true;
        }
      }
      await page.keyboard.press('Escape');
      return false;
    }

    const nCombos2 = await countVisibleComboboxes(verifyRootStep2);
    log('Combos visibles en paso 2 (<main>): ' + nCombos2 + ' (offset base=' + step2ComboOffset + ')');

    const comboSpecs = [
      {
        rel: 0,
        regex: [
          /^Yes$/i,
          /^Sí$/i,
          /^Si$/i,
          /optimization.*yes|optimización.*sí|optimizaci[oó]n.*sí|activado|habilitado/i
        ],
        label: 'Optimization: Yes/Sí (EN/ES)'
      },
      {
        rel: 1,
        regex: [/^No$/i, /desactivado/i, /sin\s*ir/i, /via\s*ir.*no/i],
        label: 'Via IR: No (EN/ES)'
      },
      {
        rel: 2,
        regex: [
          /MIT License\s*\(MIT\)/i,
          /Licencia MIT\s*\(MIT\)/i,
          /MIT\s*\(MIT\)/i,
          /^MIT$/i,
          /\bMIT\b/
        ],
        label: 'License: MIT (EN/ES)'
      },
      {
        rel: 3,
        regex: [
          /predeterminado|por defecto|default|shanghai|estándar|estandar|istanbul/i
        ],
        label: 'EVM: default/predeterminado/Shanghai (EN/ES)'
      }
    ];

    await page.evaluate(() => window.scrollBy(0, 400));
    await page.waitForTimeout(400);

    for (const spec of comboSpecs) {
      const idx = step2ComboOffset + spec.rel;
      if (idx < nCombos2) {
        if (spec.rel >= 2) await page.evaluate(() => window.scrollBy(0, 500));
        try {
          await selectComboByVisibleIndex(verifyRootStep2, idx, spec.regex, spec.label);
        } catch (e) {
          log('Combo visible ' + idx + ': ' + e.message);
        }
      }
    }

    // Refuerzo (legacy): licencia MIT y Optimization Sí — por índice visible
    if (nCombos2 > step2ComboOffset + 2) {
      await page.evaluate(() => window.scrollBy(0, 600));
      await page.waitForTimeout(400);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
      const licCombo = await nthVisibleCombobox(verifyRootStep2, step2ComboOffset + 2);
      if (!licCombo) {
        log('Refuerzo licencia: no hay combo visible en índice ' + (step2ComboOffset + 2));
      } else {
      await licCombo.scrollIntoViewIfNeeded();
      await licCombo.click({ force: true });
      await page.waitForTimeout(1000);
      let mit = page.getByRole('option').filter({ hasText: /MIT License\s*\(MIT\)|Licencia MIT\s*\(MIT\)|MIT\s*\(MIT\)/i });
      if (await mit.count() === 0) mit = page.getByRole('option').filter({ hasText: /\bMIT\b/ });
      if (await mit.count() > 0) {
        await mit.first().click({ force: true });
        log('License MIT: confirmado (refuerzo EN/ES)');
      } else {
        await page.keyboard.press('Escape');
      }
      await page.waitForTimeout(400);
      }
    }
    if (nCombos2 > step2ComboOffset) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
      const optCombo = await nthVisibleCombobox(verifyRootStep2, step2ComboOffset);
      if (!optCombo) {
        log('Refuerzo Optimization: no hay combo visible en índice ' + step2ComboOffset);
      } else {
      await optCombo.scrollIntoViewIfNeeded();
      await optCombo.click({ force: true });
      await page.waitForTimeout(800);
      const optYes = page.getByRole('option').filter({ hasText: /^Yes$|^Sí$|^Si$/i });
      if (await optYes.count() > 0) {
        await optYes.first().click({ force: true });
        log('Optimization Sí/Yes: confirmado (refuerzo UI español)');
      } else {
        await page.keyboard.press('Escape');
      }
      await page.waitForTimeout(300);
      }
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    log('Biblioteca: este contrato no usa linkReferences; no rellenes direcciones de librería.');
    log('Debug API (si hay): ' + logPath);
    log('Resultado: https://www.oklink.com/tron/address/' + ADDR);

    const skipWaitEnter =
      process.argv.includes('--no-wait') || process.env.OKLINK_SKIP_WAIT_ENTER === '1';
    const waitAfterSubmitMs = Number.parseInt(process.env.OKLINK_WAIT_AFTER_SUBMIT_MS || '120000', 10) || 120000;

    if (autoSubmit) {
      const submitted = await trySubmitVerification(page, log);
      if (submitted) {
        log('Esperando respuesta OKLink hasta ' + Math.round(waitAfterSubmitMs / 1000) + 's (OKLINK_WAIT_AFTER_SUBMIT_MS).');
        await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
        await page.waitForTimeout(Math.min(waitAfterSubmitMs, 180000));
      } else {
        log('Envío automático no aplicado: completa Submit a mano o revisa la UI.');
        if (!skipWaitEnter && process.stdin.isTTY) {
          await new Promise((resolve) => {
            const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
            rl.question('Pulsa Enter cuando hayas enviado… ', () => { rl.close(); resolve(); });
          });
        } else {
          log('Sin TTY o OKLINK_SKIP_WAIT_ENTER: esperando 20s (no bloqueo en Enter).');
          await page.waitForTimeout(20000);
        }
      }
    } else {
      log('Pulsa Submit/Verificar/Enviar tú mismo. OKLink puede tardar varios minutos en responder.');
      if (skipWaitEnter) {
        log('--no-wait / OKLINK_SKIP_WAIT_ENTER — esperando 15s; revisa el navegador y pulsa Submit si falta.');
        await page.waitForTimeout(15000);
      } else {
        log('Pulsa Enter en esta terminal cuando termines (o tras ver el mensaje final).');
        await new Promise((resolve) => {
          const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
          rl.question('', () => { rl.close(); resolve(); });
        });
      }
    }

    const pageMsg = await page.locator('text=/error|failed|try again|success|verified/i').first().textContent().catch(() => '');
    if (pageMsg) log('Mensaje visible en página: ' + pageMsg.trim());
    const lastVerifyResponse = oklinkDebug.getLastResponse();
    if (lastVerifyResponse) {
      log('Última respuesta HTTP capturada: status=' + lastVerifyResponse.status);
      log('URL: ' + lastVerifyResponse.url);
      log('Detalle (inicio cuerpo): ' + (lastVerifyResponse.body || '').slice(0, 500).replace(/\s+/g, ' '));
    } else {
      log('No se capturó cuerpo de respuesta relevante; revisa ' + logPath + ' (F12 → Network en el navegador si sigue vacío).');
    }
  } catch (e) {
    log('Error: ' + e.message);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  log('Error: ' + e.message);
  process.exit(1);
});
