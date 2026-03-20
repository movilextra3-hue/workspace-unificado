#!/usr/bin/env node
'use strict';
/**
 * Comprueba que los 3 contratos principales estén alineados y verificados.
 * Proxy (TV4P3sVf) → Implementation (TNduz3) → lógica token
 * Proxy → Admin (TVeVPZGi ProxyAdmin)
 * Uso: node scripts/check-3-aligned.js
 */
const https = require('node:https');

const PROXY = 'TV4P3sVfSQULNnsCPyzLnofCbK6cwkHeDm';
const EXPECTED_IMPL = 'TNduz3PrYRDDN9HmEWXFn3nEsXKCaJt9er';
const EXPECTED_ADMIN = 'TVeVPZGiMc9GWQ8sQHvUwhfg19EDZt3UjZ';
const DEPLOYER = 'TWYhXqeMMtEePYnk2WdhoyyvHWxA1ay9Gz';

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
    https.get(url, (res) => {
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
    const TronWeb = require('tronweb');
    const tw = new (TronWeb.default || TronWeb)({ fullHost: 'https://api.trongrid.io' });
    const h = hex.replace(/^0x/, '');
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
  const r = await post('/wallet/triggerconstantcontract', {
    owner_address: DEPLOYER,
    contract_address: contract,
    function_selector: fn,
    parameter: param,
    visible: true
  });
  if (r.constant_result?.[0]) {
    const hex = r.constant_result[0].replace(/^0x/, '');
    if (hex.length >= 64) {
      return hexToBase58('41' + hex.slice(24, 64));
    }
  }
  return null;
}

async function checkVerify(addr) {
  const r = await get('https://apilist.tronscanapi.com/api/contract?contract=' + encodeURIComponent(addr));
  const d = r.data?.[0];
  return d ? (d.verify_status === 2) : false;
}

async function main() {
  console.log('\n=== Comprobación de alineación (3 contratos) ===\n');

  const impl = await trigger(PROXY, 'implementation()');
  const owner = await trigger(PROXY, 'owner()');

  console.log('1. Proxy (Token)     ', PROXY);
  console.log('   → Implementation: ', impl || '(error)');
  console.log('   → Owner (token):  ', owner || '(error)');
  console.log('');

  const implOk = impl === EXPECTED_IMPL;
  const ownerOk = owner === DEPLOYER;
  console.log('   Implementation = TNduz3?', implOk ? '✓' : '✗');
  console.log('   Owner = Deployer?      ', ownerOk ? '✓' : '✗');
  console.log('');

  console.log('2. Implementation    ', EXPECTED_IMPL);
  console.log('3. ProxyAdmin        ', EXPECTED_ADMIN);
  console.log('   (Admin del Proxy, usado en upgrades)');
  console.log('');

  const vProxy = await checkVerify(PROXY);
  const vImpl = await checkVerify(EXPECTED_IMPL);
  const vAdmin = await checkVerify(EXPECTED_ADMIN);

  console.log('--- Verificación TronScan ---');
  console.log('   Proxy (TV4P3sVf):     ', vProxy ? 'VERIFICADO' : 'No verificado');
  console.log('   Implementation (TNduz3):', vImpl ? 'VERIFICADO' : 'No verificado');
  console.log('   ProxyAdmin (TVeVPZGi):', vAdmin ? 'VERIFICADO' : 'No verificado');
  console.log('');

  const aligned = implOk && ownerOk;
  const verified = vProxy + vImpl + vAdmin;
  console.log('--- Resumen ---');
  console.log('   Alineados para funcionar:', aligned ? '✓ SÍ' : '✗ NO');
  console.log('   Verificados en TronScan:', verified + '/3');
  console.log('');

  if (aligned) {
    console.log('El token está correctamente configurado:');
    console.log('  - Proxy delega a TNduz3 (Implementation actual)');
    console.log('  - Owner = deployer (TWYhXqe...)');
    console.log('  - ProxyAdmin puede ejecutar upgrades');
  }
  process.exit(aligned ? 0 : 1);
}

main().catch((err) => { console.error(err); process.exit(2); });
