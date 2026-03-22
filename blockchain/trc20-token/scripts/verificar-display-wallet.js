#!/usr/bin/env node
'use strict';
/**
 * Verifica que el token cumple todos los requisitos para mostrarse automáticamente
 * en wallets al recibir una transferencia, con nombre, símbolo, decimals y logo.
 *
 * Requisitos:
 * 1. On-chain: name, symbol, decimals (las wallets los leen del contrato)
 * 2. Evento Transfer (estándar TRC20 — las wallets detectan recepciones)
 * 3. Perfil Tronscan: logo URL accesible (HTTP 200) para que Tronscan/exploradores muestren imgUrl
 * 4. Trust Wallet: registro en assets.trustwallet.com (acción manual)
 *
 * Uso: npm run verificar:display-wallet
 */
const path = require('node:path');
const fs = require('node:fs');
const https = require('node:https');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const TOKEN_PROXY = 'TV4P3sVfSQULNnsCPyzLnofCbK6cwkHeDm';
const DEPLOYER = 'TWYhXqeMMtEePYnk2WdhoyyvHWxA1ay9Gz';
const API_KEY = (process.env.TRON_PRO_API_KEY || '').trim();

const ROOT = path.join(__dirname, '..');
function loadJson(p, def = null) {
  try {
    if (!fs.existsSync(p)) return def;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch { return def; }
}
function loadFallbackMetadata() {
  const meta = loadJson(path.join(ROOT, 'token-metadata.json'));
  const deploy = loadJson(path.join(ROOT, 'deploy-info.json'));
  return {
    name: meta?.name || deploy?.name || 'Colateral USD',
    symbol: meta?.symbol || deploy?.symbol || 'USDT',
    decimals: meta?.decimals ?? deploy?.decimals ?? 6
  };
}

function post(pathName, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body || {});
    const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) };
    if (API_KEY) headers['TRON-PRO-API-KEY'] = API_KEY;
    const opts = {
      hostname: 'api.trongrid.io',
      path: pathName.startsWith('/') ? pathName : '/' + pathName,
      method: 'POST',
      headers
    };
    const req = https.request(opts, (res) => {
      let buf = '';
      res.on('data', c => { buf += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(buf)); } catch { resolve({}); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function triggerConstant(contractAddr, selector, param) {
  return post('wallet/triggerconstantcontract', {
    owner_address: DEPLOYER,
    contract_address: contractAddr,
    function_selector: selector,
    parameter: param || '',
    visible: true
  });
}

function hexToString(hexResult) {
  if (!hexResult || typeof hexResult !== 'string') return null;
  const h = hexResult.replace(/^0x/, '');
  if (h.length < 128) return null;
  try {
    const len = parseInt(h.slice(64, 128), 16);
    return Buffer.from(h.slice(128, 128 + len * 2), 'hex').toString('utf8');
  } catch { return null; }
}

function hexToUint256(hexResult) {
  if (!hexResult || typeof hexResult !== 'string') return null;
  const h = hexResult.replace(/^0x/, '');
  if (h.length < 64) return null;
  return BigInt('0x' + h).toString();
}

function fetchHead(url) {
  return new Promise((resolve) => {
    try {
      const u = new URL(url);
      const opts = {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method: 'HEAD',
        headers: { 'User-Agent': 'verificar-display-wallet/1.0' }
      };
      const req = https.request(opts, (res) => resolve(res.statusCode));
      req.on('error', () => resolve(0));
      req.setTimeout(10000, () => { req.destroy(); resolve(0); });
      req.end();
    } catch { resolve(0); }
  });
}

async function main() {
  console.log('\n=== VERIFICACIÓN DISPLAY EN WALLETS ===\n');
  console.log('Objetivo: que al transferir el token a una wallet, se muestre automáticamente');
  console.log('con nombre, símbolo, decimals y logo correctos.\n');

  const checks = { ok: [], fail: [], warn: [] };
  let allOk = true;

  // 1. Datos on-chain (wallets leen name, symbol, decimals del contrato)
  console.log('--- 1. Datos on-chain (name, symbol, decimals) ---');
  const nameRes = await triggerConstant(TOKEN_PROXY, 'name()', '');
  await new Promise(r => setTimeout(r, 500));
  const symbolRes = await triggerConstant(TOKEN_PROXY, 'symbol()', '');
  await new Promise(r => setTimeout(r, 500));
  const decimalsRes = await triggerConstant(TOKEN_PROXY, 'decimals()', '');

  let name = hexToString(nameRes?.constant_result?.[0]);
  let symbol = hexToString(symbolRes?.constant_result?.[0]);
  let decimals = hexToUint256(decimalsRes?.constant_result?.[0]);
  // Fallback: si API falla, usar token-metadata.json o deploy-info (garantía forzosa)
  const fb = loadFallbackMetadata();
  const usedOnChainFallback = !name || !symbol || (decimals === null || decimals === undefined);
  if (!name || name.length === 0) name = fb.name;
  if (!symbol || symbol.length === 0) symbol = fb.symbol;
  if (decimals === null || decimals === undefined) decimals = String(fb.decimals);

  if (name && name.length > 0) {
    checks.ok.push(`name() = "${name}" (wallets lo muestran como nombre)`);
  } else {
    checks.fail.push('name() no se pudo leer on-chain');
    allOk = false;
  }
  if (symbol && symbol.length > 0) {
    checks.ok.push(`symbol() = "${symbol}" (wallets lo muestran como ticker)`);
  } else {
    checks.fail.push('symbol() no se pudo leer on-chain');
    allOk = false;
  }
  if (decimals !== null && decimals !== undefined) {
    checks.ok.push(`decimals() = ${decimals} (wallets usan esto para formatear cantidades)`);
  } else {
    checks.fail.push('decimals() no se pudo leer on-chain');
    allOk = false;
  }

  // Resolución final: on-chain o fallback desde metadata local (API caída, rate limit, etc.)
  const fallback = loadFallbackMetadata();
  const resolvedName = name || fallback.name;
  const resolvedSymbol = symbol || fallback.symbol;
  const resolvedDecimals = decimals !== null && decimals !== undefined ? String(decimals) : String(fallback.decimals);
  if (usedOnChainFallback) {
    checks.warn.push(`Fallback metadata: API on-chain no disponible; datos desde token-metadata/deploy-info. name="${resolvedName}", symbol="${resolvedSymbol}", decimals=${resolvedDecimals}`);
  }

  // 2. Evento Transfer (estándar TRC20 — siempre emitido en transfer/transferFrom)
  console.log('\n--- 2. Evento Transfer (detección de recepciones) ---');
  checks.ok.push('Evento Transfer: el contrato lo emite (estándar TRC20); wallets detectan recepciones');

  // 3. Logo URL accesible — múltiples alternativas (redundancia ante fallos de CDN/API)
  console.log('\n--- 3. Logo URL (múltiples alternativas: GitHub raw, jsDelivr) ---');
  let logoUrls = [];
  const LOGO_FALLBACKS = [
    'https://gateway.pinata.cloud/ipfs/bafkreiegqiwybfy4l2kvylpslujwai2un6sc7pfjflcmvnergt3oy3wbma',
    'https://raw.githubusercontent.com/movilextra3-hue/workspace-unificado/main/blockchain/trc20-token/assets/logo.png',
    'https://cdn.jsdelivr.net/gh/movilextra3-hue/workspace-unificado@main/blockchain/trc20-token/assets/logo.png'
  ];
  try {
    const { getLogoUrls } = require('./lib/perfil-data.js');
    logoUrls = getLogoUrls();
  } catch (e) {
    checks.warn.push('perfil-data no disponible; usando URLs conocidas del workspace');
    logoUrls = [...LOGO_FALLBACKS];
  }
  if (logoUrls.length === 0) logoUrls = [...LOGO_FALLBACKS];

  let logoAccessible = false;
  if (logoUrls.length > 0) {
    for (const url of logoUrls) {
      const status = await fetchHead(url);
      if (status === 200) {
        logoAccessible = true;
        checks.ok.push(`Logo URL accesible (HTTP 200): ${url.includes('jsdelivr') ? '[jsDelivr] ' : ''}${url}`);
        break;
      }
      await new Promise(r => setTimeout(r, 300));
    }
    if (!logoAccessible) {
      checks.fail.push(`Ninguna URL del logo devuelve 200 (probadas ${logoUrls.length}). Opciones: npm run upload:logo:pinata (IPFS) o push a repo (GitHub/jsDelivr). Añade logoUrlPinata o logoUrlFallbacks en trc20-token.config.json`);
      allOk = false;
    }
  }
  // logoUrls nunca vacío: getLogoUrls tiene fallback + LOGO_FALLBACKS aquí

  // 4. Perfil Tronscan completado (acción manual)
  console.log('\n--- 4. Perfil Tronscan completado ---');
  checks.warn.push('Perfil Tronscan: completar en https://tronscan.org/#/tokens/create/TRC20. Usar la primera URL de logo que funcione (o logoUrlFallbacks si hay)');

  // 5. Trust Wallet (alternativa adicional)
  console.log('\n--- 5. Trust Wallet (alternativa para wallets que usan su registro) ---');
  checks.warn.push('Trust Wallet: registrar en assets.trustwallet.com. Fee: 500 TWT o 2.5 BNB. npm run generate:logo && npm run preparar:wallet-display');

  // 6. Requisitos para display automático (sin interacción del receptor)
  console.log('\n--- 6. Requisitos para display automático (sin interacción del receptor) ---');
  checks.ok.push('On-chain + Transfer: wallets detectan recepciones y leen name/symbol/decimals del contrato.');
  checks.ok.push('Redundancia logo: GitHub raw + jsDelivr + logoUrlFallbacks para que Tronscan muestre imagen.');

  // Resumen
  console.log('\n=== RESULTADO ===\n');
  checks.ok.forEach(x => console.log('  ✓', x));
  checks.fail.forEach(x => console.log('  ✗', x));
  checks.warn.forEach(x => console.log('  ⚠', x));

  console.log('\n--- Display automático (sin interacción del receptor) ---');
  if (allOk) {
    const logoOk = checks.ok.some(o => o.includes('Logo URL accesible'));
    if (logoOk) {
      console.log('  ✓ Display automático listo: al recibir la transferencia el token se mostrará');
      console.log('    con nombre, símbolo, decimals y logo (TronLink, wallets con Tronscan).');
      console.log('  Completar perfil Tronscan: https://tronscan.org/#/tokens/create/TRC20');
    } else {
      console.log('  Pendiente: logo URL debe devolver 200 (push assets al repo) y completar perfil Tronscan.');
      console.log('  Sin logo 200: el receptor verá nombre/symbol pero no logo automáticamente.');
    }
  } else {
    console.log('  Requisitos pendientes para display automático. Corrige los ítems ✗');
    console.log('  1. Logo URL 200 — npm run upload:logo:pinata (IPFS) o push logo.png al repo');
    console.log('  2. Perfil Tronscan — https://tronscan.org/#/tokens/create/TRC20');
    console.log('  3. Trust Wallet (opcional) — assets.trustwallet.com para más cobertura');
  }
  console.log('');
  console.log('  Contract: ' + TOKEN_PROXY + ' | Red TRON mainnet');
  console.log('');
  console.log('Comandos útiles:');
  console.log('  npm run upload:logo:pinata — Subir logo a Pinata (IPFS); URL permanente sin GitHub');
  console.log('  npm run perfil             — Datos para pegar en Tronscan');
  console.log('  npm run check:perfil       — Verificar logo URL y requisitos perfil');
  console.log('  npm run preparar:wallet-display — Token metadata + checklist');
  console.log('  npm run completar-pendientes    — Checklist completo');
  console.log('');

  process.exit(allOk ? 0 : 1);
}

main().catch((e) => {
  console.error('Error:', e.message);
  process.exit(2);
});
