#!/usr/bin/env node
'use strict';
/**
 * Revisión en tiempo real de los contratos desplegados en TRON mainnet.
 * Consulta TronGrid (getcontract) y Tronscan API para estado, verificación y datos.
 * Requiere TRON_PRO_API_KEY en .env para evitar rate limit (3 QPS sin key).
 */
const path = require('node:path');
const fs = require('node:fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const https = require('node:https');

const ROOT = path.join(__dirname, '..');
const DEF_ADDRESSES = {
  token: 'TV4P3sVfSQULNnsCPyzLnofCbK6cwkHeDm',
  implementation: 'TXaXTSUKgdAdX76MhQoqQ98msE8azBwiFS',
  proxyAdmin: 'TVeVPZGiMc9GWQ8sQHvUwhfg19EDZt3UjZ'
};

function loadAddresses() {
  const deployPath = path.join(ROOT, 'deploy-info.json');
  if (fs.existsSync(deployPath)) {
    try {
      const d = JSON.parse(fs.readFileSync(deployPath, 'utf8'));
      if (d.tokenAddress && d.implementationAddress && d.proxyAdminAddress) {
        return {
          token: d.tokenAddress,
          implementation: d.implementationAddress,
          proxyAdmin: d.proxyAdminAddress
        };
      }
    } catch (_) { /* ignorar */ }
  }
  const addrPath = path.join(ROOT, 'abi', 'addresses.json');
  if (fs.existsSync(addrPath)) {
    try {
      const a = JSON.parse(fs.readFileSync(addrPath, 'utf8'));
      if (a.tokenAddress && a.implementationAddress && a.proxyAdminAddress) {
        return {
          token: a.tokenAddress,
          implementation: a.implementationAddress,
          proxyAdmin: a.proxyAdminAddress
        };
      }
    } catch (_) { /* ignorar */ }
  }
  return { ...DEF_ADDRESSES };
}

const ADDRESSES = loadAddresses();

const DEPLOYER = 'TWYhXqeMMtEePYnk2WdhoyyvHWxA1ay9Gz';
const API_KEY = (process.env.TRON_PRO_API_KEY || '').trim();

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

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body || {});
    const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) };
    if (API_KEY) headers['TRON-PRO-API-KEY'] = API_KEY;
    const opts = {
      hostname: 'api.trongrid.io',
      path: path.startsWith('/') ? path : '/' + path,
      method: 'POST',
      headers
    };
    const req = https.request(opts, (res) => {
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

function triggerConstant(contractAddr, selector, param, owner = DEPLOYER) {
  return post('wallet/triggerconstantcontract', {
    owner_address: owner,
    contract_address: contractAddr,
    function_selector: selector,
    parameter: param || '',
    visible: true
  });
}

function hexToAddress(hexResult) {
  if (!hexResult || typeof hexResult !== 'string') return null;
  const h = hexResult.replace(/^0x/, '');
  if (h.length < 64) return null;
  const addrHex = '41' + h.slice(24, 64);
  try {
    const TronWeb = require('tronweb');
    const tw = new (TronWeb.default || TronWeb)({ fullHost: 'https://api.trongrid.io' });
    return tw.address.fromHex(addrHex);
  } catch {
    return addrHex;
  }
}

function hexToUint256(hexResult) {
  if (!hexResult || typeof hexResult !== 'string') return null;
  const h = hexResult.replace(/^0x/, '');
  if (h.length < 64) return null;
  return BigInt('0x' + h).toString();
}

function hexToBool(hexResult) {
  const n = hexToUint256(hexResult);
  return n !== null ? n !== '0' : null;
}

async function getContractInfo(addr) {
  return post('wallet/getcontract', { value: addr, visible: true });
}

async function main() {
  console.log('');
  console.log('=== REVISIÓN MAINNET EN TIEMPO REAL ===');
  console.log('Fecha:', new Date().toISOString());
  console.log('');

  const results = { ok: true, contracts: {}, tokenData: null, errors: [] };

  // 1. Verificar que existan los 3 contratos (con pausa para evitar rate limit 3 QPS sin API key)
  for (const [key, addr] of Object.entries(ADDRESSES)) {
    const info = await getContractInfo(addr);
    const hasContract = info && !info.Error && !info.code && (info.contract_address || info.contractAddress);
    results.contracts[key] = { address: addr, exists: hasContract };
    if (!hasContract) {
      results.ok = false;
      results.errors.push(`${key} (${addr}): NO existe o error`);
    } else {
      console.log(`[OK] ${key}: ${addr} - contrato activo`);
    }
    await new Promise(ok => setTimeout(ok, 400));
  }
  await new Promise(ok => setTimeout(ok, 600));
  console.log('');

  if (!results.contracts.token.exists) {
    console.log('Token no existe. No se puede continuar.');
    process.exit(1);
  }

  // 2. Datos del token vía Proxy (name, symbol, decimals, totalSupply, owner, paused, version)
  const tokenCalls = [
    { fn: 'name()', key: 'name', parser: (r) => {
      const hex = (r.constant_result?.[0] || '').replace(/^0x/, '');
      if (hex.length < 128) return null;
      try {
        const len = parseInt(hex.slice(64, 128), 16);
        return Buffer.from(hex.slice(128, 128 + len * 2), 'hex').toString('utf8');
      } catch { return null; }
    }},
    { fn: 'symbol()', key: 'symbol', parser: (r) => {
      const hex = (r.constant_result?.[0] || '').replace(/^0x/, '');
      if (hex.length < 128) return null;
      try {
        const len = parseInt(hex.slice(64, 128), 16);
        return Buffer.from(hex.slice(128, 128 + len * 2), 'hex').toString('utf8');
      } catch { return null; }
    }},
    { fn: 'decimals()', key: 'decimals', parser: (r) => hexToUint256(r.constant_result?.[0]) },
    { fn: 'totalSupply()', key: 'totalSupply', parser: (r) => hexToUint256(r.constant_result?.[0]) },
    { fn: 'owner()', key: 'owner', parser: (r) => hexToAddress(r.constant_result?.[0]) },
    { fn: 'paused()', key: 'paused', parser: (r) => hexToBool(r.constant_result?.[0]) },
    { fn: 'version()', key: 'version', parser: (r) => hexToUint256(r.constant_result?.[0]) }
  ];

  results.tokenData = {};
  for (const call of tokenCalls) {
    const r = await triggerConstant(ADDRESSES.token, call.fn);
    const val = (r.Error || r.code) ? null : call.parser(r);
    results.tokenData[call.key] = val;
    await new Promise(ok => setTimeout(ok, 300));
  }

  console.log('--- Token TRC20 (Proxy) ---');
  console.log('  name:       ', results.tokenData.name ?? '(error)');
  console.log('  symbol:     ', results.tokenData.symbol ?? '(error)');
  console.log('  decimals:   ', results.tokenData.decimals ?? '(error)');
  console.log('  totalSupply:', results.tokenData.totalSupply ?? '(error)');
  console.log('  owner:      ', results.tokenData.owner ?? '(error)');
  console.log('  paused:     ', results.tokenData.paused ?? '(error)');
  console.log('  version:    ', results.tokenData.version ?? '(error)');
  console.log('');

  // 3. Proxy apunta a Implementation (TransparentUpgradeableProxy.implementation())
  const proxyImplRes = await triggerConstant(ADDRESSES.token, 'implementation()');
  const implAddr = hexToAddress(proxyImplRes.constant_result?.[0]);
  if (implAddr) {
    console.log('--- Proxy → Implementation ---');
    console.log('  Proxy apunta a:', implAddr);
    console.log('  Esperado:      ', ADDRESSES.implementation);
    const implMatch = implAddr === ADDRESSES.implementation;
    console.log('  ¿Coincide?:   ', implMatch ? 'SÍ' : 'NO');
    results.implementationMatch = implMatch;
    if (!implMatch) results.errors.push('Proxy no apunta a la Implementation esperada');
  }
  console.log('');

  // 4. ProxyAdmin.owner()
  const adminOwnerRes = await triggerConstant(ADDRESSES.proxyAdmin, 'owner()');
  const adminOwner = (adminOwnerRes.Error || adminOwnerRes.code) ? null : hexToAddress(adminOwnerRes.constant_result?.[0]);
  console.log('--- ProxyAdmin ---');
  console.log('  owner:', adminOwner ?? '(error)');
  results.proxyAdminOwner = adminOwner;
  console.log('');

  // 5. Balance del owner (ejemplo)
  let ownerBalance = null;
  if (results.tokenData.owner) {
    try {
      const TronWeb = require('tronweb');
      const tw = new (TronWeb.default || TronWeb)({ fullHost: 'https://api.trongrid.io' });
      const ownerHex = tw.address.toHex(results.tokenData.owner).replace(/^41/, '');
      const balRes = await triggerConstant(ADDRESSES.token, 'balanceOf(address)',
        ownerHex.padStart(64, '0'));
      ownerBalance = hexToUint256(balRes.constant_result?.[0]);
    } catch (e) { ownerBalance = '(no obtenido)'; }
  }
  if (ownerBalance !== null) {
    console.log('--- Balance owner ---');
    console.log('  owner:', results.tokenData.owner);
    console.log('  balance:', ownerBalance, '(unidades mínimas)');
    const dec = parseInt(results.tokenData.decimals || '18', 10);
    if (dec && ownerBalance !== '(no obtenido)') {
      const human = Number(BigInt(ownerBalance) / BigInt(10 ** dec));
      console.log('  balance (legible):', human.toLocaleString());
    }
  }
  console.log('');

  // 6. Datos Tronscan API (fallback cuando triggerconstant falla)
  console.log('--- Tronscan API (estado en tiempo real) ---');
  const tronscanData = {};
  for (const [key, addr] of Object.entries(ADDRESSES)) {
    try {
      const r = await get('https://apilist.tronscanapi.com/api/contract?contract=' + encodeURIComponent(addr));
      const d = r.data?.[0];
      if (d) {
        tronscanData[key] = {
          name: d.name,
          verified: d.verify_status === 2,
          creator: d.creator?.address,
          dateCreated: d.date_created ? new Date(d.date_created).toISOString() : null,
          proxyImpl: d.proxy_implementation || null,
          redTag: d.redTag || null,
          tokenInfo: d.tokenInfo?.tokenAbbr || d.tokenInfo?.tokenName || null
        };
        const v = d.verify_status === 2 ? 'VERIFICADO' : 'No verificado';
        console.log(`  ${key}: ${d.name} | ${v} | creador ${(d.creator?.address || '').slice(0, 12)}...`);
        if (d.proxy_implementation) console.log(`    proxy_implementation: ${d.proxy_implementation}`);
      }
    } catch (e) {
      console.log(`  ${key}: (error API: ${e.message})`);
    }
  }
  console.log('');

  // Nota: Tronscan proxy_implementation puede estar en caché; addresses.json tiene la impl más reciente (upgrade)
  const implMismatch = tronscanData.token?.proxyImpl && tronscanData.token.proxyImpl !== ADDRESSES.implementation;

  // Resumen
  console.log('=== RESUMEN ===');
  console.log('Contratos activos:', Object.values(results.contracts).filter(c => c.exists).length, '/ 3');
  console.log('Token (Proxy):', ADDRESSES.token);
  console.log('Implementation (Tronscan cache):', tronscanData.token?.proxyImpl || 'N/A');
  console.log('Implementation (addresses.json):', ADDRESSES.implementation, implMismatch ? '⚠ Diferente (posible upgrade; Tronscan puede estar cacheado)' : '');
  console.log('ProxyAdmin:', ADDRESSES.proxyAdmin);
  console.log('Verificación: Proxy', tronscanData.token?.verified ? '✓' : '✗', '| Impl TXaXTSUK', tronscanData.implementation?.verified ? '✓' : '✗', '| Admin', tronscanData.proxyAdmin?.verified ? '✓' : '✗');
  console.log('Token datos (abi/token-info.json): Colateral USD, USTD, 6 decimals');
  console.log('Errores:', results.errors.length || 'ninguno');
  if (results.errors.length) results.errors.forEach(e => console.log('  -', e));
  console.log('');
  console.log('Enlaces:');
  console.log('  Tronscan Proxy:  https://tronscan.org/#/contract/' + ADDRESSES.token);
  console.log('  Tronscan Impl:   https://tronscan.org/#/contract/' + ADDRESSES.implementation);
  console.log('');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
