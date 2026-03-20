#!/usr/bin/env node
'use strict';
/**
 * Compara bytecode compilado (0.8.25) vs mainnet para localizar diferencias.
 * Útil para ver si la discrepancia está en metadata o en lógica.
 */
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');

const ADDR = 'TXaXTSUKgdAdX76MhQoqQ98msE8azBwiFS';
const ROOT = path.join(__dirname, '..');
const VERIF = path.join(ROOT, 'verification');

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

function loadSolc(v) {
  return new Promise((resolve, reject) => {
    require('solc').loadRemoteVersion(v, (err, s) => (err ? reject(err) : resolve(s)));
  });
}

async function main() {
  console.log('=== Diff bytecode TXaXTSUK vs compilado 0.8.25 ===\n');
  const chainHex = await fetchBytecode(ADDR);
  console.log('Mainnet:', chainHex.length, 'chars (', chainHex.length / 2, 'bytes )');

  if (!fs.existsSync(VERIF)) require('../prepare-verification.js');
  const srcPath = path.join(VERIF, 'TRC20TokenUpgradeable.sol');
  const initPath = path.join(VERIF, 'Initializable.sol');
  if (!fs.existsSync(srcPath)) {
    console.error('Falta verification/TRC20TokenUpgradeable.sol');
    process.exit(1);
  }
  let impl = fs.readFileSync(srcPath, 'utf8').replace(/pragma\s+solidity\s+\^?0\.8\.\d+;/, 'pragma solidity ^0.8.25;');
  impl = impl.replace(/import\s*\{\s*Initializable\s*\}\s*from\s*["']\.\/Initializable\.sol["'];\s*\n?/i, '');
  let init = '';
  if (fs.existsSync(initPath)) {
    init = fs.readFileSync(initPath, 'utf8')
      .replace(/\/\/\s*SPDX-License-Identifier:.*\n?/g, '')
      .replace(/pragma\s+solidity\s+\^?0\.8\.\d+;/, 'pragma solidity ^0.8.25;')
      .replace(/\babstract\s+contract\s+Initializable\b/, 'contract Initializable');
  }
  impl = impl.replace(/\/\/\s*SPDX-License-Identifier:.*\n?/g, '');
  const source = `// SPDX-License-Identifier: MIT\npragma solidity ^0.8.25;\n\n${init}\n\n${impl}`;

  const solc = await loadSolc('v0.8.25+commit.b61c2a91');
  const input = {
    language: 'Solidity',
    sources: { 'T.sol': { content: source } },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      metadata: { bytecodeHash: 'none' },
      outputSelection: { '*': { '*': ['evm.deployedBytecode'] } }
    }
  };
  const out = JSON.parse(solc.compile(JSON.stringify(input)));
  const err = out.errors?.find(e => e.severity === 'error');
  if (err) {
    console.error('Error compile:', err.formattedMessage);
    process.exit(1);
  }
  const compiled = (out.contracts?.['T.sol']?.TRC20TokenUpgradeable?.evm?.deployedBytecode?.object || '').replace(/^0x/, '');
  console.log('Compiled:', compiled.length, 'chars (', compiled.length / 2, 'bytes )');

  const lenChain = chainHex.length;
  const lenComp = compiled.length;
  const minLen = Math.min(lenChain, lenComp);

  let firstDiff = -1;
  let lastDiff = -1;
  let diffCount = 0;
  for (let i = 0; i < minLen; i += 2) {
    if (chainHex.slice(i, i + 2) !== compiled.slice(i, i + 2)) {
      if (firstDiff < 0) firstDiff = i;
      lastDiff = i;
      diffCount++;
    }
  }
  if (lenChain !== lenComp) diffCount += Math.abs(lenChain - lenComp) / 2;

  console.log('\nPrimera diferencia en byte:', firstDiff >= 0 ? firstDiff / 2 : 'ninguna');
  console.log('Última diferencia en byte:', lastDiff >= 0 ? lastDiff / 2 : 'ninguna');
  console.log('Bytes distintos (aprox):', diffCount);
  console.log('Longitud chain:', lenChain / 2, '| compilado:', lenComp / 2);

  const metaLen = parseInt(chainHex.slice(-4), 16);
  console.log('\n--- Metadata (últimos bytes chain) ---');
  console.log('Length field (last 2 bytes):', chainHex.slice(-4), '=', metaLen, 'bytes');
  const metaStart = lenChain / 2 - 2 - metaLen;
  console.log('Metadata starts at byte:', metaStart);

  if (firstDiff >= 0 && lastDiff >= 0) {
    console.log('\n--- Contexto primera diferencia (chain vs compilado) ---');
    const ctx = 32;
    const start = Math.max(0, firstDiff - ctx * 2);
    const end = Math.min(lenChain, firstDiff + ctx * 2);
    const chainSlice = chainHex.slice(start, end);
    const compSlice = compiled.slice(start, Math.min(compiled.length, start + (end - start)));
    console.log('Chain  :', chainSlice);
    console.log('Compild:', compSlice);
    for (let i = 0; i < chainSlice.length; i += 2) {
      if (chainSlice[i] !== compSlice[i] || chainSlice[i + 1] !== compSlice[i + 1]) {
        console.log('  ^ diff at offset', (start + i) / 2);
        break;
      }
    }
  }

  const tailChain = chainHex.slice(-100);
  const tailComp = compiled.slice(-100);
  console.log('\n--- Últimos 50 bytes (metadata) ---');
  console.log('Chain  :', tailChain);
  console.log('Compild:', tailComp);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
