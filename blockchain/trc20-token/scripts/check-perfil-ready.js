#!/usr/bin/env node
'use strict';
/**
 * Comprueba que estén listos los requisitos para completar el perfil del token en Tronscan.
 * Incluye verificación de que la URL del logo sea accesible (TronScan la necesita).
 * Uso: npm run check:perfil
 */
const path = require('node:path');
const fs = require('node:fs');
const https = require('node:https');
const { getPerfilData, getLocalLogoPath, getLogoUrls, ROOT } = require('./lib/perfil-data.js');

function fetchHead(url) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'HEAD',
      headers: { 'User-Agent': 'check-perfil-ready/1.0' }
    };
    const req = https.request(opts, (res) => {
      resolve(res.statusCode);
    });
    req.on('error', () => resolve(0));
    req.setTimeout(10000, () => { req.destroy(); resolve(0); });
    req.end();
  });
}

async function main() {
  console.log('Comprobando perfil del token...\n');
  const checks = { ok: [], fail: [] };

  let data;
  try {
    data = getPerfilData();
    checks.ok.push('deploy-info.json con tokenAddress');
    checks.ok.push('trc20-token.config.json o .env (description, websiteUrl, logoPathInRepo)');
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }

  if (data.description && data.description.length > 0) checks.ok.push('Descripción definida');
  else checks.fail.push('Falta description en config');

  if (data.websiteUrl && data.websiteUrl.length > 0) checks.ok.push('Website definido');
  else checks.fail.push('Falta websiteUrl en config');

  if (data.logoUrl && data.logoUrl.length > 0) checks.ok.push('URL del logo construida (githubUser/repo/branch + logoPathInRepo)');
  else checks.fail.push('Falta githubUser, githubRepo o branch para construir URL del logo');

  const localLogo = getLocalLogoPath();
  const placeholderPath = path.join(ROOT, 'assets', 'colateral-logo-placeholder.png');
  if (fs.existsSync(localLogo)) {
    checks.ok.push('Logo local: ' + path.relative(ROOT, localLogo));
  } else if (fs.existsSync(placeholderPath)) {
    checks.ok.push('Placeholder del logo existe; configura logoPathInRepo en config al archivo del logo (ej. assets/logo.png).');
  } else {
    checks.fail.push('Archivo del logo no encontrado. Colócalo en assets/ y ejecuta npm run generate:logo (genera logo.png 256×256 para Trust Wallet y Tronscan).');
  }

  const logoUrls = getLogoUrls();
  if (logoUrls.length > 0) {
    let logoOk = false;
    for (const url of logoUrls) {
      const status = await fetchHead(url);
      if (status === 200) {
        checks.ok.push('URL del logo accesible (HTTP 200): ' + (url.includes('jsdelivr') ? '[jsDelivr] ' : '') + url);
        logoOk = true;
        break;
      }
      await new Promise(r => setTimeout(r, 200));
    }
    if (!logoOk) {
      checks.fail.push('Ninguna URL del logo devuelve 200 (probadas: GitHub raw, jsDelivr). Haz push al repo. Añade logoUrlFallbacks en trc20-token.config.json para más alternativas.');
    }
  } else if (data.logoUrl) {
    const status = await fetchHead(data.logoUrl);
    if (status === 200) {
      checks.ok.push('URL del logo accesible (HTTP 200): ' + data.logoUrl);
    } else {
      checks.fail.push('URL del logo devuelve ' + (status || 'error') + ' (TronScan necesita 200). Haz push de ' + (data.logoPathInRepo || 'assets/logo.png') + ' al repo. URL: ' + data.logoUrl);
    }
  }

  console.log('OK:');
  checks.ok.forEach((x) => console.log('  ✓', x));
  if (checks.fail.length > 0) {
    console.log('\nPendiente:');
    checks.fail.forEach((x) => console.log('  ✗', x));
    console.log('\nVer docs/vitacora/CONSOLIDACION_COMPLETA_TODO.md');
    process.exit(1);
  }
  console.log('\nTodo listo. Ejecuta: npm run post-deploy:perfil (datos para pegar) o npm run perfil:tronscan:open (abre Tronscan y rellena el formulario).');
}

main().catch((e) => { console.error(e); process.exit(2); });
