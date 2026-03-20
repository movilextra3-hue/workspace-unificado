#!/usr/bin/env node
'use strict';
/**
 * Verifica el historial de transacciones de una dirección en mainnet.
 * Usa TronGrid (API oficial): v1/accounts/{address}/transactions y wallet/gettransactioninfobyid.
 * Referencia: https://developers.tron.network/reference/get-transaction-info-by-contract-address
 *
 * Uso: node scripts/verify-transaction-history.js
 *      ADDRESS=TWYhXqeMMtEePYnk2WdhoyyvHWxA1ay9Gz node scripts/verify-transaction-history.js
 */
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const https = require('node:https');

const ADDRESS = process.env.ADDRESS || 'TWYhXqeMMtEePYnk2WdhoyyvHWxA1ay9Gz';
const HOST = 'api.trongrid.io';
const API_KEY = (process.env.TRON_PRO_API_KEY || '').trim();

function request(method, path, body, apiKey) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const opts = {
      hostname: HOST,
      path,
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (data) opts.headers['Content-Length'] = Buffer.byteLength(data);
    if (apiKey) opts.headers['TRON-PRO-API-KEY'] = apiKey;
    const req = https.request(opts, (res) => {
      let raw = '';
      res.on('data', (c) => { raw += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(raw || '{}')); } catch (e) { resolve({}); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function get(path) {
  return request('GET', path, null, API_KEY);
}

async function getTxDetail(hash) {
  const info = await request('POST', '/wallet/gettransactioninfobyid', { value: hash }, API_KEY);
  const receipt = info.receipt || {};
  const result = receipt.result || '';
  const revert = result === 'REVERT' || result === 'FAILED' || info.result === 'FAILED';
  const confirmed = !!(info.blockNumber || info.block_number);
  const contractRet = result || (revert ? 'REVERT' : 'SUCCESS');
  const contractAddress = info.contract_address || info.contractAddress || '';
  let desc = contractAddress ? 'Contract ' + contractAddress.slice(0, 8) + '...' : 'Transaction';
  if (revert && info.resMessage) desc += ' (revert)';
  return { hash, contractRet, revert, confirmed, contractType: info.contractResult ? 31 : 0, desc };
}

async function main() {
  console.log('Dirección:', ADDRESS);
  console.log('API: TronGrid', HOST, '(referencia: developers.tron.network)\n');

  const listRes = await get('/v1/accounts/' + encodeURIComponent(ADDRESS) + '/transactions?limit=25&order_by=block_timestamp,desc');
  const data = listRes.data || listRes || [];
  const list = Array.isArray(data) ? data : [];
  if (list.length === 0) {
    console.log('No hay transacciones o la API no devolvió datos. Comprueba la dirección y TRON_PRO_API_KEY en .env.');
    return;
  }

  const results = [];
  for (let i = 0; i < list.length; i++) {
    const tx = list[i];
    const hash = tx.txID || tx.tx_id || tx.hash || tx.transaction_id;
    if (!hash) continue;
    const n = results.length + 1;
    process.stderr.write('  Verificando ' + n + '/' + list.length + '...\r');
    const detail = await getTxDetail(hash);
    results.push({
      n,
      hash,
      block: tx.block_number || tx.blockNumber || tx.block,
      timestamp: tx.block_timestamp || tx.timestamp,
      ownerAddress: tx.owner_address || ADDRESS,
      contractType: tx.contractType || detail.contractType,
      confirmed: detail.confirmed,
      revert: detail.revert,
      ...detail
    });
  }
  process.stderr.write(''.padEnd(50) + '\r');

  console.log('--- Resultado verificado (TronGrid) ---\n');
  let ok = 0;
  let fail = 0;
  results.forEach((r) => {
    const status = r.revert ? 'REVERT' : (r.confirmed ? 'OK' : '?');
    if (r.revert) fail++;
    else ok++;
    const ts = r.timestamp ? (r.timestamp < 1e12 ? r.timestamp * 1000 : r.timestamp) : 0;
    const date = ts ? new Date(ts).toISOString().replace('T', ' ').slice(0, 19) + 'Z' : '';
    console.log(r.n + '. ' + status + ' | ' + r.hash.slice(0, 16) + '... | ' + date);
    console.log('   ' + (r.desc || '-'));
    console.log('');
  });

  console.log('--- Resumen ---');
  console.log('Total:', results.length);
  console.log('Éxito (confirmed, no revert):', ok);
  console.log('Fallidas (revert):', fail);
  console.log('');
  console.log('Enlaces Tronscan:');
  results.forEach((r) => {
    console.log('  #' + r.n + ' https://tronscan.org/#/transaction/' + r.hash);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
