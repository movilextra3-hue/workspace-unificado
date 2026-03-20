#!/usr/bin/env node
/**
 * Genera datos de verificación para cualquier contrato.
 * Detecta params por bytecode y escribe verification/VERIFICACION-<shortAddr>.json y PARAMETROS-<shortAddr>.txt
 *
 * Uso: node scripts/generate-verification-data.js <ADDRESS>
 * Ejemplo: node scripts/generate-verification-data.js TNduz3PrYRDDN9HmEWXFn3nEsXKCaJt9er
 */
'use strict';
const addr = process.argv[2] || process.env.ADDRESS;
if (!addr) {
  console.error('Uso: node scripts/generate-verification-data.js <ADDRESS>');
  process.exit(1);
}

const CONTRACTS = [
  { address: 'TXaXTSUKgdAdX76MhQoqQ98msE8azBwiFS', mainContract: 'TRC20TokenUpgradeable', sourceFile: 'TXaXTSUK-verification/TRC20TokenUpgradeable-flattened.sol' },
  { address: 'TTTT4AeRUjJEmTepb9X4uK4f6Pxg8UwwkW', mainContract: 'ProxyAdmin', sourceFile: 'ProxyAdmin.sol' },
  { address: 'TQJ6f3eczr2rK9x9kN2JMTdDN1zTm46XxE', mainContract: 'ProxyAdmin', sourceFile: 'ProxyAdmin.sol' },
  { address: 'TVeVPZGiMc9GWQ8sQHvUwhfg19EDZt3UjZ', mainContract: 'ProxyAdmin', sourceFile: 'ProxyAdmin.sol' },
  { address: 'TYqRvxioNWBqVa2nJGog8RkYQrXQdPJwR3', mainContract: 'TRC20TokenUpgradeable', sourceFile: 'TRC20TokenUpgradeable.sol' },
  { address: 'TPK7VWSGSH1nK4jetcNCz1BQqMU7gmnaLe', mainContract: 'TRC20TokenUpgradeable', sourceFile: 'TRC20TokenUpgradeable.sol' },
  { address: 'TNduz3PrYRDDN9HmEWXFn3nEsXKCaJt9er', mainContract: 'TRC20TokenUpgradeable', sourceFile: 'TRC20TokenUpgradeable.sol' }
];

const contract = CONTRACTS.find(c => c.address === addr);
if (!contract) {
  console.error('Dirección no reconocida. Contratos conocidos:', CONTRACTS.map(c => c.address).join(', '));
  process.exit(1);
}

const path = require('node:path');
const https = require('node:https');
const fs = require('node:fs');

const ROOT = path.join(__dirname, '..');
const VERIFICATION_DIR = path.join(ROOT, 'verification');
const SOURCE_PATH = path.join(VERIFICATION_DIR, contract.sourceFile);

function fetchBytecode(a) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ value: a, visible: true });
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

function compile(solc, source, evm, runs) {
  const input = {
    language: 'Solidity',
    sources: { 'flat.sol': { content: source } },
    settings: { optimizer: { enabled: true, runs }, outputSelection: { '*': { '*': ['evm.deployedBytecode'] } } }
  };
  if (evm) input.settings.evmVersion = evm;
  const out = JSON.parse(solc.compile(JSON.stringify(input)));
  const err = out.errors?.find(e => e.severity === 'error');
  if (err) throw new Error(err.formattedMessage);
  const bc = out.contracts['flat.sol']?.[contract.mainContract]?.evm?.deployedBytecode?.object;
  if (!bc) throw new Error('No deployedBytecode');
  return bc.replace(/^0x/, '');
}

const CONFIGS = [
  { solc: 'v0.8.25+commit.b61c2a91', evm: 'shanghai', runs: 200, tronScan: true },
  { solc: 'v0.8.34+commit.80d5c536', evm: undefined, runs: 200, tronScan: false }
];

(async () => {
  if (!fs.existsSync(SOURCE_PATH)) {
    require('../prepare-verification');
  }
  const source = fs.readFileSync(SOURCE_PATH, 'utf8');
  const chain = await fetchBytecode(addr);
  const chainClean = stripMetadata(chain);
  let best = null;
  for (const cfg of CONFIGS) {
    try {
      const solc = await loadSolc(cfg.solc);
      const compiled = compile(solc, source, cfg.evm, cfg.runs);
      if (stripMetadata(compiled) === chainClean) {
        best = { compiler: cfg.solc.replace('v', '').split('+')[0], evm: cfg.evm || 'default', runs: cfg.runs, tronScan: cfg.tronScan };
        break;
      }
    } catch { /* no match */ }
  }
  if (!best) {
    console.error('No se encontró coincidencia de bytecode.');
    process.exit(1);
  }
  const short = addr.slice(0, 8);
  const params = {
    contractAddress: addr,
    mainContract: contract.mainContract,
    sourceFile: contract.sourceFile,
    compilerVersion: best.compiler,
    optimization: true,
    runs: best.runs,
    evmVersion: best.evm,
    license: 'None',
    tronScanVerifiable: best.tronScan,
    verifyUrl: 'https://tronscan.org/#/contracts/verify',
    oklinkUrl: 'https://www.oklink.com/tron/verify-contract-preliminary'
  };
  fs.writeFileSync(path.join(VERIFICATION_DIR, `VERIFICACION-${short}.json`), JSON.stringify(params, null, 2));
  const txt = `VERIFICACIÓN - ${addr}
Contract: ${contract.mainContract}
Archivo: verification/${contract.sourceFile}
Compiler: ${best.compiler} | EVM: ${best.evm} | Runs: ${best.runs}
${best.tronScan ? 'TronScan: Compiler Ethereum 0.8.25, EVM Shanghai (20)' : 'OKLink: Compiler ' + best.compiler + ' (TronScan no ofrece esta versión)'}
`;
  fs.writeFileSync(path.join(VERIFICATION_DIR, `PARAMETROS-${short}.txt`), txt);
  console.log('Escrito: verification/VERIFICACION-' + short + '.json, PARAMETROS-' + short + '.txt');
  console.log(best.tronScan ? 'Verificable en TronScan' : 'Verificar en OKLink (TronScan solo 0.8.25)');
})().catch(e => { console.error(e); process.exit(1); });
