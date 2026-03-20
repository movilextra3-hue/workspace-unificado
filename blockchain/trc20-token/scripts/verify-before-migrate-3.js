#!/usr/bin/env node
'use strict';
/**
 * Verificación OBLIGATORIA antes de ejecutar tronbox migrate -f 3.
 * NO ENVÍA NINGUNA TRANSACCIÓN. Solo comprueba:
 *   - .env: PRIVATE_KEY, TRON_PRO_API_KEY, PROXY_ADMIN_ADDRESS
 *   - PROXY_ADMIN_ADDRESS es un contrato existente en mainnet
 *   - Balance y energía suficientes (o TRX para pagar energía)
 *   - feeLimit en tronbox.js suficiente para el deploy de Implementation
 * Si algo falla, sale con código 1 y no se debe ejecutar migrate -f 3.
 */
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { TronWeb } = require('tronweb');
const fs = require('node:fs');
const https = require('node:https');

const MAINNET_HOST = 'api.trongrid.io';
let FEE_LIMIT_CURRENT = 300000000; // 300 TRX; config/trc20-networks.js mainnet
try {
  const tronboxConfig = require(path.join(__dirname, '..', 'config', 'trc20-networks.js'));
  const mainnetFeeLimit = tronboxConfig?.networks?.mainnet?.feeLimit;
  if (mainnetFeeLimit != null) FEE_LIMIT_CURRENT = Number(mainnetFeeLimit);
} catch (e) { /* usa 300e6 por defecto */ }
const MIN_BALANCE_TRX = 200;
const MIN_ENERGY_IMPL_SAFETY = 50; // margen extra sobre estimación
const MIN_FEE_LIMIT_IMPL_SUN = 250000000; // 250 TRX mínimo para deploy Implementation ("save just created contract code" ~2,5M Energy)

function request(method, pathname, body, apiKey) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const opts = {
      hostname: MAINNET_HOST,
      path: pathname,
      method,
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    };
    if (apiKey) opts.headers['TRON-PRO-API-KEY'] = apiKey;
    const req = https.request(opts, (res) => {
      let raw = '';
      res.on('data', (ch) => { raw += ch; });
      res.on('end', () => {
        try { resolve(JSON.parse(raw || '{}')); } catch (e) { resolve({}); }
      });
    });
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout 15s')); });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function get(pathname, apiKey) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: MAINNET_HOST, path: pathname, method: 'GET', headers: {} };
    if (apiKey) opts.headers['TRON-PRO-API-KEY'] = apiKey;
    const req = https.get('https://' + MAINNET_HOST + pathname, opts, (res) => {
      let raw = '';
      res.on('data', (c) => { raw += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(raw || '{}')); } catch (e) { resolve({}); }
      });
    });
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout 15s')); });
    req.on('error', reject);
  });
}

async function main() {
  const errors = [];
  const apiKey = (process.env.TRON_PRO_API_KEY || '').trim();
  const privateKey = (process.env.PRIVATE_KEY || '').replace(/^0x/, '').trim();
  const proxyAdminAddr = (process.env.PROXY_ADMIN_ADDRESS || '').trim();

  console.log('');
  console.log('=== VERIFICACIÓN PREVIA A tronbox migrate -f 3 (no se envía ninguna tx) ===');
  console.log('');

  if (!privateKey || !/^[a-fA-F0-9]{64}$/.test(privateKey)) {
    errors.push('PRIVATE_KEY en .env falta o no es válido (64 hex).');
  }
  if (!apiKey) {
    errors.push('TRON_PRO_API_KEY en .env falta (recomendado en mainnet).');
  }
  if (!proxyAdminAddr) {
    errors.push('PROXY_ADMIN_ADDRESS en .env falta. Pega en .env una de estas 3 (recomendada la primera):');
    errors.push('  PROXY_ADMIN_ADDRESS=TVeVPZGiMc9GWQ8sQHvUwhfg19EDZt3UjZ');
    errors.push('  PROXY_ADMIN_ADDRESS=TQJ6f3eczr2rK9x9kN2JMTdDN1zTm46XxE');
    errors.push('  PROXY_ADMIN_ADDRESS=TTTT4AeRUjJEmTepb9X4uK4f6Pxg8UwwkW');
  }

  const tronWeb = new TronWeb({
    fullHost: 'https://' + MAINNET_HOST,
    privateKey: privateKey || '0'.repeat(64),
    headers: apiKey ? { 'TRON-PRO-API-KEY': apiKey } : {}
  });
  const ownerAddr = tronWeb.defaultAddress.base58;
  const ownerHex = tronWeb.address.toHex(ownerAddr);

  let proxyAdminHex = proxyAdminAddr ? proxyAdminAddr.replace(/^0x/, '') : '';
  if (proxyAdminAddr && proxyAdminAddr.startsWith('T') && proxyAdminAddr.length > 30) {
    try {
      proxyAdminHex = tronWeb.address.toHex(proxyAdminAddr);
    } catch (e) {
      errors.push('PROXY_ADMIN_ADDRESS no es una dirección TRON válida (base58 o hex).');
    }
  } else if (proxyAdminAddr && proxyAdminAddr.startsWith('0x')) {
    proxyAdminHex = proxyAdminAddr.replace(/^0x/, '');
  }

  if (proxyAdminAddr && proxyAdminHex) {
    try {
      const contractRes = await request('POST', '/wallet/getcontract', { value: proxyAdminAddr, visible: true }, apiKey);
      const hasContract = contractRes && contractRes.contract_address && !contractRes.Error;
      if (!hasContract) {
        errors.push('PROXY_ADMIN_ADDRESS no es un contrato en mainnet o la dirección es incorrecta. Comprueba en Tronscan.');
      } else {
        console.log('  [OK] PROXY_ADMIN_ADDRESS es un contrato en mainnet.');
      }
    } catch (e) {
      errors.push('No se pudo comprobar PROXY_ADMIN_ADDRESS en mainnet: ' + (e.message || e));
    }
  }

  const buildDir = path.join(__dirname, '..', 'build', 'contracts');
  const loadBytecodeSize = (name) => {
    const p = path.join(buildDir, `${name}.json`);
    if (!fs.existsSync(p)) return 0;
    try {
      const art = JSON.parse(fs.readFileSync(p, 'utf8'));
      return ((art.bytecode || '').replace(/^0x/, '').length / 2);
    } catch (e) { return 0; }
  };

  const implBytes = loadBytecodeSize('TRC20TokenUpgradeable');
  const proxyBytes = loadBytecodeSize('TransparentUpgradeableProxy');
  if (implBytes === 0 || proxyBytes === 0) {
    errors.push('Falta compilar: ejecuta npm run compile para generar artefactos TVM');
  }

  const ENERGY_PER_BYTE = 320;
  const energyImpl = implBytes * ENERGY_PER_BYTE;
  const energyProxy = proxyBytes * ENERGY_PER_BYTE;
  const energyInit = 150000;
  const totalEnergyMigrate3 = energyImpl + energyProxy + energyInit;

  let resources = {};
  try {
    resources = await request('POST', '/wallet/getaccountresource', { address: ownerHex, visible: false }, apiKey);
    if (resources && resources.Error) resources = {};
  } catch (e) { resources = {}; }

  const energyLimit = Number(resources.EnergyLimit || 0);
  const energyUsed = Number(resources.EnergyUsed || 0);
  const energyFree = Math.max(0, energyLimit - energyUsed);

  // Todas las fuentes devuelven o se normalizan a SUN (1 TRX = 1e6 SUN).
  // Si TronWeb devuelve TRX (número < 1e7), lo convertimos a SUN.
  function toSun(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return 0;
    return n < 1e7 ? n * 1e6 : n; // si parece TRX (< 10M), convertir a SUN
  }
  function liquidSunFromV1(v1) {
    if (!v1 || v1.Error) return 0;
    const data = Array.isArray(v1.data) && v1.data.length > 0 ? v1.data[0] : (v1.data && !Array.isArray(v1.data) ? v1.data : null);
    return data ? Number(data.balance) || 0 : 0;
  }
  const balancesSun = [];
  try {
    const v1NoKey = await get('/v1/accounts/' + encodeURIComponent(ownerAddr), null);
    balancesSun.push(liquidSunFromV1(v1NoKey));
  } catch (_e) { /* sigue */ }
  if (apiKey) {
    try {
      const v1Key = await get('/v1/accounts/' + encodeURIComponent(ownerAddr), apiKey);
      balancesSun.push(liquidSunFromV1(v1Key));
    } catch (_e) { /* sigue */ }
  }
  try {
    const accBase58 = await request('POST', '/wallet/getaccount', { address: ownerAddr, visible: true }, apiKey);
    if (accBase58 && !accBase58.Error && accBase58.balance !== undefined) balancesSun.push(Number(accBase58.balance) || 0);
    if (accBase58?.data?.balance !== undefined) balancesSun.push(Number(accBase58.data.balance) || 0);
  } catch (_e) { /* sigue */ }
  try {
    const accHex = await request('POST', '/wallet/getaccount', { address: ownerHex, visible: false }, apiKey);
    if (accHex && !accHex.Error && accHex.balance !== undefined) balancesSun.push(Number(accHex.balance) || 0);
  } catch (_e) { /* sigue */ }
  try {
    const bal = await tronWeb.trx.getBalance(ownerAddr);
    if (typeof bal === 'number' && !Number.isNaN(bal)) balancesSun.push(toSun(bal));
    else if (bal?.sun != null) balancesSun.push(Number(bal.sun) || 0);
    else if (bal?.balance != null) balancesSun.push(toSun(bal.balance));
    else if (bal != null) balancesSun.push(toSun(bal));
  } catch (_e) { /* sigue */ }
  const overrideTRX = (process.env.VERIFY_BALANCE_TRX || '').trim();
  if (overrideTRX) {
    const trxNum = Number(overrideTRX);
    if (Number.isFinite(trxNum) && trxNum >= 0) balancesSun.push(trxNum * 1e6);
  }
  const balanceSun = balancesSun.length ? Math.max(...balancesSun) : 0;
  const balanceTRX = balanceSun / 1e6;

  let energyPriceSun = 100;
  try {
    const prices = await get('/wallet/getenergyprices', apiKey);
    if (prices && prices.prices && typeof prices.prices === 'string') {
      const parts = prices.prices.split(',').filter(Boolean);
      if (parts.length) {
        const m = (/:\s*(\d+)\s*$/).exec(parts[parts.length - 1]);
        if (m) energyPriceSun = Number.parseInt(m[1], 10);
      }
    }
  } catch (_e) { /* usar precio por defecto */ }

  const energyToPay = Math.max(0, totalEnergyMigrate3 - energyFree);
  const costTRX = (energyToPay * energyPriceSun) / 1e6;

  console.log('  Dirección wallet:', ownerAddr);
  if (overrideTRX) console.log('  Balance (incl. VERIFY_BALANCE_TRX=' + overrideTRX + ' TRX):', balanceTRX.toFixed(2), 'TRX');
  else console.log('  Balance (máx. de', balancesSun.length, 'fuentes):', balanceTRX.toFixed(2), 'TRX');
  console.log('  Energía libre:', energyFree.toLocaleString());
  console.log('  Energía necesaria (migrate -f 3):', totalEnergyMigrate3.toLocaleString(), '(Impl + Proxy + init)');
  console.log('  Coste estimado si pagas con TRX:', costTRX.toFixed(2), 'TRX');
  console.log('  feeLimit en tronbox.js:', (FEE_LIMIT_CURRENT / 1e6).toFixed(0), 'TRX por tx');
  console.log('');

  if (balanceTRX < MIN_BALANCE_TRX) {
    errors.push('Balance insuficiente: mínimo ' + MIN_BALANCE_TRX + ' TRX recomendado. Tienes ' + balanceTRX.toFixed(2) + ' TRX.');
    if (balancesSun.length === 0) {
      errors.push('No se obtuvo balance de ninguna fuente (API/cache). Comprueba TRON_PRO_API_KEY en .env o, si en Tronscan ves saldo, define VERIFY_BALANCE_TRX=tu_balance_en_TRX.');
    } else if (balanceTRX < 1 && balancesSun.length < 3) {
      errors.push('Si en Tronscan ves más saldo, añade TRON_PRO_API_KEY o define VERIFY_BALANCE_TRX=tu_balance_trx en .env.');
    }
  }

  const maxEnergyPayableWithFeeLimit = FEE_LIMIT_CURRENT / energyPriceSun;
  if (FEE_LIMIT_CURRENT < MIN_FEE_LIMIT_IMPL_SUN) {
    errors.push(
      'feeLimit en tronbox.js debe ser al menos ' + (MIN_FEE_LIMIT_IMPL_SUN / 1e6) + ' TRX (250000000 sun) para el deploy de Implementation. ' +
      'La fase "save just created contract code" requiere ~2,5M Energy. Actual: ' + (FEE_LIMIT_CURRENT / 1e6) + ' TRX.'
    );
  }
  if (energyFree < energyImpl + MIN_ENERGY_IMPL_SAFETY && energyImpl > maxEnergyPayableWithFeeLimit) {
    errors.push(
      'El deploy de Implementation necesita ~' + Math.ceil(energyImpl / 1000) + 'k energía (+ ~2,5M para guardar bytecode). ' +
      'Con feeLimit actual (' + (FEE_LIMIT_CURRENT / 1e6) + ' TRX) puedes pagar ~' + Math.ceil(maxEnergyPayableWithFeeLimit / 1000) + 'k. ' +
      'Sube feeLimit en tronbox.js (mín. 300 TRX recomendado) o delega energía a esta cuenta.'
    );
  }

  if (energyFree < totalEnergyMigrate3 && balanceTRX < costTRX + 50) {
    errors.push('Energía insuficiente y balance bajo. Necesitas ~' + (costTRX + 50).toFixed(0) + ' TRX o energía delegada.');
  }

  if (errors.length > 0) {
    console.log('--- FALLOS (no ejecutes tronbox migrate -f 3 hasta corregir) ---');
    errors.forEach((e) => console.error('  *', e));
    console.log('');
    process.exit(1);
  }

  console.log('--- Verificación OK.');
  console.log('  Si ejecutaste npm run migrate-3-safe, a continuación se ejecutará migrate -f 3.');
  console.log('  Si ejecutaste solo verify: antes de gastar TRX usa: npm run migrate-3-safe (nunca tronbox migrate -f 3 directo).');
  console.log('');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
