#!/usr/bin/env node
/**
 * Búsqueda exhaustiva de una dirección TRON cubriendo TODAS las rutas posibles.
 * Combina: Tronscan API, TronGrid API, 3xpl, Blockchair, web.
 * Usa TRON_PRO_API_KEY de .env si existe (TronGrid); endpoints Tronscan pro requieren key de tronscan.org.
 * Uso: node scripts/search-address-all-routes.js [address]
 */
'use strict';
const https = require('node:https');
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const ADDR = process.argv[2] || 'TWYhXqeMMtEePYnk2WdhoyyvHWxA1ay9Gz';
const TRONGRID_KEY = (process.env.TRON_PRO_API_KEY || '').trim();
const TRONSCAN_KEY = (process.env.TRONSCAN_API_KEY || '').trim();

function get(url, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  const host = new URL(url).hostname;
  if (host === 'api.trongrid.io' && TRONGRID_KEY) headers['TRON-PRO-API-KEY'] = TRONGRID_KEY;
  else if (host === 'apilist.tronscanapi.com' && TRONSCAN_KEY) headers['TRON-PRO-API-KEY'] = TRONSCAN_KEY;
  return new Promise((res, rej) => {
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'GET',
      headers
    }, (r) => {
      let b = '';
      r.on('data', c => b += c);
      r.on('end', () => {
        if (r.statusCode >= 400) return res({ _status: r.statusCode, _body: b?.slice(0, 500) });
        try { res(JSON.parse(b || '{}')); } catch (e) { res({ _raw: b?.slice(0, 500) }); }
      });
    });
    req.on('error', rej);
    req.setTimeout(15000, () => { req.destroy(); rej(new Error('timeout')); });
    req.end();
  });
}

const ROUTES = [
  // Tronscan (algunos requieren API key, se intentan sin ella)
  { id: 'tronscan_transaction', url: `https://apilist.tronscanapi.com/api/transaction?sort=-timestamp&count=true&limit=200&start=0&address=${ADDR}` },
  { id: 'tronscan_transaction_create', url: `https://apilist.tronscanapi.com/api/transaction?sort=-timestamp&count=true&limit=200&start=0&address=${ADDR}&type=CreateSmartContract` },
  { id: 'tronscan_vote', url: `https://apilist.tronscanapi.com/api/vote?voter=${ADDR}&limit=200&start=0` },
  { id: 'tronscan_account_resource', url: `https://apilist.tronscanapi.com/api/account/resource?address=${ADDR}&limit=200&start=0&type=1&resourceType=0` },
  { id: 'tronscan_token_asset_overview', url: `https://apilist.tronscanapi.com/api/account/token_asset_overview?address=${ADDR}` },
  { id: 'tronscan_contracts_search', url: `https://apilist.tronscanapi.com/api/contracts?search=${ADDR}&limit=50` },
  { id: 'tronscan_token_trc20_transfers', url: `https://apilist.tronscanapi.com/api/token_trc20/transfers?limit=200&start=0&relatedAddress=${ADDR}` },
  { id: 'tronscan_account_analysis', url: `https://apilist.tronscanapi.com/api/account/analysis?address=${ADDR}&type=0&start_timestamp=1772500851000&end_timestamp=1773400000000` },
  // TronGrid
  { id: 'trongrid_v1_accounts', url: `https://api.trongrid.io/v1/accounts/${ADDR}` },
  { id: 'trongrid_v1_transactions', url: `https://api.trongrid.io/v1/accounts/${ADDR}/transactions?limit=200` },
  { id: 'trongrid_v1_trc20', url: `https://api.trongrid.io/v1/accounts/${ADDR}/transactions/trc20?limit=100` },
  // 3xpl (API pública)
  { id: '3xpl_address', url: `https://3xpl.com/tron/address/${ADDR}` },
];

async function run() {
  console.log('=== BÚSQUEDA EXHAUSTIVA TODAS LAS RUTAS ===');
  console.log('Dirección:', ADDR);
  console.log('');
  const results = [];
  for (const r of ROUTES) {
    try {
      const data = await get(r.url);
      const status = data._status ?? 200;
      const ok = status >= 200 && status < 300;
      results.push({
        route: r.id,
        url: r.url,
        status: ok ? 'OK' : ('HTTP ' + status),
        hasData: ok && !data._status && Object.keys(data).filter(k => !k.startsWith('_')).length > 0
      });
      if (ok && r.id === 'trongrid_v1_accounts' && data.data?.[0]) {
        const acc = data.data[0];
        console.log('[TronGrid v1] Balance:', (acc.balance || 0) / 1e6, 'TRX');
        if (acc.trc20 && Object.keys(acc.trc20).length) {
          console.log('[TronGrid v1] TRC20:', JSON.stringify(acc.trc20, null, 2));
        }
        if (acc.unfrozenV2?.length) {
          console.log('[TronGrid v1] unfrozenV2:', JSON.stringify(acc.unfrozenV2));
        }
      }
      if (ok && r.id === 'tronscan_token_asset_overview' && data.totalAssetInTrx != null) {
        console.log('[Tronscan token_asset_overview] totalAssetInTrx:', data.totalAssetInTrx);
      }
      await new Promise(x => setTimeout(x, 300));
    } catch (e) {
      results.push({ route: r.id, url: r.url, status: 'ERR: ' + (e.message || 'unknown') });
    }
  }
  console.log('\n=== MATRIZ DE RUTAS ===');
  console.table(results);
  return results;
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
