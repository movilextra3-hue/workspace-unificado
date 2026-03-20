#!/usr/bin/env node
'use strict';
/**
 * Comprueba que la API de TronGrid responda correctamente (con y sin API key).
 * Uso: node scripts/check-api.js
 */
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const https = require('node:https');
const MAINNET_HOST = 'api.trongrid.io';

function get(pathname, apiKey) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: MAINNET_HOST,
      path: pathname,
      method: 'GET',
      headers: {}
    };
    if (apiKey) opts.headers['TRON-PRO-API-KEY'] = apiKey;
    https.get(opts, (res) => {
      let raw = '';
      res.on('data', (c) => { raw += c; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw || '{}') });
        } catch {
          resolve({ status: res.statusCode, body: {} });
        }
      });
    }).on('error', reject);
  });
}

function post(pathname, body, apiKey) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname: MAINNET_HOST,
      path: pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    };
    if (apiKey) opts.headers['TRON-PRO-API-KEY'] = apiKey;
    const req = https.request(opts, (res) => {
      let raw = '';
      res.on('data', (c) => { raw += c; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw || '{}') });
        } catch {
          resolve({ status: res.statusCode, body: {} });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  const apiKey = (process.env.TRON_PRO_API_KEY || '').trim();
  let addr = 'TWYhXqeMMtEePYnk2WdhoyyvHWxA1ay9Gz';
  let hex = '41e1b80f032d7c89ca77b45eebef8c4ee52800ba97';
  try {
    const { TronWeb } = require('tronweb');
    const pk = (process.env.PRIVATE_KEY || '').replace(/^0x/, '').trim();
    if (pk && /^[a-fA-F0-9]{64}$/.test(pk)) {
      const tw = new TronWeb({ fullHost: 'https://' + MAINNET_HOST, privateKey: pk });
      addr = tw.defaultAddress.base58;
      hex = tw.address.toHex(addr);
    }
  } catch {
    // usa direcciones por defecto
  }

  console.log('=== Comprobación API TronGrid (mainnet) ===\n');
  console.log('Dirección de prueba:', addr);
  console.log('API key en .env:', apiKey ? 'Sí (' + apiKey.length + ' caracteres)' : 'No');
  console.log('');

  const checks = [];

  let r = await get('/v1/accounts/' + encodeURIComponent(addr), apiKey).catch(e => ({ status: 0, body: { Error: e.message } }));
  const v1WithKey = r.status === 200 && !r.body.Error && r.body.data;
  checks.push({ name: 'GET /v1/accounts (con API key)', ok: v1WithKey, status: r.status, detail: r.body.Error || (v1WithKey ? 'OK' : 'sin data') });

  r = await get('/v1/accounts/' + encodeURIComponent(addr), null).catch(e => ({ status: 0, body: { Error: e.message } }));
  const v1NoKey = r.status === 200 && !r.body.Error && r.body.data;
  checks.push({ name: 'GET /v1/accounts (sin API key)', ok: v1NoKey, status: r.status, detail: r.body.Error || (v1NoKey ? 'OK' : 'sin data') });

  r = await post('/wallet/getaccountresource', { address: hex, visible: false }, apiKey).catch(e => ({ status: 0, body: { Error: e.message } }));
  const resWithKey = r.status === 200 && !r.body.Error && (r.body.EnergyLimit !== undefined || r.body.EnergyUsed !== undefined);
  checks.push({ name: 'POST /wallet/getaccountresource (con API key)', ok: resWithKey, status: r.status, detail: r.body.Error || (resWithKey ? 'EnergyLimit=' + r.body.EnergyLimit : 'sin EnergyLimit') });

  r = await post('/wallet/getaccountresource', { address: hex, visible: false }, null).catch(e => ({ status: 0, body: { Error: e.message } }));
  const resNoKey = r.status === 200 && !r.body.Error && (r.body.EnergyLimit !== undefined || r.body.EnergyUsed !== undefined);
  checks.push({ name: 'POST /wallet/getaccountresource (sin API key)', ok: resNoKey, status: r.status, detail: resNoKey ? 'EnergyLimit=' + r.body.EnergyLimit : (r.body.Error || 'sin datos') });

  r = await get('/wallet/getenergyprices', apiKey).catch(_e => ({ status: 0, body: {} }));
  const pricesWithKey = r.status === 200 && !r.body.Error && r.body.prices;
  checks.push({ name: 'GET /wallet/getenergyprices (con API key)', ok: pricesWithKey, status: r.status, detail: r.body.Error || (pricesWithKey ? 'OK' : 'sin prices') });

  r = await get('/wallet/getenergyprices', null).catch(_e => ({ status: 0, body: {} }));
  const pricesNoKey = r.status === 200 && r.body.prices;
  checks.push({ name: 'GET /wallet/getenergyprices (sin API key)', ok: pricesNoKey, status: r.status, detail: pricesNoKey ? 'OK' : 'sin prices' });

  r = await post('/wallet/getaccount', { address: hex, visible: false }, apiKey).catch(e => ({ status: 0, body: { Error: e.message } }));
  const accWithKey = r.status === 200 && !r.body.Error && (r.body.balance !== undefined || r.body.address);
  checks.push({ name: 'POST /wallet/getaccount (con API key)', ok: accWithKey, status: r.status, detail: r.body.Error || (accWithKey ? 'balance=' + r.body.balance : 'sin balance') });

  r = await post('/wallet/getaccount', { address: hex, visible: false }, null).catch(e => ({ status: 0, body: { Error: e.message } }));
  const accNoKey = r.status === 200 && (r.body.balance !== undefined || r.body.address);
  checks.push({ name: 'POST /wallet/getaccount (sin API key)', ok: accNoKey, status: r.status, detail: accNoKey ? 'balance=' + r.body.balance : (r.body.Error || 'sin datos') });

  checks.forEach((c) => {
    const icon = c.ok ? '✓' : '✗';
    console.log('  ' + icon + ' ' + c.name + ' → ' + c.detail);
  });

  console.log('');
  const withKeyOk = checks.filter(c => c.name.includes('con API key') && c.ok).length;
  const noKeyOk = checks.filter(c => c.name.includes('sin API key') && c.ok).length;
  if (apiKey && withKeyOk === 0 && noKeyOk >= 2) {
    console.log('Resumen: La API key de TronGrid no es aceptada (401). Los scripts usan fallback sin clave; los datos son correctos.');
    console.log('Opcional: Revisa TRON_PRO_API_KEY en https://www.trongrid.io/ (crear o renovar clave).');
  } else if (withKeyOk >= 2) {
    console.log('Resumen: La API responde correctamente con tu API key.');
  } else if (noKeyOk >= 2) {
    console.log('Resumen: La API responde correctamente sin API key (límite de tasa puede aplicar).');
  } else {
    console.log('Resumen: Hay fallos en varios endpoints. Comprueba conexión a internet y que api.trongrid.io esté accesible.');
  }
  console.log('');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
