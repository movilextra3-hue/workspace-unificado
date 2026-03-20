#!/usr/bin/env node
/**
 * Compara bytecode de mainnet (TXaXTSUK) con compilación local.
 * Identifica diferencias byte a byte y posición.
 * Uso: node scripts/compare-mainnet-decompiled.js
 */
'use strict';
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ADDR = 'TXaXTSUKgdAdX76MhQoqQ98msE8azBwiFS';
const ROOT = path.join(__dirname, '..');
const SOURCE = path.join(ROOT, 'verification', 'TRC20TokenUpgradeable.sol');

function fetchBytecode(addr) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ value: addr, visible: true });
    const req = https.request({
      hostname: 'api.trongrid.io',
      path: '/wallet/getcontractinfo',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, (res) => {
      let buf = '';
      res.on('data', c => { buf += c; });
      res.on('end', () => {
        const j = JSON.parse(buf);
        resolve((j.runtimecode || '').replace(/^0x/, ''));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function loadSolc(v) {
  return new Promise((resolve, reject) => {
    require('solc').loadRemoteVersion(v, (err, s) => (err ? reject(err) : resolve(s)));
  });
}

function compile(solc, source, bytecodeHashNone) {
  const settings = {
    optimizer: { enabled: true, runs: 200 },
    evmVersion: 'shanghai',
    outputSelection: { '*': { '*': ['evm.deployedBytecode'] } }
  };
  if (bytecodeHashNone) settings.metadata = { bytecodeHash: 'none' };
  const input = {
    language: 'Solidity',
    sources: { 'TRC20TokenUpgradeable.sol': { content: source } },
    settings
  };
  const out = JSON.parse(solc.compile(JSON.stringify(input)));
  const err = out.errors?.find(e => e.severity === 'error');
  if (err) throw new Error(err.formattedMessage);
  const bc = out.contracts['TRC20TokenUpgradeable.sol']?.TRC20TokenUpgradeable?.evm?.deployedBytecode?.object;
  if (!bc) throw new Error('No deployedBytecode');
  return bc.replace(/^0x/, '');
}

function stripMetadata(hex) {
  if (!hex || hex.length < 4) return hex;
  const len = parseInt(hex.slice(-4), 16);
  if (len > 0 && len < 200 && hex.length >= (len + 2) * 2) return hex.slice(0, -(len + 2) * 2);
  const idx = hex.lastIndexOf('a264');
  if (idx > 0 && hex.length - idx >= 86) return hex.slice(0, idx);
  return hex;
}

function findFirstDiff(a, b) {
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i += 2) {
    if (a.slice(i, i + 2) !== b.slice(i, i + 2)) {
      return { index: i / 2, hexIndex: i, bytePos: i / 2, aByte: a.slice(i, i + 2), bByte: b.slice(i, i + 2) };
    }
  }
  if (a.length !== b.length) {
    return { index: len / 2, hexIndex: len, bytePos: len / 2, lengthDiff: true, aLen: a.length / 2, bLen: b.length / 2 };
  }
  return null;
}

function getSelectorsFromAbi(abiPath) {
  if (!fs.existsSync(abiPath)) return [];
  const abi = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
  const selectors = [];
  for (const item of abi) {
    if (item.type !== 'function') continue;
    const sig = item.name + '(' + (item.inputs || []).map(i => i.type).join(',') + ')';
    const hash = crypto.createHash('sha256').update(sig).digest('hex');
    const sel = hash.slice(0, 8);
    selectors.push({ name: item.name, sig, selector: '0x' + sel });
  }
  return selectors;
}

async function main() {
  console.log('=== Comparación mainnet vs compilación local ===\n');
  console.log('Contrato:', ADDR);
  console.log('');

  if (!fs.existsSync(SOURCE)) {
    require('./prepare-verification');
  }
  if (!fs.existsSync(SOURCE)) {
    console.error('Falta verification/TRC20TokenUpgradeable.sol');
    process.exit(1);
  }

  const source = fs.readFileSync(SOURCE, 'utf8');
  const chainHex = await fetchBytecode(ADDR);
  const chainStripped = stripMetadata(chainHex);

  console.log('--- Bytecode mainnet ---');
  console.log('  Total (hex chars):', chainHex.length);
  console.log('  Sin metadata:', chainStripped.length, 'hex chars');
  console.log('');

  const solc = await loadSolc('v0.8.25+commit.b61c2a91');

  const configs = [
    { name: '0.8.25+Shanghai, runs=200, SIN bytecodeHash:none', hashNone: false },
    { name: '0.8.25+Shanghai, runs=200, CON bytecodeHash:none', hashNone: true }
  ];

  for (const cfg of configs) {
    const compiled = compile(solc, source, cfg.hashNone);
    const compStripped = stripMetadata(compiled);

    const fullDiff = findFirstDiff(chainHex, compiled);
    const strippedDiff = findFirstDiff(chainStripped, compStripped);

    console.log('--- Config:', cfg.name, '---');
    console.log('  Compilado total:', compiled.length, 'hex chars');
    console.log('  Compilado sin metadata:', compStripped.length, 'hex chars');
    console.log('  Full bytecode match:', !fullDiff ? 'SÍ' : 'NO');
    if (fullDiff) {
      console.log('  Primera diferencia (full): byte', fullDiff.bytePos, 'hexIndex', fullDiff.hexIndex);
      if (fullDiff.aByte) console.log('    mainnet:', fullDiff.aByte, '| compilado:', fullDiff.bByte);
      if (fullDiff.lengthDiff) console.log('    mainnet bytes:', fullDiff.aLen, '| compilado bytes:', fullDiff.bLen);
    }
    console.log('  Bytecode ejecutable (sin metadata) match:', !strippedDiff ? 'SÍ' : 'NO');
    if (strippedDiff) {
      console.log('  Primera diferencia (sin metadata): byte', strippedDiff.bytePos, 'hexIndex', strippedDiff.hexIndex);
      if (strippedDiff.aByte) console.log('    mainnet:', strippedDiff.aByte, '| compilado:', strippedDiff.bByte);
      if (strippedDiff.lengthDiff) console.log('    mainnet bytes:', strippedDiff.aLen, '| compilado bytes:', strippedDiff.bLen);
    }
    console.log('');
  }

  // Verificar selectores de funciones en bytecode mainnet
  const abiPath = path.join(ROOT, 'abi', 'TRC20TokenUpgradeable-abi.json');
  const selectors = getSelectorsFromAbi(abiPath);
  console.log('--- Selectores en mainnet (primeros 20) ---');
  let found = 0;
  for (const s of selectors.slice(0, 20)) {
    const sel = s.selector.replace('0x', '');
    const inChain = chainHex.toLowerCase().includes(sel.toLowerCase());
    if (inChain) found++;
    console.log('  ', s.name.padEnd(25), s.selector, inChain ? '✓' : '✗');
  }
  console.log('  Encontrados:', found, '/', Math.min(20, selectors.length));
  console.log('');

  console.log('--- Conclusión ---');
  console.log('Si ninguna config coincide: el código fuente actual puede diferir del desplegado.');
  console.log('Si solo diff es metadata: Tronscan falla porque compara bytecode completo.');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
