#!/usr/bin/env node
/**
 * Busca exhaustivamente qué archivo/settings produce bytecode de 12271 bytes (mainnet TXaXTSUK).
 * Uso: node scripts/search-matching-source.js
 */
'use strict';
const { execSync } = require('node:child_process');
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');

const ADDR = 'TXaXTSUKgdAdX76MhQoqQ98msE8azBwiFS';
const TARGET_BYTES = 12271;
const ROOT = path.join(__dirname, '..');

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

function gitShow(commit, filePath) {
  return execSync(`git -C "${ROOT}" show ${commit}:${filePath}`, { encoding: 'utf8' });
}

function stripHeader(c) {
  return c
    .replace(/^\/\/\s*SPDX-License-Identifier:[^\n]*\n/i, '')
    .replace(/^pragma\s+solidity\s+\^?0\.8\.\d+;\s*\n?/i, '')
    .replace(/^\s*\n+/, '');
}

function compile(solc, source, opts = {}) {
  const settings = {
    optimizer: { enabled: true, runs: opts.runs ?? 200 },
    evmVersion: opts.evmVersion ?? 'shanghai',
    outputSelection: { '*': { '*': ['evm.deployedBytecode'] } }
  };
  if (opts.bytecodeHashNone) settings.metadata = { bytecodeHash: 'none' };
  const input = {
    language: 'Solidity',
    sources: { 'T.sol': { content: source } },
    settings
  };
  const out = JSON.parse(solc.compile(JSON.stringify(input)));
  const err = out.errors?.find(e => e.severity === 'error');
  if (err) throw new Error(err.formattedMessage);
  const bc = out.contracts['T.sol']?.TRC20TokenUpgradeable?.evm?.deployedBytecode?.object;
  if (!bc) throw new Error('No deployedBytecode');
  return bc.replace(/^0x/, '');
}

async function main() {
  console.log('=== Buscando fuente que produzca', TARGET_BYTES, 'bytes ===\n');
  const chainHex = await fetchBytecode(ADDR);
  if (chainHex.length / 2 !== TARGET_BYTES) {
    console.log('Mainnet tiene', chainHex.length / 2, 'bytes (esperado', TARGET_BYTES + ')');
  }

  const verifDir = path.join(ROOT, 'verification');
  const srcCurrent = path.join(verifDir, 'TRC20TokenUpgradeable.sol');
  if (!fs.existsSync(srcCurrent)) require('../prepare-verification.js');
  const currentSource = fs.readFileSync(srcCurrent, 'utf8');

  let commitSource = null;
  try {
    const init = gitShow('2bb438d', 'contracts/Initializable.sol');
    let impl = gitShow('2bb438d', 'contracts/TRC20TokenUpgradeable.sol');
    impl = impl.replace(/import\s*\{\s*Initializable\s*\}\s*from\s*["']\.\/Initializable\.sol["'];\s*\n?/i, '');
    const initBody = stripHeader(init.replace(/pragma solidity \^?0\.8\.\d+;/, 'pragma solidity ^0.8.25;'));
    const implBody = stripHeader(impl.replace(/pragma solidity \^?0\.8\.\d+;/, 'pragma solidity ^0.8.25;'));
    const initNoAbstract = initBody.replace(/\babstract\s+contract\s+Initializable\b/, 'contract Initializable');
    commitSource = `// SPDX-License-Identifier: MIT\npragma solidity ^0.8.25;\n\n${initNoAbstract}\n\n${implBody}\n`;
  } catch (e) {
    console.log('No se pudo obtener commit 2bb438d');
  }

  const solc = await loadSolc('v0.8.25+commit.b61c2a91');
  const runsList = [1, 10, 50, 100, 200, 500, 1000, 999999];
  const sources = [
    { name: 'verification/TRC20TokenUpgradeable.sol (actual)', src: currentSource },
    { name: 'commit 2bb438d', src: commitSource }
  ].filter(s => s.src);

  for (const { name, src } of sources) {
    for (const runs of runsList) {
      for (const hashNone of [false, true]) {
        try {
          const bc = compile(solc, src, { runs, bytecodeHashNone: hashNone });
          const bytes = bc.length / 2;
          if (bytes === TARGET_BYTES) {
            console.log('*** COINCIDENCIA EXACTA ***');
            console.log('Archivo:', name);
            console.log('Runs:', runs, '| bytecodeHash:none:', hashNone);
            const outPath = path.join(verifDir, 'TRC20TokenUpgradeable-MATCHING.sol');
            fs.writeFileSync(outPath, src, 'utf8');
            console.log('Guardado:', outPath);
            process.exit(0);
          }
        } catch { /* no match */ }
      }
    }
  }

  console.log('No se encontró ninguna combinación que produzca', TARGET_BYTES, 'bytes.');
  console.log('Archivos probados:', sources.map(s => s.name).join(', '));
  console.log('Runs:', runsList.join(', '));
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
