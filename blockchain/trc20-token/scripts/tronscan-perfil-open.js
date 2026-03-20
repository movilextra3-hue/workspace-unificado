#!/usr/bin/env node
'use strict';
/**
 * Abre Tronscan "Record/Create Token", rellena dirección, descripción, logo URL y website.
 * El usuario debe conectar la wallet y pulsar enviar/guardar.
 * Uso: npm run perfil:tronscan:open
 */
const { getPerfilData } = require('./lib/perfil-data.js');

const TRONSCAN_PERFIL_URL = 'https://tronscan.org/#/wallet/tokensCreate';

async function main() {
  let data;
  try {
    data = getPerfilData();
  } catch (e) {
    console.error(e.message);
    console.error('Ejecuta antes el despliegue y npm run check:perfil para validar.');
    process.exit(1);
  }

  let playwright;
  try {
    playwright = require('playwright');
  } catch (e) {
    console.error('Instala Playwright: npm install playwright && npx playwright install chromium');
    process.exit(1);
  }

  console.log('Abriendo Tronscan (perfil del token)...');
  console.log('Token (Proxy):', data.tokenAddress);
  console.log('');

  const browser = await playwright.chromium.launch({ headless: false });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  try {
    await page.goto(TRONSCAN_PERFIL_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(3000);
  } catch (e) {
    console.error('No se pudo cargar la página:', e.message);
    await browser.close();
    process.exit(1);
  }

  // Tronscan muestra primero "Confirm" → al pulsar abre el modal "Connect wallet".
  // El formulario (Contract address, etc.) solo aparece DESPUÉS de conectar la wallet.
  const confirmBtn = page.locator('button:has-text("Confirm")').first();
  if (await confirmBtn.isVisible()) {
    await confirmBtn.click();
    await page.waitForTimeout(1000);
    console.log('  Pulsado "Confirm". Conecta tu wallet (owner) en el modal que se abrió.');
    console.log('  Esperando hasta 90 s a que aparezca el formulario tras conectar...');
  }

  const fill = async (name, fn) => {
    try {
      await fn();
      console.log('  Rellenado:', name);
    } catch (e) {
      console.warn('  (omitido:', name, ')', e.message);
    }
  };

  // Esperar a que exista el campo de dirección (formulario visible solo tras conectar wallet)
  const addrInput = page.locator('input[placeholder*="ontract"]').or(page.locator('input[placeholder*="ddress"]')).or(page.locator('input[placeholder*="Contract"]')).or(page.locator('input[placeholder*="Address"]')).first();
  try {
    await addrInput.waitFor({ state: 'visible', timeout: 90000 });
  } catch (e) {
    console.error('No apareció el formulario en 90 s. Conecta la wallet y vuelve a ejecutar: npm run perfil:tronscan:open');
    await browser.close();
    process.exit(1);
  }

  await fill('Contract address', async () => {
    await addrInput.fill('');
    await addrInput.fill(data.tokenAddress);
  });

  await page.waitForTimeout(1500);

  await fill('Description', async () => {
    const ta = page.locator('textarea').first();
    const inputDesc = page.locator('input[placeholder*="escript"]').or(page.locator('input[placeholder*="escription"]')).first();
    if (await ta.count() > 0 && await ta.isVisible()) {
      await ta.fill('');
      await ta.fill(data.description);
    } else if (await inputDesc.count() > 0 && await inputDesc.isVisible()) {
      await inputDesc.fill('');
      await inputDesc.fill(data.description);
    }
  });

  await fill('Logo URL', async () => {
    if (!data.logoUrl) return;
    const logoInput = page.locator('input[placeholder*="ogo"]').or(page.locator('input[placeholder*="con"]')).or(page.locator('input[placeholder*="URL"]')).or(page.locator('input[type="url"]')).first();
    if (await logoInput.count() > 0 && await logoInput.isVisible()) {
      await logoInput.fill('');
      await logoInput.fill(data.logoUrl);
    }
  });

  await fill('Project website', async () => {
    const webInput = page.locator('input[placeholder*="ebsite"]').or(page.locator('input[placeholder*="ite"]')).or(page.locator('input[placeholder*="http"]')).first();
    if (await webInput.count() > 0 && await webInput.isVisible()) {
      await webInput.fill('');
      await webInput.fill(data.websiteUrl);
    }
  });

  await page.waitForTimeout(1000);
  const submitPattern = /Save|Submit|Confirm|Record|Create|Guardar|Enviar|Save token|Record token/i;
  const submitBtn = page.locator('button').filter({ hasText: submitPattern }).or(page.getByRole('button', { name: submitPattern }));
  if ((await submitBtn.count()) > 0) {
    try {
      const first = submitBtn.first();
      if (await first.isEnabled() && await first.isVisible()) {
        await first.scrollIntoViewIfNeeded();
        await first.click();
        console.log('  Pulsado botón guardar/enviar. Firma en tu wallet si aparece.');
      }
    } catch (_) { /* botón no disponible o no visible; usuario puede pulsar manualmente */ }
  }

  console.log('');
  console.log('Revisa y firma en wallet si es necesario. El navegador se cerrará en 5 minutos.');
  await page.waitForTimeout(300000);
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
