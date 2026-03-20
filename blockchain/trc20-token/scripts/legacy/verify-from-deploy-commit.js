#!/usr/bin/env node
/**
 * Prueba si el contrato del commit de despliegue (2bb438d) compila al bytecode de mainnet.
 * Uso: node scripts/verify-from-deploy-commit.js
 */
'use strict';
const { execSync } = require('node:child_process');
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');

const ADDR = 'TXaXTSUKgdAdX76MhQoqQ98msE8azBwiFS';
const COMMIT = '2bb438d';
const ROOT = path.join(__dirname, '..');

function gitShow(repoPath, commit, filePath) {
  return execSync(`git -C "${repoPath}" show ${commit}:${filePath}`, { encoding: 'utf8' });
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

function compile(solc, source, bytecodeHashNone = false) {
  const input = {
    language: 'Solidity',
    sources: { 'TRC20TokenUpgradeable.sol': { content: source } },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: 'shanghai',
      outputSelection: { '*': { '*': ['evm.deployedBytecode'] } }
    }
  };
  if (bytecodeHashNone) input.settings.metadata = { bytecodeHash: 'none' };
  const out = JSON.parse(solc.compile(JSON.stringify(input)));
  const err = out.errors?.find(e => e.severity === 'error');
  if (err) throw new Error(err.formattedMessage);
  const bc = out.contracts['TRC20TokenUpgradeable.sol']?.TRC20TokenUpgradeable?.evm?.deployedBytecode?.object;
  if (!bc) throw new Error('No deployedBytecode');
  return bc.replace(/^0x/, '');
}

async function main() {
  console.log('=== Verificación desde commit de despliegue ===\n');
  console.log('Commit:', COMMIT, '| Implementation:', ADDR);
  console.log('');

  let initContent, implContent;
  try {
    initContent = gitShow(ROOT, COMMIT, 'contracts/Initializable.sol');
    implContent = gitShow(ROOT, COMMIT, 'contracts/TRC20TokenUpgradeable.sol');
  } catch (e) {
    console.error('Error obteniendo archivos del commit:', e.message);
    process.exit(1);
  }

  implContent = implContent.replace(/import\s*\{\s*Initializable\s*\}\s*from\s*["']\.\/Initializable\.sol["'];\s*\n?/i, '');
  const initBody = stripHeader(initContent.replace(/pragma solidity \^?0\.8\.\d+;/, 'pragma solidity ^0.8.25;'));
  const implBody = stripHeader(implContent.replace(/pragma solidity \^?0\.8\.\d+;/, 'pragma solidity ^0.8.25;'));
  const initNoAbstract = initBody.replace(/\babstract\s+contract\s+Initializable\b/, 'contract Initializable');
  const flattened = `// SPDX-License-Identifier: MIT\npragma solidity ^0.8.25;\n\n${initNoAbstract}\n\n${implBody}\n`;

  const tmpPath = path.join(ROOT, 'verification', 'TRC20TokenUpgradeable-from-commit.sol');
  fs.mkdirSync(path.dirname(tmpPath), { recursive: true });
  fs.writeFileSync(tmpPath, flattened, 'utf8');
  console.log('Archivo temporal:', tmpPath);
  console.log('');

  const chainHex = await fetchBytecode(ADDR);
  const solc = await loadSolc('v0.8.25+commit.b61c2a91');

  console.log('Mainnet:', chainHex.length / 2, 'bytes');
  const bc1 = compile(solc, flattened, false);
  const bc2 = compile(solc, flattened, true);
  console.log('Compilado (sin bytecodeHash:none):', bc1.length / 2, 'bytes');
  console.log('Compilado (con bytecodeHash:none):', bc2.length / 2, 'bytes');
  console.log('');

  const match1 = chainHex === bc1;
  const match2 = chainHex === bc2;
  if (match1) {
    console.log('*** COINCIDE (sin bytecodeHash:none) ***');
    console.log('Archivo para verificación:', tmpPath);
    console.log('Parámetros: 0.8.25, Shanghai, runs 200');
  } else if (match2) {
    console.log('*** COINCIDE (con bytecodeHash:none) ***');
    console.log('Archivo para verificación:', tmpPath);
    console.log('Parámetros: 0.8.25, Shanghai, runs 200, metadata.bytecodeHash:none');
    console.log('Tronscan no ofrece bytecodeHash:none; probar OKLink si acepta Standard Input JSON.');
  } else {
    console.log('No coincide. Diferencia bytes:', Math.abs(chainHex.length - bc1.length) / 2);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
