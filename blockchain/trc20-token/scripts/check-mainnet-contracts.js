#!/usr/bin/env node
'use strict';
/**
 * Comprueba que los 3 contratos necesarios estén correctamente en mainnet.
 * Usa APIs públicas (Tronscan); opcionalmente Trongrid getcontract si hay TRON_PRO_API_KEY.
 *
 * Uso: node scripts/check-mainnet-contracts.js
 * Direcciones por defecto (deploy actual); se pueden sobreescribir con env:
 *   IMPL_ADDRESS, PROXY_ADDRESS, PROXY_ADMIN_ADDRESS
 */
const https = require('node:https');
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const fs = require('node:fs');
const TRONSCAN = 'apilist.tronscanapi.com';
const DEFAULT_IMPL = 'TYqRvxioNWBqVa2nJGog8RkYQrXQdPJwR3';
const DEFAULT_PROXY = 'TV4P3sVfSQULNnsCPyzLnofCbK6cwkHeDm'; // Proxy actual tras deploy:proxy-only
const DEFAULT_ADMIN = 'TVeVPZGiMc9GWQ8sQHvUwhfg19EDZt3UjZ';

let implAddr = process.env.IMPL_ADDRESS || DEFAULT_IMPL;
let proxyAddr = process.env.PROXY_ADDRESS || DEFAULT_PROXY;
let adminAddr = process.env.PROXY_ADMIN_ADDRESS || DEFAULT_ADMIN;
const deployInfoPath = path.join(__dirname, '..', 'deploy-info.json');
if (fs.existsSync(deployInfoPath)) {
  try {
    const info = JSON.parse(fs.readFileSync(deployInfoPath, 'utf8'));
    if (info.tokenAddress) proxyAddr = info.tokenAddress;
    if (info.implementationAddress) implAddr = info.implementationAddress;
    if (info.proxyAdminAddress) adminAddr = info.proxyAdminAddress;
  } catch (_e) { /* usar defaults o env */ }
}

function get(host, pathname) {
  return new Promise((resolve, reject) => {
    https.get(`https://${host}${pathname}`, (res) => {
      let raw = '';
      res.on('data', (c) => { raw += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(raw || '{}')); } catch (e) { resolve({}); }
      });
    }).on('error', reject);
  });
}

async function checkContract(addr, _label) {
  const r = await get(TRONSCAN, `/api/contract?contract=${addr}`);
  if (r.Error) return { ok: false, name: null, creator: null, msg: `API: ${r.Error}` };
  const data = r.data && r.data[0];
  if (!data || !data.address) return { ok: false, name: null, creator: null, msg: 'Sin datos de contrato en Tronscan (o límite de peticiones)' };
  return {
    ok: true,
    name: data.name || '(sin nombre)',
    creator: data.creator?.address || null,
    msg: `Contrato "${data.name}" – creador ${data.creator?.address || '?'}`
  };
}

async function checkAccount(addr) {
  const r = await get(TRONSCAN, `/api/account?address=${addr}`);
  if (r.Error) return { address: addr, totalTransactionCount: 0, balance: 0, isContract: false };
  const txCount = r.totalTransactionCount ?? r.data?.totalTransactionCount ?? 0;
  const isContract = !!(r.contractMap && r.contractMap[addr]) || r.accountType === 2;
  return {
    address: r.address || addr,
    totalTransactionCount: txCount,
    balance: r.balance,
    isContract
  };
}

async function checkProxyTx(addr) {
  const r = await get(TRONSCAN, `/api/transaction?sort=-timestamp&limit=3&address=${addr}`);
  if (r.Error) return { total: 0, createTx: null };
  const list = r.data || [];
  const createTx = list.find(t => t.contractType === 30);
  return {
    total: r.total ?? 0,
    createTx: createTx ? { hash: createTx.hash, result: createTx.result, contractRet: createTx.contractRet } : null
  };
}

async function main() {
  console.log('Comprobando los 3 contratos en mainnet (Tronscan)...\n');

  // 1. Implementation
  const impl = await checkContract(implAddr, 'Implementation');
  console.log('1. Implementation', implAddr);
  if (impl.ok) {
    console.log('   [OK]', impl.msg);
    if (impl.name !== 'TRC20TokenUpgradeable') console.log('   (Nombre esperado: TRC20TokenUpgradeable)');
  } else {
    console.log('   [FALLO]', impl.msg);
  }
  console.log('');

  // 2. ProxyAdmin
  const admin = await checkContract(adminAddr, 'ProxyAdmin');
  console.log('2. ProxyAdmin', adminAddr);
  if (admin.ok) {
    console.log('   [OK]', admin.msg);
    if (admin.name !== 'ProxyAdmin') console.log('   (Nombre esperado: ProxyAdmin)');
  } else {
    console.log('   [FALLO]', admin.msg);
  }
  console.log('');

  // 3. Proxy (Tronscan a veces no devuelve /api/contract para proxies; comprobamos cuenta y tx)
  console.log('3. Proxy (Token)', proxyAddr);
  const proxyContract = await checkContract(proxyAddr, 'Proxy');
  let proxyOk = proxyContract.ok;
  let proxyCreationSuccess = null;
  if (proxyContract.ok) {
    console.log('   [OK]', proxyContract.msg);
  } else {
    const acc = await checkAccount(proxyAddr);
    const txInfo = await checkProxyTx(proxyAddr);
    if (acc.isContract || acc.totalTransactionCount > 0) {
      console.log('   Tronscan no devuelve ficha de contrato para esta dirección (común en proxies).');
      console.log('   Transacciones en la dirección:', acc.totalTransactionCount);
      proxyOk = true;
      if (txInfo.createTx) {
        proxyCreationSuccess = txInfo.createTx.result === 'SUCCESS' && txInfo.createTx.contractRet !== 'REVERT';
        if (proxyCreationSuccess) {
          console.log('   [OK] Creación de contrato (contractType 30) con result SUCCESS.');
        } else {
          console.log('   [ATENCIÓN] Tx de creación con result:', txInfo.createTx.result, 'contractRet:', txInfo.createTx.contractRet);
          console.log('   Si la creación revirtió, el Proxy puede no estar desplegado correctamente.');
        }
      }
    } else {
      console.log('   [FALLO] Dirección sin transacciones – Proxy no desplegado.');
    }
  }
  console.log('');

  // Resumen
  const implOk = impl.ok;
  const adminOk = admin.ok;
  console.log('--- Resumen ---');
  console.log('Implementation:', implOk ? 'OK' : 'FALLO');
  console.log('ProxyAdmin:    ', adminOk ? 'OK' : 'FALLO');
  console.log('Proxy:         ', proxyOk ? 'OK (o ver mensaje arriba)' : 'FALLO');
  if (implOk && adminOk && proxyOk) {
    console.log('\nLos 3 contratos están presentes en mainnet.');
  } else {
    console.log('\nRevisa los fallos arriba.');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
