#!/usr/bin/env node
/**
 * Pre-verificación genérica para contratos distintos de TNduz3.
 * Detecta params por bytecode; si 0.8.25+Shanghai → checks; si 0.8.34+default → OKLink.
 */
'use strict';
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');

const VERIFICATION_DIR = path.join(__dirname, '..', 'verification');

function fetchBytecode(addr) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ value: addr, visible: true });
    const opts = {
      hostname: 'api.trongrid.io',
      path: '/wallet/getcontractinfo',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body, 'utf8') }
    };
    const req = https.request(opts, (res) => {
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

function stripMetadata(hex) {
  if (!hex || hex.length < 4) return hex;
  const len = parseInt(hex.slice(-4), 16);
  if (len > 0 && len < 200 && hex.length >= (len + 2) * 2) return hex.slice(0, -(len + 2) * 2);
  const idx = hex.lastIndexOf('a264');
  if (idx > 0 && hex.length - idx >= 86) return hex.slice(0, idx);
  return hex;
}

function compile(solc, source, mainContract, evm, runs) {
  const input = {
    language: 'Solidity',
    sources: { 'flat.sol': { content: source } },
    settings: { optimizer: { enabled: true, runs }, outputSelection: { '*': { '*': ['evm.deployedBytecode'] } } }
  };
  if (evm) input.settings.evmVersion = evm;
  const out = JSON.parse(solc.compile(JSON.stringify(input)));
  const err = out.errors?.find(e => e.severity === 'error');
  if (err) throw new Error(err.formattedMessage);
  const bc = out.contracts['flat.sol']?.[mainContract]?.evm?.deployedBytecode?.object;
  if (!bc) throw new Error('No deployedBytecode');
  return bc.replace(/^0x/, '');
}

const CONFIGS = [
  { solc: 'v0.8.25+commit.b61c2a91', evm: 'shanghai', runs: 200, tronScan: true },
  { solc: 'v0.8.34+commit.80d5c536', evm: undefined, runs: 200, tronScan: false }
];

async function run(addr, contract) {
  const sourcePath = path.join(VERIFICATION_DIR, contract.sourceFile);
  if (!fs.existsSync(sourcePath)) {
    require('../prepare-verification');
  }
  if (!fs.existsSync(sourcePath)) {
    console.error('❌ No existe', sourcePath);
    process.exit(1);
  }

  const source = fs.readFileSync(sourcePath, 'utf8');
  const chainBytecode = await fetchBytecode(addr);
  const chainClean = stripMetadata(chainBytecode);

  let match = null;
  for (const cfg of CONFIGS) {
    try {
      const solc = await loadSolc(cfg.solc);
      const compiled = compile(solc, source, contract.mainContract, cfg.evm, cfg.runs);
      if (stripMetadata(compiled) === chainClean) {
        match = { ...cfg, compiler: cfg.solc.replace('v', '').split('+')[0], evmStr: cfg.evm || 'default' };
        break;
      }
    } catch { /* no match */ }
  }

  if (!match) {
    console.error('❌ No se encontró coincidencia de bytecode para', addr);
    process.exit(1);
  }

  console.log('=== PRE-VERIFICACIÓN', addr, '(' + contract.mainContract + ') ===\n');
  console.log('Config detectada:', match.compiler + '+' + match.evmStr + ', runs=' + match.runs);

  if (match.tronScan) {
    console.log('\n✅ VERIFICABLE EN TRONSCAN');
    console.log('Parámetros:');
    console.log('  Address:', addr);
    console.log('  Main Contract:', contract.mainContract);
    console.log('  Archivo: verification/' + contract.sourceFile);
    console.log('  Compiler: 0.8.25 (Ethereum, NO TRON)');
    console.log('  EVM: Shanghai (20)');
    console.log('  Optimization: Yes, Runs: 200');
    console.log('  License: None');
    console.log('\nhttps://tronscan.org/#/contracts/verify');
  } else {
    console.log('\n⚠️ NO VERIFICABLE EN TRONSCAN');
    console.log('TronScan solo ofrece 0.8.25. Este contrato fue compilado con', match.compiler + '+default.');
    console.log('\nProbar OKLink (puede ofrecer 0.8.34):');
    console.log('  URL: https://www.oklink.com/tron/verify-contract-preliminary');
    console.log('  Archivo: verification/' + contract.sourceFile);
    console.log('  Compiler:', match.compiler);
    console.log('  EVM: default');
    console.log('  Optimization: Yes, Runs: 200');
  }
}

module.exports = { run };
