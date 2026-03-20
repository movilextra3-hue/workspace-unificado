#!/usr/bin/env node
/**
 * Busca la combinación exacta (compilador, settings, código) que produce
 * el bytecode de TXaXTSUK en mainnet.
 * Uso: node scripts/find-matching-bytecode.js
 */
'use strict';
const { execSync } = require('node:child_process');
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');

const ADDR = 'TXaXTSUKgdAdX76MhQoqQ98msE8azBwiFS';
const COMMIT = '2bb438d';
const ROOT = path.join(__dirname, '..');

const SOLC_VERSIONS = [
  'v0.8.25+commit.b61c2a91',  // Estándar TXaXTSUK / config tronbox
  'v0.8.20+commit.a1b79de6',
  'v0.8.22+commit.4fc1097e',
  'v0.8.30+commit.ef53a38a',
  'v0.8.34+commit.80d5c536'
];

function gitShow(commit, filePath) {
  return execSync(`git -C "${ROOT}" show ${commit}:${filePath}`, { encoding: 'utf8' });
}

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

function stripHeader(c) {
  return c
    .replace(/^\/\/\s*SPDX-License-Identifier:[^\n]*\n/i, '')
    .replace(/^pragma\s+solidity\s+\^?0\.8\.\d+;\s*\n?/i, '')
    .replace(/^\s*\n+/, '');
}

function compile(solc, source, opts = {}) {
  const settings = {
    optimizer: { enabled: opts.runs ? true : true, runs: opts.runs ?? 200 },
    evmVersion: opts.evmVersion ?? 'shanghai',
    outputSelection: { '*': { '*': ['evm.deployedBytecode'] } }
  };
  if (opts.bytecodeHashNone) settings.metadata = { bytecodeHash: 'none' };
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

async function main() {
  console.log('=== Buscando combinación que coincida con mainnet ===\n');
  const chainHex = await fetchBytecode(ADDR);
  console.log('Mainnet bytecode:', chainHex.length / 2, 'bytes\n');

  let initContent, implContent;
  try {
    initContent = gitShow(COMMIT, 'contracts/Initializable.sol');
    implContent = gitShow(COMMIT, 'contracts/TRC20TokenUpgradeable.sol');
  } catch (e) {
    console.error('Error obteniendo commit', COMMIT, ':', e.message);
    process.exit(1);
  }

  implContent = implContent.replace(/import\s*\{\s*Initializable\s*\}\s*from\s*["']\.\/Initializable\.sol["'];\s*\n?/i, '');
  const initBody = stripHeader(initContent.replace(/pragma solidity \^?0\.8\.\d+;/, 'pragma solidity ^0.8.25;'));
  const implBody = stripHeader(implContent.replace(/pragma solidity \^?0\.8\.\d+;/, 'pragma solidity ^0.8.25;'));
  const initNoAbstract = initBody.replace(/\babstract\s+contract\s+Initializable\b/, 'contract Initializable');
  const sourceFromCommit = `// SPDX-License-Identifier: MIT\npragma solidity ^0.8.25;\n\n${initNoAbstract}\n\n${implBody}\n`;

  const verifDir = path.join(ROOT, 'verification');
  const currentSourcePath = path.join(verifDir, 'TRC20TokenUpgradeable.sol');
  let currentSource = null;
  if (fs.existsSync(currentSourcePath)) {
    currentSource = fs.readFileSync(currentSourcePath, 'utf8');
  }

  const matches = [];

  for (const ver of SOLC_VERSIONS) {
    let solc;
    try {
      solc = await loadSolc(ver);
    } catch (e) {
      console.log('  ', ver, '- no disponible:', e.message);
      continue;
    }

    const shortVer = ver.replace('v', '').split('+')[0];
    const configs = [
      { name: `${shortVer} Shanghai runs200`, opts: {} },
      { name: `${shortVer} Shanghai runs200 bytecodeHash:none`, opts: { bytecodeHashNone: true } }
    ];

    for (const cfg of configs) {
      try {
        const bc = compile(solc, sourceFromCommit, cfg.opts);
        const lenMatch = bc.length === chainHex.length;
        const fullMatch = bc === chainHex;
        if (lenMatch || fullMatch) {
          matches.push({ ver: shortVer, config: cfg.name, len: bc.length / 2, fullMatch });
          console.log('  *** CANDIDATO:', cfg.name, '| bytes:', bc.length / 2, fullMatch ? '| EXACTO!' : '');
        }
        if (fullMatch) {
          const outPath = path.join(verifDir, 'TRC20TokenUpgradeable-matching.sol');
          fs.mkdirSync(verifDir, { recursive: true });
          fs.writeFileSync(outPath, sourceFromCommit, 'utf8');
          const paramsPath = path.join(verifDir, 'MATCHING-PARAMS.txt');
          fs.writeFileSync(paramsPath, `COINCIDENCIA ENCONTRADA
Contract: ${ADDR}
Archivo: TRC20TokenUpgradeable-matching.sol
Compiler: ${shortVer}
EVM: shanghai
Optimization: Yes
Runs: 200
bytecodeHash: ${cfg.opts.bytecodeHashNone ? 'none' : 'default'}
`, 'utf8');
          console.log('\n*** COINCIDENCIA EXACTA ***');
          console.log('Archivo guardado:', outPath);
          console.log('Parámetros:', paramsPath);
          process.exit(0);
        }
      } catch (e) {
        // skip
      }
    }
  }

  console.log('\nNo se encontró coincidencia exacta con fuente del commit', COMMIT);
  console.log('Probando fuente ACTUAL...\n');

  if (currentSource) {
    for (const ver of SOLC_VERSIONS.slice(-3)) {
      let solc;
      try {
        solc = await loadSolc(ver);
      } catch (e) { continue; }
      const shortVer = ver.replace('v', '').split('+')[0];
      try {
        const bc1 = compile(solc, currentSource, {});
        const bc2 = compile(solc, currentSource, { bytecodeHashNone: true });
        if (bc1 === chainHex) {
          console.log('*** COINCIDE con fuente ACTUAL:', shortVer, 'sin bytecodeHash:none');
          process.exit(0);
        }
        if (bc2 === chainHex) {
          console.log('*** COINCIDE con fuente ACTUAL:', shortVer, 'bytecodeHash:none');
          process.exit(0);
        }
      } catch { /* ignorar */ }
    }
  }

  console.log('Ninguna combinación produjo bytecode idéntico.');
  console.log('El contrato en mainnet pudo desplegarse desde otro repositorio o con tooling distinto.');
  console.log('\nAlternativa: redesplegar Implementation con tronbox 0.8.25 y verificar el nuevo contrato.');
  process.exit(1);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
