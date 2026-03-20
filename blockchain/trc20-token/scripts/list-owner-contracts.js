#!/usr/bin/env node
/**
 * Lista todos los contratos desplegados en mainnet por el owner.
 * Usa Trongrid v1/accounts/.../transactions y gettransactioninfobyid.
 * Uso: node scripts/list-owner-contracts.js [owner_address]
 */
'use strict';
const https = require('node:https');
const { TronWeb } = require('tronweb');

const args = process.argv.slice(2).filter(a => !a.startsWith('-'));
const OWNER = args[0] || 'TWYhXqeMMtEePYnk2WdhoyyvHWxA1ay9Gz';

function get(url) {
  return new Promise((res, rej) => {
    https.get(url, (r) => {
      let b = '';
      r.on('data', c => b += c);
      r.on('end', () => {
        try { res(JSON.parse(b || '{}')); } catch (e) { res({}); }
      });
    }).on('error', rej);
  });
}

function post(path, body) {
  return new Promise((res, rej) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: 'api.trongrid.io',
      path,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, (r) => {
      let b = '';
      r.on('data', c => b += c);
      r.on('end', () => {
        try { res(JSON.parse(b)); } catch (e) { res({}); }
      });
    });
    req.on('error', rej);
    req.write(data);
    req.end();
  });
}

async function main() {
  const tronWeb = new TronWeb({ fullHost: 'https://api.trongrid.io' });
  const toBase58 = (hex) => {
    if (!hex || typeof hex !== 'string') return null;
    const h = hex.replace(/^0x/, '');
    if (h.length < 4) return null;
    try {
      return tronWeb.address.fromHex(h.startsWith('41') ? h : '41' + h.replace(/^41/, ''));
    } catch (e) {
      return hex;
    }
  };

  let allTx = [];
  let minTs = 0;
  for (let i = 0; i < 10; i++) {
    const url = minTs
      ? `https://api.trongrid.io/v1/accounts/${OWNER}/transactions?limit=200&min_timestamp=${minTs}`
      : `https://api.trongrid.io/v1/accounts/${OWNER}/transactions?limit=200`;
    const r = await get(url);
    const data = r.data || [];
    if (data.length === 0) break;
    const creates = data.filter(t => t.raw_data?.contract?.[0]?.type === 'CreateSmartContract');
    allTx = allTx.concat(creates);
    minTs = data[data.length - 1]?.block_timestamp;
    if (data.length < 200) break;
    await new Promise(r => setTimeout(r, 300));
  }

  console.log('Owner:', OWNER);
  console.log('CreateSmartContract tx encontradas:', allTx.length);
  console.log('');

  const results = [];
  for (const t of allTx) {
    const info = await post('/wallet/gettransactioninfobyid', { value: t.txID });
    const hexAddr = info.contract_address;
    const name = t.raw_data?.contract?.[0]?.parameter?.value?.new_contract?.name || '?';
    const ts = t.block_timestamp ? new Date(t.block_timestamp).toISOString().slice(0, 10) : '';
    const receipt = info.receipt?.result;
    let base58 = null;
    if (hexAddr) {
      base58 = toBase58(hexAddr);
      if (!base58 && hexAddr.length === 42) base58 = toBase58('41' + hexAddr.slice(2));
    }
    results.push({
      base58: base58 || hexAddr || '(reverted)',
      name,
      ts,
      receipt,
      txID: t.txID,
      txIDShort: t.txID?.slice(0, 16),
      hexAddr,
      energy: info.receipt?.energy_usage_total,
      fee: info.fee,
      netUsage: info.receipt?.net_usage
    });
    await new Promise(r => setTimeout(r, 150));
  }

  results.sort((a, b) => a.ts.localeCompare(b.ts));
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    results.forEach((r, i) => {
      console.log(`${(i + 1).toString().padStart(2)}. ${r.base58} | ${r.name} | ${r.ts}`);
    });
  }
  return results;
}

main()
  .then((r) => {
    console.log('');
    console.log('Total:', r?.length ?? 0, 'contratos');
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
