#!/usr/bin/env node
'use strict';
/**
 * Comprobación real en mainnet: bytecode completo tal como está estructurado.
 * Compara byte a byte el runtime bytecode de la Implementation en mainnet
 * con el que generamos al compilar (misma config que verificación).
 * Escribe un informe con longitudes, estructura (metadata) y todas las diferencias.
 * Uso: node scripts/check-bytecode-mainnet-full.js
 *      npm run check:bytecode:mainnet (si existe en package.json)
 */
const path = require('node:path');
const fs = require('node:fs');
const https = require('node:https');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const ROOT = path.join(__dirname, '..');
const API_KEY = process.env.TRON_PRO_API_KEY || '';

function loadAddresses() {
  const def = { implementation: 'TFeLLtutboNwVwSSdNqAiXoQGzXZrbTDMC' };
  for (const p of ['deploy-info.json', path.join('abi', 'addresses.json')]) {
    const fp = path.join(ROOT, p);
    if (fs.existsSync(fp)) {
      try {
        const d = JSON.parse(fs.readFileSync(fp, 'utf8'));
        const impl = d.implementationAddress || d.implementation;
        if (impl) return { ...def, implementation: impl };
      } catch (_) { /* ignore */ }
    }
  }
  return def;
}

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
          const hex = (j.runtimecode || '').replace(/^0x/, '');
          resolve(hex);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/** Índice (hex) donde empieza el sufijo CBOR en bytecode Solidity (a264 = map + "ipfs" key). */
function findMetadataStart(hex) {
  const idx = hex.lastIndexOf('a264');
  return idx >= 0 ? idx : hex.length;
}

/** Últimos 2 bytes del bytecode = length of CBOR (big-endian). */
function getMetadataLengthFromTrailer(hex) {
  if (hex.length < 4) return null;
  const buf = Buffer.from(hex, 'hex');
  return buf.readUInt16BE(buf.length - 2);
}

function findImports(imp) {
  const clean = imp.replace(/^\.\//, '');
  for (const dir of ['verification', 'contracts']) {
    const fp = path.join(ROOT, dir, clean);
    if (fs.existsSync(fp)) return { contents: fs.readFileSync(fp, 'utf8') };
  }
  return { error: 'File not found: ' + imp };
}

function compileWithProjectConfig(solc, source) {
  const config = require(path.join(ROOT, 'config', 'trc20-networks.js'));
  const comp = config.compilers?.solc || {};
  const input = {
    language: 'Solidity',
    sources: { 'TRC20TokenUpgradeable.sol': { content: source } },
    settings: {
      optimizer: {
        enabled: comp.settings?.optimizer?.enabled !== false,
        runs: comp.settings?.optimizer?.runs ?? 200
      },
      evmVersion: comp.settings?.evmVersion || 'shanghai',
      viaIR: false,
      metadata: comp.settings?.metadata || { bytecodeHash: 'none' },
      outputSelection: { '*': { '*': ['evm.deployedBytecode'] } }
    }
  };
  const out = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));
  const err = out.errors?.find(e => e.severity === 'error');
  if (err) throw new Error(err.formattedMessage);
  const bc = out.contracts?.['TRC20TokenUpgradeable.sol']?.TRC20TokenUpgradeable?.evm?.deployedBytecode?.object;
  if (!bc) throw new Error('No deployedBytecode');
  return bc.replace(/^0x/, '');
}

/** Todas las diferencias byte a byte (posición en bytes, hex mainnet, hex compilado). */
function findAllDiffs(mainnetHex, compiledHex) {
  const diffs = [];
  const len = Math.min(mainnetHex.length, compiledHex.length);
  for (let i = 0; i < len; i += 2) {
    const m = mainnetHex.slice(i, i + 2);
    const c = compiledHex.slice(i, i + 2);
    if (m !== c) diffs.push({ bytePos: i / 2, hexIndex: i, mainnet: m, compiled: c });
  }
  if (mainnetHex.length !== compiledHex.length) {
    diffs.push({
      bytePos: len / 2,
      hexIndex: len,
      lengthDiff: true,
      mainnetBytes: mainnetHex.length / 2,
      compiledBytes: compiledHex.length / 2
    });
  }
  return diffs;
}

async function main() {
  const lines = [];
  const log = (s) => {
    lines.push(s);
    console.log(s);
  };

  const addrs = loadAddresses();
  const implAddr = addrs.implementation;

  log('');
  log('=== COMPROBACIÓN REAL MAINNET — BYTECODE COMPLETO ===');
  log('Fecha: ' + new Date().toISOString());
  log('Implementation: ' + implAddr);
  log('');

  let solc;
  try {
    solc = require('solc');
  } catch (e) {
    log('ERROR: solc no instalado.');
    process.exit(1);
  }

  let verifPath = path.join(ROOT, 'verification', 'PAQUETE-VERIFICACION-POST-UPGRADE', 'TRC20TokenUpgradeable.sol');
  if (!fs.existsSync(verifPath)) verifPath = path.join(ROOT, 'contracts', 'TRC20TokenUpgradeable.sol');
  if (!fs.existsSync(verifPath)) {
    log('ERROR: Falta TRC20TokenUpgradeable.sol. Ejecutar: npm run guardar:verificacion');
    process.exit(1);
  }
  const source = fs.readFileSync(verifPath, 'utf8');

  log('--- 1. Bytecode en mainnet (TronGrid getcontractinfo → runtimecode) ---');
  const mainnetHex = await fetchBytecode(implAddr);
  const mainnetBytes = mainnetHex.length / 2;
  log('  Longitud total: ' + mainnetBytes + ' bytes (' + mainnetHex.length + ' caracteres hex)');
  const metaStartMainnet = findMetadataStart(mainnetHex);
  const codeOnlyMainnetBytes = metaStartMainnet / 2;
  log('  Inicio sufijo metadata (a264): byte ' + codeOnlyMainnetBytes + ' (hex index ' + metaStartMainnet + ')');
  log('  Código sin metadata: ' + codeOnlyMainnetBytes + ' bytes');
  const trailerLen = getMetadataLengthFromTrailer(mainnetHex);
  if (trailerLen != null) log('  Longitud CBOR (últimos 2 bytes): ' + trailerLen + ' bytes');
  log('  Primeros 32 bytes (hex): ' + mainnetHex.slice(0, 64));
  log('  Últimos 64 bytes (hex):  ' + mainnetHex.slice(-128));
  log('');

  log('--- 2. Bytecode compilado (config/trc20-networks.js: 0.8.25, Shanghai, 200, bytecodeHash:none) ---');
  const compiledHex = compileWithProjectConfig(solc, source);
  const compiledBytes = compiledHex.length / 2;
  log('  Longitud total: ' + compiledBytes + ' bytes (' + compiledHex.length + ' caracteres hex)');
  const metaStartCompiled = findMetadataStart(compiledHex);
  log('  Inicio sufijo metadata (a264): byte ' + (metaStartCompiled / 2) + ' (hex index ' + metaStartCompiled + ')');
  log('  Primeros 32 bytes (hex): ' + compiledHex.slice(0, 64));
  log('  Últimos 64 bytes (hex):  ' + compiledHex.slice(-128));
  log('');

  log('--- 3. Comparación (lo que compara el verificador = bytecode completo) ---');
  const match = mainnetHex === compiledHex;
  log('  ¿Idénticos? ' + (match ? 'SÍ' : 'NO'));
  if (!match) {
    const diffs = findAllDiffs(mainnetHex, compiledHex);
    log('  Número de diferencias: ' + diffs.length);
    const lenDiff = diffs.find(d => d.lengthDiff);
    if (lenDiff) log('  Diferencia de longitud: mainnet ' + lenDiff.mainnetBytes + ' bytes, compilado ' + lenDiff.compiledBytes + ' bytes');
    const maxShow = 80;
    for (let i = 0; i < Math.min(diffs.length, maxShow); i++) {
      const d = diffs[i];
      if (d.lengthDiff) log('    [pos ' + d.bytePos + '] longitud: mainnet ' + d.mainnetBytes + ', compilado ' + d.compiledBytes);
      else log('    [byte ' + d.bytePos + '] mainnet ' + d.mainnet + ' vs compilado ' + d.compiled);
    }
    if (diffs.length > maxShow) log('    ... y ' + (diffs.length - maxShow) + ' más');
  }
  log('');

  log('--- 4. Conclusión para verificación ---');
  if (match) {
    log('  El bytecode local coincide exactamente con mainnet. El Standard JSON y el procedimiento');
    log('  de verificación están alineados con lo que se compara (bytecode completo).');
  } else {
    log('  HAY DIFERENCIAS. Revisar config (trc20-networks.js), source (PAQUETE) y regenerar');
    log('  paquete/Standard Input hasta que check:bytecode:mainnet muestre idénticos.');
  }
  log('');

  const reportPath = path.join(ROOT, 'verification', 'PAQUETE-VERIFICACION-POST-UPGRADE', 'BYTECODE-MAINNET-REPORT.txt');
  try {
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, lines.join('\n'), 'utf8');
    console.log('Informe escrito en: ' + reportPath);
  } catch (e) {
    console.warn('No se pudo escribir informe en paquete:', e.message);
  }

  process.exit(match ? 0 : 1);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
