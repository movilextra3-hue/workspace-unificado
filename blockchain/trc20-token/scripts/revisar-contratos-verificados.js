#!/usr/bin/env node
'use strict';
/**
 * Revisión completa de contratos verificados y datos en mainnet.
 * Lee direcciones de abi/addresses.json y datos esperados de abi/token-info.json.
 * Usa implementation() on-chain como fuente de verdad para Proxy→Implementation.
 *
 * Uso: node scripts/revisar-contratos-verificados.js
 */
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const https = require('node:https');
const fs = require('node:fs');

const ROOT = path.join(__dirname, '..');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function loadAddresses() {
  const p = path.join(ROOT, 'abi', 'addresses.json');
  if (!fs.existsSync(p)) throw new Error('Falta abi/addresses.json');
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  return {
    token: j.tokenAddress,
    implementation: j.implementationAddress,
    proxyAdmin: j.proxyAdminAddress
  };
}

function loadEsperado() {
  const p = path.join(ROOT, 'abi', 'token-info.json');
  if (!fs.existsSync(p)) throw new Error('Falta abi/token-info.json');
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  return {
    name: j.name || 'Colateral USD',
    symbol: j.symbol || 'USTD',
    decimals: String(j.decimals ?? 6),
    owner: j.owner || null
  };
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

const API_KEY = process.env.TRON_PRO_API_KEY || '';

function post(apiPath, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body || {});
    const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) };
    if (API_KEY) headers['TRON-PRO-API-KEY'] = API_KEY;
    const req = https.request({
      hostname: 'api.trongrid.io',
      path: apiPath.startsWith('/') ? apiPath : '/' + apiPath,
      method: 'POST',
      headers
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

function triggerConstant(addr, fn, param, ownerAddress) {
  return post('wallet/triggerconstantcontract', {
    owner_address: ownerAddress || addr,
    contract_address: addr,
    function_selector: fn,
    parameter: param || '',
    visible: true
  });
}

function hexToAddress(hex) {
  if (!hex || typeof hex !== 'string') return null;
  const h = hex.replace(/^0x/, '');
  if (h.length < 64) return null;
  try {
    const TronWeb = require('tronweb');
    const tw = new (TronWeb.default || TronWeb)({ fullHost: 'https://api.trongrid.io' });
    return tw.address.fromHex('41' + h.slice(24, 64));
  } catch { return '41' + h.slice(24, 64); }
}

function hexToUint(hex) {
  if (!hex || typeof hex !== 'string') return null;
  const h = hex.replace(/^0x/, '');
  if (h.length < 64) return null;
  return BigInt('0x' + h).toString();
}

function hexToString(hex) {
  if (!hex || typeof hex !== 'string') return null;
  const h = hex.replace(/^0x/, '');
  if (h.length < 128) return null;
  try {
    const len = parseInt(h.slice(64, 128), 16);
    return Buffer.from(h.slice(128, 128 + len * 2), 'hex').toString('utf8');
  } catch { return null; }
}

function hexToBool(hex) {
  const n = hexToUint(hex);
  return n !== null ? n !== '0' : null;
}

function sameAddress(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  try {
    const TronWeb = require('tronweb');
    const tw = new (TronWeb.default || TronWeb)({ fullHost: 'https://api.trongrid.io' });
    const ba = a.startsWith('41') ? tw.address.fromHex(a) : a;
    const bb = b.startsWith('41') ? tw.address.fromHex(b) : b;
    return ba === bb;
  } catch {
    return a === b;
  }
}

async function main() {
  const ADDRESSES = loadAddresses();
  const ESPERADO = loadEsperado();

  console.log('\n=== REVISIÓN CONTRATOS VERIFICADOS Y DATOS MAINNET ===\n');
  console.log('Fecha:', new Date().toISOString());
  console.log('');

  const report = { ok: true, errores: [], verificaciones: [] };

  // 1. Tronscan API: estado verificación y datos contrato
  console.log('--- 1. Estado en Tronscan (API) ---');
  const tronscan = {};
  for (const [key, addr] of Object.entries(ADDRESSES)) {
    try {
      const r = await get('https://apilist.tronscanapi.com/api/contract?contract=' + encodeURIComponent(addr));
      const d = r.data?.[0];
      if (d) {
        tronscan[key] = {
          name: d.name,
          verified: d.verify_status === 2,
          creator: d.creator?.address,
          proxyImpl: d.proxy_implementation,
          abi: d.abi
        };
        const v = d.verify_status === 2 ? '✅ VERIFICADO' : '❌ No verificado';
        console.log(`  ${key}: ${d.name} | ${v} | creador ${(d.creator?.address || '').slice(0, 16)}...`);
      } else {
        tronscan[key] = { verified: false };
        console.log(`  ${key}: (no data)`);
      }
    } catch (e) {
      console.log(`  ${key}: error ${e.message}`);
      report.errores.push(`Tronscan ${key}: ${e.message}`);
    }
    await sleep(350);
  }
  await sleep(500);

  // 2. Datos on-chain (token vía Proxy)
  console.log('--- 2. Datos on-chain (Proxy) ---');
  const tokenCalls = [
    { fn: 'name()', key: 'name', parser: (r) => hexToString(r.constant_result?.[0]) },
    { fn: 'symbol()', key: 'symbol', parser: (r) => hexToString(r.constant_result?.[0]) },
    { fn: 'decimals()', key: 'decimals', parser: (r) => hexToUint(r.constant_result?.[0]) },
    { fn: 'totalSupply()', key: 'totalSupply', parser: (r) => hexToUint(r.constant_result?.[0]) },
    { fn: 'owner()', key: 'owner', parser: (r) => hexToAddress(r.constant_result?.[0]) },
    { fn: 'paused()', key: 'paused', parser: (r) => hexToBool(r.constant_result?.[0]) },
    { fn: 'version()', key: 'version', parser: (r) => hexToUint(r.constant_result?.[0]) }
  ];

  const onChain = {};
  for (const c of tokenCalls) {
    const r = await triggerConstant(ADDRESSES.token, c.fn);
    if (r.Error || r.code) onChain[c.key] = null;
    else onChain[c.key] = c.parser(r);
    await new Promise(ok => setTimeout(ok, 300));
  }

  console.log('  name:       ', onChain.name ?? '(error)');
  console.log('  symbol:     ', onChain.symbol ?? '(error)');
  console.log('  decimals:   ', onChain.decimals ?? '(error)');
  console.log('  totalSupply:', onChain.totalSupply ?? '(error)');
  console.log('  owner:      ', onChain.owner ?? '(error)');
  console.log('  paused:     ', onChain.paused ?? '(error)');
  console.log('  version:    ', onChain.version ?? '(error)');
  console.log('');

  // 3. Comparación con esperado
  console.log('--- 3. Comparación con datos esperados ---');
  const checks = [
    { label: 'name', actual: onChain.name, esperado: ESPERADO.name },
    { label: 'symbol', actual: onChain.symbol, esperado: ESPERADO.symbol },
    { label: 'decimals', actual: onChain.decimals, esperado: ESPERADO.decimals },
    { label: 'owner', actual: onChain.owner, esperado: ESPERADO.owner }
  ];

  for (const c of checks) {
    const ok = String(c.actual) === String(c.esperado);
    console.log(`  ${c.label}: ${ok ? '✅' : '❌'} actual="${c.actual}" esperado="${c.esperado}"`);
    if (!ok && (c.esperado != null && c.esperado !== '')) {
      report.errores.push(`${c.label}: esperado ${c.esperado}, actual ${c.actual}`);
    }
  }
  console.log('');

  // 4. Proxy → Implementation (implementation() on-chain como fuente de verdad)
  console.log('--- 4. Proxy → Implementation ---');
  const implRes = await triggerConstant(ADDRESSES.token, 'implementation()');
  const onChainImpl = (implRes.Error || implRes.code) ? null : hexToAddress(implRes.constant_result?.[0]);
  await new Promise(ok => setTimeout(ok, 300));
  const implTronscan = tronscan.token?.proxyImpl;
  console.log('  On-chain implementation():   ', onChainImpl ?? '(error)');
  console.log('  Tronscan proxy_implementation:', implTronscan ?? '(N/A)');
  console.log('  Esperado (addresses.json):    ', ADDRESSES.implementation);
  const implOk = onChainImpl && (onChainImpl === ADDRESSES.implementation || sameAddress(onChainImpl, ADDRESSES.implementation));
  if (implTronscan && implTronscan !== ADDRESSES.implementation && implOk) {
    console.log('  ⚠ Tronscan puede tener caché; on-chain coincide con addresses.json.');
  }
  console.log('  ¿Coincide (on-chain)?      ', implOk ? '✅ SÍ' : (onChainImpl ? '❌ NO' : '⚠ Sin datos'));
  if (onChainImpl && !implOk) report.errores.push(`Proxy implementation: on-chain=${onChainImpl}, addresses.json=${ADDRESSES.implementation}`);
  console.log('');

  // 5. ProxyAdmin owner
  console.log('--- 5. ProxyAdmin owner ---');
  const adminOwnerRes = await triggerConstant(ADDRESSES.proxyAdmin, 'owner()');
  const adminOwner = (adminOwnerRes.Error || adminOwnerRes.code) ? null : hexToAddress(adminOwnerRes.constant_result?.[0]);
  console.log('  ProxyAdmin.owner: ', adminOwner ?? '(error)');
  console.log('  Esperado:         ', ESPERADO.owner);
  const adminOk = adminOwner === ESPERADO.owner;
  console.log('  ¿Coincide?:       ', adminOk ? '✅ SÍ' : ESPERADO.owner ? '❌ NO' : '⚠ (owner no en token-info)');
  if (!adminOk && ESPERADO.owner) report.errores.push(`ProxyAdmin owner: esperado ${ESPERADO.owner}, actual ${adminOwner}`);
  console.log('');

  // 6. Contratos locales vs verificados (nombres)
  console.log('--- 6. Contratos locales vs Tronscan ---');
  const proxyName = tronscan.token?.name || '';
  const adminName = tronscan.proxyAdmin?.name || '';
  console.log('  Tronscan Proxy:   ', proxyName, proxyName.includes('TransparentUpgradeableProxy') || proxyName.includes('Proxy') ? '✅' : '⚠');
  console.log('  Tronscan Admin:   ', adminName, adminName.includes('ProxyAdmin') ? '✅' : '⚠');
  console.log('  Local Proxy:      TransparentUpgradeableProxy');
  console.log('  Local Admin:       ProxyAdmin');
  console.log('');

  // 7. ABI Implementation (Tronscan vs local)
  console.log('--- 7. ABI Implementation ---');
  const localAbi = JSON.parse(fs.readFileSync(path.join(ROOT, 'abi', 'token-info.json'), 'utf8')).abi;
  const tronscanAbi = tronscan.implementation?.abi || [];
  const localSelectors = new Set((localAbi || []).filter(x => x.type === 'function').map(f => {
    const params = (f.inputs || []).map(i => i.type).join(',');
    return `${f.name}(${params})`;
  }));
  const tronSelectors = new Set((tronscanAbi || []).filter(x => x.type === 'function').map(f => {
    const params = (f.inputs || []).map(i => i.type).join(',');
    return `${f.name}(${params})`;
  }));
  const implVerified = tronscan.implementation?.verified;
  if (implVerified && tronSelectors.size > 0) {
    const diff = [...localSelectors].filter(s => !tronSelectors.has(s));
    const missing = [...tronSelectors].filter(s => !localSelectors.has(s));
    console.log('  Impl verificada:   Sí (ABI en Tronscan)');
    if (diff.length) console.log('  En local no en Tronscan:', diff.slice(0, 5).join(', '), diff.length > 5 ? '...' : '');
    if (missing.length) console.log('  En Tronscan no en local:', missing.slice(0, 5).join(', '), missing.length > 5 ? '...' : '');
  } else {
    console.log('  Impl verificada:   No (TXaXTSUK sin verificar en Tronscan)');
    console.log('  ABI local:', localSelectors.size, 'funciones');
  }
  console.log('');

  // Resumen
  console.log('=== RESUMEN ===');
  report.ok = report.errores.length === 0;
  console.log('Verificados Proxy:  ', tronscan.token?.verified ? '✅' : '❌');
  console.log('Verificados Admin:  ', tronscan.proxyAdmin?.verified ? '✅' : '❌');
  console.log('Verificados Impl:   ', tronscan.implementation?.verified ? '✅' : '❌');
  console.log('Datos token:        ', checks.every(c => String(c.actual) === String(c.esperado)) ? '✅ correctos' : '❌ discrepancia');
  console.log('Proxy→Implementation:', implOk ? '✅ correcto' : '❌ incorrecto');
  console.log('ProxyAdmin owner:   ', adminOk ? '✅ correcto' : '❌ incorrecto');
  console.log('Errores:', report.errores.length || 'ninguno');
  if (report.errores.length) report.errores.forEach(e => console.log('  -', e));
  console.log('');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
