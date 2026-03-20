#!/usr/bin/env node
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
  console.log('Mainnet TXaXTSUK:', chain.length / 2, 'bytes\n');

  const load = (v) => new Promise((resolve, reject) => {
    solc.loadRemoteVersion(v, (err, s) => (err ? reject(err) : resolve(s)));
  });

  const commits = ['2bb438d', '45ba8f4'];
  const compilers = [
    { tag: 'v0.8.25+commit.b61c2a91', name: '0.8.25' },
    { tag: 'v0.8.34+commit.80d5c536', name: '0.8.34' }
  ];

  for (const commit of commits) {
    let init, impl;
    try {
      init = gitShow(commit, 'contracts/Initializable.sol');
      impl = gitShow(commit, 'contracts/TRC20TokenUpgradeable.sol');
    } catch (e) {
      console.log(commit, '- archivos no disponibles:', e.message);
      continue;
    }
    impl = impl.replace(/import\s*\{\s*Initializable\s*\}\s*from\s*["']\.\/Initializable\.sol["'];\s*\n?/i, '');
    const initBody = stripHeader(init.replace(/pragma solidity \^?0\.8\.\d+;/, 'pragma solidity ^0.8.25;'));
    const implBody = stripHeader(impl.replace(/pragma solidity \^?0\.8\.\d+;/, 'pragma solidity ^0.8.25;'));
    const initNoAbstract = initBody.replace(/\babstract\s+contract\s+Initializable\b/, 'contract Initializable');
    const source = '// SPDX-License-Identifier: MIT\npragma solidity ^0.8.25;\n\n' + initNoAbstract + '\n\n' + implBody + '\n';

    for (const comp of compilers) {
      try {
        const s = await load(comp.tag);
        const input = {
          language: 'Solidity',
          sources: { 'T.sol': { content: source } },
          settings: {
            optimizer: { enabled: true, runs: 200 },
            evmVersion: 'shanghai',
            outputSelection: { '*': { '*': ['evm.deployedBytecode'] } }
          }
        };
        const out = JSON.parse(s.compile(JSON.stringify(input)));
        const bc = out.contracts && out.contracts['T.sol'] && out.contracts['T.sol'].TRC20TokenUpgradeable &&
          out.contracts['T.sol'].TRC20TokenUpgradeable.evm && out.contracts['T.sol'].TRC20TokenUpgradeable.evm.deployedBytecode &&
          out.contracts['T.sol'].TRC20TokenUpgradeable.evm.deployedBytecode.object;
        if (bc) {
          const hex = bc.replace(/^0x/, '');
          const match = hex === chain;
          console.log(commit, '+ solc', comp.name, ':', hex.length / 2, 'bytes', match ? '*** COINCIDE ***' : '');
          if (match) {
            const outPath = path.join(ROOT, 'verification', 'TRC20TokenUpgradeable-COINCIDE.sol');
            fs.mkdirSync(path.dirname(outPath), { recursive: true });
            fs.writeFileSync(outPath, source, 'utf8');
            console.log('\nArchivo guardado:', outPath);
            process.exit(0);
          }
        }
      } catch (e) {
        console.log(commit, '+', comp.name, ': ERROR', e.message);
      }
    }
  }
  console.log('\nNingún commit+compilador produjo bytecode coincidente.');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
