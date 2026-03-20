#!/usr/bin/env node
/**
 * Búsqueda binaria de la versión que produce 12271 bytes.
 * Mainnet: 12271. 2bb438d multi: 12130. Current: 12790.
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

async function compileSize(init, impl, runs = 200, evm = 'shanghai', solcVer = 'v0.8.34+commit.80d5c536') {
  const s = await new Promise((res, rej) => {
    solc.loadRemoteVersion(solcVer, (e, r) => (e ? rej(e) : res(r)));
  });
  const settings = {
    optimizer: { enabled: true, runs },
    outputSelection: { '*': { '*': ['evm.deployedBytecode'] } }
  };
  if (evm) settings.evmVersion = evm;
  const input = {
    language: 'Solidity',
    sources: {
      'contracts/Initializable.sol': { content: init },
      'contracts/TRC20TokenUpgradeable.sol': { content: impl }
    },
    settings
  };
  const out = JSON.parse(s.compile(JSON.stringify(input)));
  const bc = out.contracts?.['contracts/TRC20TokenUpgradeable.sol']?.TRC20TokenUpgradeable?.evm?.deployedBytecode?.object;
  return bc ? bc.replace(/^0x/, '').length / 2 : -1;
}

async function main() {
  const chain = await fetchBytecode('TXaXTSUKgdAdX76MhQoqQ98msE8azBwiFS');
  const target = chain.length / 2;
  console.log('Objetivo mainnet:', target, 'bytes\n');

  let init = gitShow('2bb438d', 'contracts/Initializable.sol');
  let impl = gitShow('2bb438d', 'contracts/TRC20TokenUpgradeable.sol');

  const baseImpl = impl;
  const setName = '\n    function setName(string calldata _name) external onlyOwner {\n        name = _name;\n    }\n';
  const setSymbol = '\n    function setSymbol(string calldata _symbol) external onlyOwner {\n        symbol = _symbol;\n    }\n';

  const insertAfter = '        cap = _cap;\n    }\n\n    /**\n     * @notice Devuelve el balance';
  const variants = [
    { name: 'base', impl: baseImpl },
    { name: '+setName', impl: baseImpl.replace(insertAfter, '        cap = _cap;\n    }\n' + setName + '\n    /**\n     * @notice Devuelve el balance') },
    { name: '+setSymbol', impl: baseImpl.replace(insertAfter, '        cap = _cap;\n    }\n' + setSymbol + '\n    /**\n     * @notice Devuelve el balance') },
    { name: '+setName+setSymbol', impl: baseImpl.replace(insertAfter, '        cap = _cap;\n    }\n' + setName + setSymbol + '\n    /**\n     * @notice Devuelve el balance') }
  ];

  for (const v of variants) {
    const sz = await compileSize(init, v.impl);
    const match = sz === target;
    console.log(v.name + ':', sz, 'bytes', match ? '*** COINCIDE ***' : '');
    if (match) {
      const dir = path.join(ROOT, 'verification');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'Initializable.sol'), init);
      fs.writeFileSync(path.join(dir, 'TRC20TokenUpgradeable.sol'), v.impl);
      console.log('Guardado en verification/');
      process.exit(0);
    }
  }

  console.log('\nProbando solc 0.8.25 (metadata mainnet)...');
  const init25 = init.replace(/pragma solidity \^?0\.8\.\d+;/, 'pragma solidity ^0.8.25;');
  const impl25 = baseImpl.replace(/pragma solidity \^?0\.8\.\d+;/, 'pragma solidity ^0.8.25;');
  for (const cfg of [
    { runs: 170, evm: 'paris', v: 'v0.8.25+commit.b61c2a91' },
    { runs: 180, evm: 'paris', v: 'v0.8.25+commit.b61c2a91' },
    { runs: 185, evm: 'paris', v: 'v0.8.25+commit.b61c2a91' },
    { runs: 190, evm: 'paris', v: 'v0.8.25+commit.b61c2a91' },
    { runs: 195, evm: 'paris', v: 'v0.8.25+commit.b61c2a91' },
    { runs: 200, evm: 'paris', v: 'v0.8.25+commit.b61c2a91' },
    { runs: 205, evm: 'paris', v: 'v0.8.25+commit.b61c2a91' },
    { runs: 210, evm: 'paris', v: 'v0.8.25+commit.b61c2a91' }
  ]) {
    const sz = await compileSize(init25, impl25, cfg.runs, cfg.evm, cfg.v);
    const ok = sz === target;
    console.log('0.8.25 runs=' + cfg.runs + ' ' + cfg.evm + ':', sz, ok ? '*** COINCIDE ***' : '');
    if (ok) {
      const dir = path.join(ROOT, 'verification');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'Initializable.sol'), init25);
      fs.writeFileSync(path.join(dir, 'TRC20TokenUpgradeable.sol'), impl25);
      fs.writeFileSync(path.join(dir, 'BUILD_PARAMS.txt'), `solc=${cfg.v} runs=${cfg.runs} evmVersion=${cfg.evm}`);
      process.exit(0);
    }
  }
  console.log('Ninguno coincidió exactamente.');
}

main().catch(e => { console.error(e); process.exit(1); });
