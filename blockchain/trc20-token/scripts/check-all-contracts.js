#!/usr/bin/env node
'use strict';
/**
 * Comprueba TODOS los contratos: alineación, verificación, owner.
 * Los 7 contratos del token TRON mainnet.
 * Uso: node scripts/check-all-contracts.js
 */
const https = require('node:https');
const { TronWeb } = require('tronweb');

const DEPLOYER = 'TWYhXqeMMtEePYnk2WdhoyyvHWxA1ay9Gz';

const ALL_CONTRACTS = [
  { addr: 'TV4P3sVfSQULNnsCPyzLnofCbK6cwkHeDm', name: 'Proxy (Token)', role: 'token' },
  { addr: 'TNduz3PrYRDDN9HmEWXFn3nEsXKCaJt9er', name: 'Implementation v3', role: 'impl' },
  { addr: 'TPK7VWSGSH1nK4jetcNCz1BQqMU7gmnaLe', name: 'Implementation v2', role: 'impl' },
  { addr: 'TYqRvxioNWBqVa2nJGog8RkYQrXQdPJwR3', name: 'Implementation v1', role: 'impl' },
  { addr: 'TVeVPZGiMc9GWQ8sQHvUwhfg19EDZt3UjZ', name: 'ProxyAdmin (activo)', role: 'admin' },
  { addr: 'TQJ6f3eczr2rK9x9kN2JMTdDN1zTm46XxE', name: 'ProxyAdmin', role: 'admin' },
  { addr: 'TTTT4AeRUjJEmTepb9X4uK4f6Pxg8UwwkW', name: 'ProxyAdmin', role: 'admin' }
];

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

function get(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; check-all-contracts/1.0)' }
    };
    https.get(url, opts, (res) => {
      let buf = '';
      res.on('data', c => { buf += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(buf || '{}')); } catch { resolve({}); }
      });
    }).on('error', reject);
  });
}

function hexToBase58(hex) {
  try {
    const tw = new TronWeb({ fullHost: 'https://api.trongrid.io' });
    const h = String(hex).replace(/^0x/, '');
    let addrHex;
    if (h.length === 40) addrHex = '41' + h;
    else if (h.startsWith('41')) addrHex = h;
    else addrHex = '41' + h;
    return tw.address.fromHex(addrHex);
  } catch {
    return hex;
  }
}

async function trigger(contract, fn, param = '') {
  const r = await post({
    owner_address: DEPLOYER,
    contract_address: contract,
    function_selector: fn,
    parameter: param,
    visible: true
  });
  if (r.constant_result?.[0]) {
    const hex = r.constant_result[0].replace(/^0x/, '');
    if (hex.length >= 40) {
      const addrHex = hex.length === 40 ? '41' + hex : '41' + hex.slice(-40);
      return hexToBase58(addrHex);
    }
  }
  return null;
}

async function checkVerify(addr) {
  const r = await get('https://apilist.tronscanapi.com/api/contract?contract=' + encodeURIComponent(addr));
  const d = r.data?.[0];
  const status = d ? (d.verify_status ?? 0) : 0;
  return { verified: status === 2 || status === '2', name: d?.name, proxyImpl: d?.proxy_implementation };
}

async function main() {
  console.log('\n=== Comprobación de TODOS los contratos ===\n');
  console.log('Deployer:', DEPLOYER);
  console.log('');

  const PROXY = 'TV4P3sVfSQULNnsCPyzLnofCbK6cwkHeDm';
  const EXPECTED_IMPL = 'TNduz3PrYRDDN9HmEWXFn3nEsXKCaJt9er';

  const impl = await trigger(PROXY, 'implementation()');
  const owner = await trigger(PROXY, 'owner()');

  console.log('--- Alineación (Proxy TV4P3sVf) ---');
  console.log('  Implementation actual:', impl || '(error)');
  console.log('  Owner (token):       ', owner || '(error)');
  console.log('  Esperado impl:       ', EXPECTED_IMPL);
  console.log('  Implementation OK:   ', impl === EXPECTED_IMPL ? '✓' : '✗');
  console.log('  Owner = Deployer:    ', owner === DEPLOYER ? '✓' : '✗');
  console.log('');

  console.log('--- Verificación TronScan (7 contratos) ---');
  let verified = 0;
  for (const c of ALL_CONTRACTS) {
    const v = await checkVerify(c.addr);
    if (v.verified) verified++;
    const label = v.verified ? '✓' : ' ';
    console.log(`  ${label} ${c.name.padEnd(22)} ${c.addr}  ${v.name || ''}`);
    if (v.proxyImpl) console.log(`      proxy_implementation: ${v.proxyImpl}`);
  }
  console.log('');
  console.log('  Verificados:', verified + '/7');
  console.log('');

  const aligned = impl === EXPECTED_IMPL && owner === DEPLOYER;
  console.log('--- Resumen ---');
  console.log('  Alineados (Proxy→TNduz3, Owner=Deployer):', aligned ? '✓ SÍ' : '✗ NO');
  console.log('  Verificados en TronScan:                   ', verified + '/7');
  console.log('');
  process.exit(aligned ? 0 : 1);
}

main().catch((err) => { console.error(err); process.exit(2); });
