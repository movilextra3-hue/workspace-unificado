#!/usr/bin/env node
/**
 * Consulta los endpoints Tronscan que requieren API key.
 * Usa TRONSCAN_API_KEY para Tronscan, TRON_PRO_API_KEY para TronGrid.
 * Carga .env desde blockchain/trc20-token.
 * Uso: node scripts/search-address-with-apikey.js [address]
 */
'use strict';
const https = require('node:https');
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const ADDR = process.argv[2] || 'TWYhXqeMMtEePYnk2WdhoyyvHWxA1ay9Gz';
const TRONSCAN_KEY = (process.env.TRONSCAN_API_KEY || '').trim();
const TRONGRID_KEY = (process.env.TRON_PRO_API_KEY || '').trim();

function get(url, headers = {}) {
  return new Promise((res, rej) => {
    const u = new URL(url);
    const h = { ...headers };
    const key = u.hostname === 'apilist.tronscanapi.com' ? TRONSCAN_KEY : TRONGRID_KEY;
    if (key) h['TRON-PRO-API-KEY'] = key;
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'GET',
      headers: h
    }, (r) => {
      let b = '';
      r.on('data', c => b += c);
      r.on('end', () => {
        if (r.statusCode >= 400) return res({ _status: r.statusCode, _body: b?.slice(0, 800) });
        try { res(JSON.parse(b || '{}')); } catch (e) { res({ _raw: b?.slice(0, 500) }); }
      });
    });
    req.on('error', rej);
    req.setTimeout(15000, () => { req.destroy(); rej(new Error('timeout')); });
    req.end();
  });
}

const ROUTES_PRO = [
  { id: 'accountv2', url: `https://apilist.tronscanapi.com/api/accountv2?address=${ADDR}` },
  { id: 'account/tokens', url: `https://apilist.tronscanapi.com/api/account/tokens?address=${ADDR}&start=0&limit=200&show=3` },
  { id: 'account/resourcev2', url: `https://apilist.tronscanapi.com/api/account/resourcev2?address=${ADDR}&limit=200&start=0&type=1&resourceType=0` },
  { id: 'participate_project', url: `https://apilist.tronscanapi.com/api/participate_project?address=${ADDR}` },
  { id: 'multiple/chain/query', url: `https://apilist.tronscanapi.com/api/multiple/chain/query?address=${ADDR}` },
  { id: 'approve/list_project', url: `https://apilist.tronscanapi.com/api/account/approve/list?address=${ADDR}&limit=200&start=0&type=project` },
  { id: 'approve/list_token', url: `https://apilist.tronscanapi.com/api/account/approve/list?address=${ADDR}&limit=200&start=0&type=token` },
];

async function run() {
  console.log('=== BÚSQUEDA CON API KEY (endpoints Tronscan pro) ===');
  console.log('Dirección:', ADDR);
  console.log('TRONSCAN_API_KEY:', TRONSCAN_KEY ? '(presente, ' + TRONSCAN_KEY.length + ' chars)' : '(ausente)');
  if (!TRONSCAN_KEY) {
    console.log('\nFalta TRONSCAN_API_KEY en .env. Añade TRONSCAN_API_KEY=tu_key (tronscan.org/#/myaccount/apiKeys/)');
    process.exit(1);
  }
  // Diagnóstico: verificar si la key funciona con Tronscan (api/block) y TronGrid
  console.log('\n--- Diagnóstico de API key ---');
  const blockTronscan = await get('https://apilist.tronscanapi.com/api/block');
  const blockOk = !blockTronscan._status || (blockTronscan._status >= 200 && blockTronscan._status < 300);
  console.log('Tronscan api/block:', blockOk ? 'OK (key válida)' : 'HTTP ' + (blockTronscan._status || '?'));
  const tgAccount = await get(`https://api.trongrid.io/v1/accounts/${ADDR}`, {});
  const tgOk = !tgAccount._status || (tgAccount._status >= 200 && tgAccount._status < 300);
  console.log('TronGrid v1/accounts:', tgOk ? 'OK (key válida)' : 'HTTP ' + (tgAccount._status || '?'));
  if (!blockOk && tgOk) {
    console.log('Nota: La key parece ser de TronGrid (trongrid.io). Endpoints Tronscan pro pueden requerir key de tronscan.org/#/myaccount/apiKeys/');
  }
  if (!blockOk && !tgOk) {
    console.log('Nota: La key no funciona ni con Tronscan ni con TronGrid. Verifica que sea válida y que tenga los permisos correctos.');
  }
  console.log('');

  const out = { byRoute: {}, summary: [] };
  for (const r of ROUTES_PRO) {
    try {
      const data = await get(r.url);
      const status = data._status ?? 200;
      const ok = status >= 200 && status < 300;
      out.byRoute[r.id] = { status, ok, hasData: ok && !data._status };
      out.summary.push({ route: r.id, status: ok ? 'OK' : ('HTTP ' + status) });
      if (ok && !data._status) {
        const keys = Object.keys(data).filter(k => !k.startsWith('_'));
        console.log(`[${r.id}] OK, keys:`, keys.slice(0, 15).join(', ') + (keys.length > 15 ? '...' : ''));
        if (r.id === 'accountv2' && data.balance != null) {
          console.log('  balance:', data.balance, 'TRX:', (data.balance / 1e6).toFixed(6));
        }
        if (r.id === 'account/tokens' && data.data) {
          console.log('  tokens:', data.data.length, 'total:', data.total);
        }
        if (r.id === 'multiple/chain/query' && data.multipleChain) {
          console.log('  chains:', data.multipleChain.length);
        }
      } else {
        console.log(`[${r.id}] HTTP ${status}`);
      }
      await new Promise(x => setTimeout(x, 400));
    } catch (e) {
      out.byRoute[r.id] = { error: e.message };
      out.summary.push({ route: r.id, status: 'ERR: ' + e.message });
      console.log(`[${r.id}] ERR:`, e.message);
    }
  }
  console.log('\n=== RESUMEN ===');
  console.table(out.summary);
  return out;
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
