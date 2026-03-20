#!/usr/bin/env node
/**
 * Prueba si 2bb438d + setName/setSymbol (único cambio respecto a 2bb438d) produce 12271 bytes.
 * El mainnet tiene 12271; 2bb438d da 12111; current da 12790. Hay una versión intermedia.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const https = require('https');
const { execSync } = require('child_process');
const solc = require('solc');
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

function gitShow(commit, file) {
  return execSync('git -C "' + ROOT + '" show ' + commit + ':' + file, { encoding: 'utf8' });
}

function stripHeader(c) {
  return c.replace(/^\/\/\s*SPDX-License-Identifier:[^\n]*\n/i, '')
    .replace(/^pragma\s+solidity\s+\^?0\.8\.\d+;\s*\n?/i, '')
    .replace(/^\s*\n+/, '');
}

async function main() {
  const chain = await fetchBytecode('TXaXTSUKgdAdX76MhQoqQ98msE8azBwiFS');
  console.log('Mainnet:', chain.length / 2, 'bytes\n');

  const load = (v) => new Promise((resolve, reject) => {
    solc.loadRemoteVersion(v, (err, s) => (err ? reject(err) : resolve(s)));
  });

  let impl = gitShow('2bb438d', 'contracts/TRC20TokenUpgradeable.sol');
  const init = gitShow('2bb438d', 'contracts/Initializable.sol');

  if (!impl.includes('function setName')) {
    impl = impl.replace(
      '        cap = _cap;\n    }\n\n    /**\n     * @notice Devuelve el balance',
      '        cap = _cap;\n    }\n\n    function setName(string calldata _name) external onlyOwner {\n        name = _name;\n    }\n\n    function setSymbol(string calldata _symbol) external onlyOwner {\n        symbol = _symbol;\n    }\n\n    /**\n     * @notice Devuelve el balance'
    );
  }

  impl = impl.replace(/import\s*\{\s*Initializable\s*\}\s*from\s*["']\.\/Initializable\.sol["'];\s*\n?/i, '');
  const initBody = stripHeader(init.replace(/pragma solidity \^?0\.8\.\d+;/, 'pragma solidity ^0.8.25;'));
  const implBody = stripHeader(impl.replace(/pragma solidity \^?0\.8\.\d+;/, 'pragma solidity ^0.8.25;'));
  const initNoAbstract = initBody.replace(/\babstract\s+contract\s+Initializable\b/, 'contract Initializable');
  const source = '// SPDX-License-Identifier: MIT\npragma solidity ^0.8.25;\n\n' + initNoAbstract + '\n\n' + implBody + '\n';

  const s = await load('v0.8.25+commit.b61c2a91');
  const input = {
    language: 'Solidity',
    sources: { 'T.sol': { content: source } },
    settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: 'shanghai', outputSelection: { '*': { '*': ['evm.deployedBytecode'] } } }
  };
  const out = JSON.parse(s.compile(JSON.stringify(input)));
  const bc = out.contracts && out.contracts['T.sol'] && out.contracts['T.sol'].TRC20TokenUpgradeable && out.contracts['T.sol'].TRC20TokenUpgradeable.evm?.deployedBytecode?.object;
  if (bc) {
    const hex = bc.replace(/^0x/, '');
    const match = hex === chain;
    console.log('2bb438d + setName/setSymbol:', hex.length / 2, 'bytes', match ? '*** COINCIDE ***' : '');
    if (match) {
      const outPath = path.join(ROOT, 'verification', 'TRC20TokenUpgradeable-COINCIDE.sol');
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, source, 'utf8');
      console.log('Guardado:', outPath);
      process.exit(0);
    }
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
