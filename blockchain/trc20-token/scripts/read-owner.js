#!/usr/bin/env node
'use strict';
/**
 * Lee owner() del token (Proxy TV4P3sVf) vía TronGrid triggerconstantcontract.
 * Uso: node scripts/read-owner.js
 */
const https = require('node:https');

const PROXY = 'TV4P3sVfSQULNnsCPyzLnofCbK6cwkHeDm';

function post(body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: 'api.trongrid.io',
      path: '/wallet/triggerconstantcontract',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, (res) => {
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

async function main() {
  const r = await post({
    owner_address: 'TWYhXqeMMtEePYnk2WdhoyyvHWxA1ay9Gz',
    contract_address: PROXY,
    function_selector: 'owner()',
    parameter: '',
    visible: true
  });

  const first = r.constant_result?.[0];
  if (first) {
    const hex = first.replace(/^0x/, '');
    if (hex.length >= 64) {
      const addrHex = '41' + hex.slice(24, 64);
      const TronWeb = require('tronweb');
      const tw = new (TronWeb.default || TronWeb)({ fullHost: 'https://api.trongrid.io' });
      const base58 = tw.address.fromHex(addrHex);
      console.log('Owner (token TV4P3sVf):', base58);
      console.log('Creator (deployer):     TWYhXqeMMtEePYnk2WdhoyyvHWxA1ay9Gz');
      return;
    }
  }
  console.log('Respuesta:', JSON.stringify(r, null, 2));
}

(async () => { try { await main(); } catch (e) { console.error(e); process.exit(1); } })(); // NOSONAR - CommonJS
