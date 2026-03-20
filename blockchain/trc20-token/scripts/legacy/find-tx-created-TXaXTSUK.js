#!/usr/bin/env node
'use strict';
/**
 * Obtiene todas las CreateSmartContract del owner TWYhXqe y busca cuál creó TXaXTSUK.
 */
const https = require('node:https');
let tw;
try {
  const TronWeb = require('tronweb').TronWeb || require('tronweb');
  tw = new TronWeb({ fullHost: 'https://api.trongrid.io' });
} catch (_) { /* TronWeb no disponible */ }

const OWNER = 'TWYhXqeMMtEePYnk2WdhoyyvHWxA1ay9Gz';
const TARGET = 'TXaXTSUKgdAdX76MhQoqQ98msE8azBwiFS';
const TARGET_HEX = tw?.address?.toHex ? tw.address.toHex(TARGET) : null;

function hexToB58(hex) {
  if (!tw?.address?.fromHex) return hex;
  try { return tw.address.fromHex(hex); } catch { return hex; }
}

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: 'api.trongrid.io',
      path,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, (res) => {
      let buf = '';
      res.on('data', c => { buf += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(buf)); } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  let all = [];
  let fingerPrint = null;
  const limit = 50;
  do {
    const q = new URLSearchParams({ limit, order_by: 'block_timestamp,desc' });
    if (fingerPrint) q.set('fingerprint', fingerPrint);
    const path = '/v1/accounts/' + OWNER + '/transactions?' + q.toString();
    const resp = await new Promise((resolve, reject) => {
      https.get('https://api.trongrid.io' + path, (res) => {
        let buf = '';
        res.on('data', c => { buf += c; });
        res.on('end', () => { try { resolve(JSON.parse(buf)); } catch (e) { reject(e); } });
      }).on('error', reject);
    });
    const txList = resp.data || [];
    if (txList.length === 0) break;
    all = all.concat(txList);
    fingerPrint = resp.meta?.fingerprint;
    if (!fingerPrint || txList.length < limit) break;
  } while (true); // eslint-disable-line no-constant-condition

  const create = all.filter(t => {
    const c = t.raw_data?.contract?.[0];
    return c?.type === 'CreateSmartContract';
  });
  console.log('CreateSmartContract:', create.length);
  const delay = (ms) => new Promise(r => setTimeout(r, ms));
  for (let i = 0; i < create.length; i++) {
    if (i > 0) await delay(400);
    const t = create[i];
    const txHash = t.txID || t.tx_id;
    const info = await post('/wallet/gettransactioninfobyid', { value: txHash });
    let hexAddr = info?.contract_address || info?.contractAddress || info?.contractAddress?.value;
    if (typeof hexAddr === 'object' && hexAddr?.value) hexAddr = hexAddr.value;
    if (hexAddr) hexAddr = String(hexAddr).replace(/^0x/, '');
    const addr = hexAddr ? hexToB58(hexAddr) : null;
    console.log((i + 1) + '.', txHash, '->', addr || hexAddr || '(sin addr)');
    const isTarget = addr === TARGET || (hexAddr && TARGET_HEX && hexAddr.replace(/^0x/, '').toLowerCase() === TARGET_HEX.replace(/^0x/, '').toLowerCase());
    if (isTarget) {
      console.log('\n*** TXaXTSUK creada por tx:', txHash, '***');
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
