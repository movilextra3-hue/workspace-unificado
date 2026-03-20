#!/usr/bin/env node
/**
 * Compila como TronBox: múltiples archivos (Initializable.sol, TRC20TokenUpgradeable.sol)
 * con import, sin aplanar. Puede producir bytecode distinto al single-file.
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

async function main() {
  const chain = await fetchBytecode('TXaXTSUKgdAdX76MhQoqQ98msE8azBwiFS');
  console.log('Mainnet:', chain.length / 2, 'bytes\n');

  const load = (v) => new Promise((resolve, reject) => {
    solc.loadRemoteVersion(v, (err, s) => (err ? reject(err) : resolve(s)));
  });

  const commits = ['2bb438d', '45ba8f4'];
  const configs = [
    { tag: 'v0.8.34+commit.80d5c536', evm: 'shanghai', name: '0.8.34+shanghai' },
    { tag: 'v0.8.34+commit.80d5c536', evm: undefined, name: '0.8.34+default' }
  ];

  for (const commit of commits) {
    let init, impl;
    try {
      init = gitShow(commit, 'contracts/Initializable.sol');
      impl = gitShow(commit, 'contracts/TRC20TokenUpgradeable.sol');
    } catch (e) {
      console.log(commit, '- no disponible');
      continue;
    }

    for (const cfg of configs) {
      const sources = {
        'contracts/Initializable.sol': { content: init },
        'contracts/TRC20TokenUpgradeable.sol': { content: impl }
      };
      const settings = { optimizer: { enabled: true, runs: 200 }, outputSelection: { '*': { '*': ['evm.deployedBytecode'] } } };
      if (cfg.evm) settings.evmVersion = cfg.evm;

      const input = { language: 'Solidity', sources, settings };

      try {
        const s = await load(cfg.tag);
        const out = JSON.parse(s.compile(JSON.stringify(input)));
        if (out.errors) {
          const errs = out.errors.filter(e => e.severity === 'error');
          if (errs.length) {
            console.log(commit, cfg.name, ': ERROR', (errs[0]?.formattedMessage || errs[0])?.slice(0, 80));
            continue;
          }
        }
        const bc = out.contracts?.['contracts/TRC20TokenUpgradeable.sol']?.TRC20TokenUpgradeable?.evm?.deployedBytecode?.object;
        if (bc) {
          const hex = bc.replace(/^0x/, '');
          const match = hex === chain;
          console.log(commit, cfg.name, ':', hex.length / 2, 'bytes', match ? '*** COINCIDE ***' : '');
          if (match) {
            const dir = path.join(ROOT, 'verification');
            fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(path.join(dir, 'Initializable.sol'), init);
            fs.writeFileSync(path.join(dir, 'TRC20TokenUpgradeable.sol'), impl);
            console.log('Guardado en verification/');
            process.exit(0);
          }
        }
      } catch (e) {
        console.log(commit, cfg.name, ': ERROR', e.message);
      }
    }
  }
  console.log('\nNinguno coincidió.');
}

main().catch(e => { console.error(e); process.exit(1); });
