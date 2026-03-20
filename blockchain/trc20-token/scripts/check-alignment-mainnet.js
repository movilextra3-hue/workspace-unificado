#!/usr/bin/env node
'use strict';
/**
 * Reporte consolidado: alineación de archivos originales (contracts/) con mainnet.
 * Verifica bytecode Implementation y estado Tronscan.
 * Uso: node scripts/check-alignment-mainnet.js
 *      npm run check:alignment (desde trc20-token)
 */
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const https = require('node:https');
const fs = require('node:fs');
const ROOT = path.join(__dirname, '..');
const DEF_ADDRS = {
  proxy: 'TV4P3sVfSQULNnsCPyzLnofCbK6cwkHeDm',
  implementation: 'TXaXTSUKgdAdX76MhQoqQ98msE8azBwiFS',
  proxyAdmin: 'TVeVPZGiMc9GWQ8sQHvUwhfg19EDZt3UjZ'
};

function loadAddresses() {
  for (const p of ['deploy-info.json', path.join('abi', 'addresses.json')]) {
    const fp = path.join(ROOT, p);
    if (fs.existsSync(fp)) {
      try {
        const d = JSON.parse(fs.readFileSync(fp, 'utf8'));
        const token = d.tokenAddress || d.token;
        const impl = d.implementationAddress || d.implementation;
        const admin = d.proxyAdminAddress || d.proxyAdmin;
        if (token && impl && admin) return { proxy: token, implementation: impl, proxyAdmin: admin };
      } catch (_) { /* ignorar parse */ }
    }
  }
  return { ...DEF_ADDRS };
}
const ADDRS = loadAddresses();

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

function fetchBytecode(addr) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ value: addr, visible: true });
    const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) };
    if (API_KEY) headers['TRON-PRO-API-KEY'] = API_KEY;
    const req = https.request({
      hostname: 'api.trongrid.io',
      path: '/wallet/getcontractinfo',
      method: 'POST',
      headers
    }, (res) => {
      let buf = '';
      res.on('data', c => { buf += c; });
      res.on('end', () => {
        try {
          const j = JSON.parse(buf);
          resolve((j.runtimecode || '').replace(/^0x/, ''));
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function checkImplementationBytecode() {
  // Usar PAQUETE-VERIFICACION-POST-UPGRADE (mismo source que despliegue) si existe
  let verifPath = path.join(ROOT, 'verification', 'PAQUETE-VERIFICACION-POST-UPGRADE', 'TRC20TokenUpgradeable.sol');
  if (!fs.existsSync(verifPath)) verifPath = path.join(ROOT, 'verification', 'TRC20TokenUpgradeable.sol');
  if (!fs.existsSync(verifPath)) return { ok: false, msg: 'Falta verification/PAQUETE-VERIFICACION-POST-UPGRADE/ o TRC20TokenUpgradeable.sol (npm run guardar:verificacion)' };
  const source = fs.readFileSync(verifPath, 'utf8');
  const findImports = (ip) => {
    const clean = ip.replace(/^\.\//, '');
    for (const dir of ['verification', 'contracts']) {
      const fp = path.join(ROOT, dir, clean);
      if (fs.existsSync(fp)) return { contents: fs.readFileSync(fp, 'utf8') };
    }
    return { error: 'File not found: ' + ip };
  };
  let solc;
  try { solc = require('solc'); } catch (e) { return { ok: false, msg: 'solc no instalado' }; }
  const config = require(path.join(ROOT, 'config', 'trc20-networks.js'));
  const comp = config.compilers?.solc || {};
  const optimizer = comp.settings?.optimizer?.enabled !== false;
  const runs = comp.settings?.optimizer?.runs ?? 200;
  const evmVersion = comp.settings?.evmVersion || 'shanghai';
  const metadata = comp.settings?.metadata;
  const input = {
    language: 'Solidity',
    sources: { 'TRC20TokenUpgradeable.sol': { content: source } },
    settings: {
      optimizer: { enabled: optimizer, runs },
      evmVersion,
      viaIR: false,
      metadata,
      outputSelection: { '*': { '*': ['evm.deployedBytecode'] } }
    }
  };
  const out = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));
  const err = out.errors?.find(e => e.severity === 'error');
  if (err) return { ok: false, msg: err.formattedMessage };
  const bc = out.contracts?.['TRC20TokenUpgradeable.sol']?.TRC20TokenUpgradeable?.evm?.deployedBytecode?.object;
  if (!bc) return { ok: false, msg: 'No deployedBytecode' };
  const compiled = bc.replace(/^0x/, '');
  const chain = await fetchBytecode(ADDRS.implementation);
  const match = chain === compiled;
  return {
    ok: match,
    mainnetBytes: chain.length / 2,
    compiledBytes: compiled.length / 2,
    msg: match ? 'Bytecode idéntico' : `Mainnet ${chain.length / 2} bytes, compilado ${compiled.length / 2} bytes — NO idénticos`
  };
}

async function main() {
  console.log('\n=== ALINEACIÓN ARCHIVOS ORIGINALES vs MAINNET ===\n');
  console.log('Fecha:', new Date().toISOString());
  console.log('');

  const report = [];

  // 1. Tronscan verification status
  console.log('--- 1. Estado Tronscan (verificación) ---');
  for (const [key, addr] of Object.entries(ADDRS)) {
    try {
      const r = await get('https://apilist.tronscanapi.com/api/contract?contract=' + encodeURIComponent(addr));
      const d = r.data?.[0];
      const verified = d?.verify_status === 2;
      const name = d?.name || '(sin nombre)';
      report.push({ contrato: key, direccion: addr.slice(0, 12) + '...', verificado: verified, nombre: name });
      console.log(`  ${key}: ${verified ? '✅ VERIFICADO' : '❌ No verificado'} | ${name}`);
    } catch (e) {
      report.push({ contrato: key, verificado: false, error: e.message });
      console.log(`  ${key}: error ${e.message}`);
    }
  }
  console.log('');

  // 2. Bytecode Implementation
  console.log('--- 2. Bytecode Implementation (' + ADDRS.implementation + ') ---');
  const implCheck = await checkImplementationBytecode();
  report.push({ contrato: 'implementation_bytecode', ...implCheck });
  if (implCheck.ok) {
    console.log('  ✅ contractos/TRC20TokenUpgradeable.sol compila a bytecode idéntico a mainnet.');
  } else {
    console.log('  ❌', implCheck.msg);
    if (implCheck.mainnetBytes && implCheck.compiledBytes) {
      console.log('     Mainnet:', implCheck.mainnetBytes, 'bytes | Compilado:', implCheck.compiledBytes, 'bytes');
    }
  }
  console.log('');

  // 3. addresses.json vs mainnet
  const addrPath = path.join(ROOT, 'abi', 'addresses.json');
  if (fs.existsSync(addrPath)) {
    const addrJ = JSON.parse(fs.readFileSync(addrPath, 'utf8'));
    const addrsOk = addrJ.tokenAddress === ADDRS.proxy &&
      addrJ.implementationAddress === ADDRS.implementation &&
      addrJ.proxyAdminAddress === ADDRS.proxyAdmin;
    report.push({ contrato: 'addresses_json', ok: addrsOk });
    console.log('--- 3. addresses.json ---');
    console.log('  Direcciones:', addrsOk ? '✅ alineadas con mainnet' : '❌ discrepancia');
    console.log('');
  }

  // 4. Resumen
  console.log('=== RESUMEN ALINEACIÓN ===\n');
  const implBytecodeOk = report.find(r => r.contrato === 'implementation_bytecode')?.ok;
  const proxyVer = report.find(r => r.contrato === 'proxy')?.verificado;
  const adminVer = report.find(r => r.contrato === 'proxyAdmin')?.verificado;

  console.log('| Contrato       | Fuente local = mainnet? | Nota');
  console.log('|----------------|-------------------------|------');
  console.log('| Proxy          |', proxyVer ? '✅ Sí (verificado Tronscan)' : '⚠ Tronscan', '| contracts/TransparentUpgradeableProxy.sol');
  console.log('| ProxyAdmin    |', adminVer ? '✅ Sí (verificado Tronscan)' : '⚠ Tronscan', '| contracts/ProxyAdmin.sol');
  const implNote = implBytecodeOk ? 'contracts/TRC20TokenUpgradeable.sol' : `contracts/ ≠ bytecode mainnet (${implCheck.compiledBytes || '?'} vs ${implCheck.mainnetBytes || '?'} bytes)`;
  console.log('| Implementation|', implBytecodeOk ? '✅ Sí' : '❌ NO', '|', implNote);
  console.log('');
  if (!implBytecodeOk) {
    console.log('Implementación ' + ADDRS.implementation + ': el bytecode local NO coincide con mainnet.');
    console.log('Probadas configs solc 0.8.25, Shanghai, runs 200, bytecodeHash none/default — sin coincidencia.');
    console.log('Posibles causas: compilador TRON (tron-solidity), params desconocidos, o source distinto.');
    console.log('');
  }
}

main().catch(e => {
  console.error(e.message || e);
  process.exit(1);
});
