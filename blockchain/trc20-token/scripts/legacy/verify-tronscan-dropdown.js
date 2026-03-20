#!/usr/bin/env node
/**
 * Prueba verificación TXaXTSUK con las versiones exactas del dropdown Tronscan:
 * - v0.8.28+commit.7893614a
 * - v0.8.29+commit.ab55807c
 * - v0.8.30+commit.73712a01
 *
 * Uso: node scripts/verify-tronscan-dropdown.js
 */
'use strict';
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');

const ADDR = 'TXaXTSUKgdAdX76MhQoqQ98msE8azBwiFS';
const MAIN = 'TRC20TokenUpgradeable';
const VER_DIR = path.join(__dirname, '..', 'verification', 'TXaXTSUK-verification');
const SOURCE = path.join(VER_DIR, 'TRC20TokenUpgradeable-flattened.sol');

// Versiones del dropdown Tronscan (Ethereum). Si fallan, probamos builds disponibles en solc-bin.
const TRONSCAN_VERSIONS = [
  'v0.8.30+commit.73712a01',
  'v0.8.29+commit.ab55807c',
  'v0.8.28+commit.7893614a',
  'v0.8.28-nightly.2024.9.30+commit.a8a679d1',
  'v0.8.25+commit.b61c2a91'
];

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
        try { resolve((JSON.parse(buf).runtimecode || '').replace(/^0x/, '')); } catch (e) { reject(e); }
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
    settings: {
      optimizer: { enabled: true, runs: runs || 200 },
      outputSelection: { '*': { '*': ['evm.deployedBytecode'] } }
    }
  };
  if (evm) input.settings.evmVersion = evm;
  const out = JSON.parse(solc.compile(JSON.stringify(input)));
  const err = out.errors?.find(e => e.severity === 'error');
  if (err) throw new Error(err.formattedMessage);
  const bc = out.contracts['flat.sol']?.[MAIN]?.evm?.deployedBytecode?.object;
  if (!bc) throw new Error('No deployedBytecode');
  return bc.replace(/^0x/, '');
}

async function main() {
  console.log('=== Verificación TXaXTSUK con versiones dropdown Tronscan ===\n');
  if (!fs.existsSync(SOURCE)) {
    console.error('Falta:', SOURCE, '\nEjecuta: npm run generate:verification');
    process.exit(1);
  }
  let source = fs.readFileSync(SOURCE, 'utf8');
  source = source.replace(/^\s*\/\/\s*SPDX-License-Identifier:[^\n]*\n?/gm, '');
  if (!/SPDX-License-Identifier/i.test(source.slice(0, 300))) source = '// SPDX-License-Identifier: MIT\n' + source;

  const chainHex = await fetchBytecode(ADDR);
  const chainClean = stripMetadata(chainHex);
  console.log('Mainnet:', chainClean.length / 2, 'bytes (sin metadata)\n');

  const EVMS = ['shanghai', 'paris', 'cancun', undefined];
  const RUNS = [200, 199];

  let best = { prefixMatch: 0, totalMatch: 0, config: null };
  let exact = null;

  for (const solcVer of TRONSCAN_VERSIONS) {
    let solc;
    try { solc = await loadSolc(solcVer); } catch (e) { console.log('  ' + solcVer + ': no disponible (' + e.message + ')'); continue; }
    const short = solcVer.replace('v', '').split('+')[0];
    for (const evm of EVMS) {
      for (const runs of RUNS) {
        try {
          const compiled = compile(solc, source, evm, runs);
          const compClean = stripMetadata(compiled);
          if (compClean === chainClean) {
            exact = { solcVer: short, evm: evm || 'default', runs };
            break;
          }
          let prefix = 0, total = 0;
          const len = Math.min(chainClean.length, compClean.length);
          for (let i = 0; i < len; i += 2) {
            const eq = chainClean.slice(i, i + 2) === compClean.slice(i, i + 2);
            if (eq) total++;
            if (i / 2 === prefix && eq) prefix++;
            else if (i / 2 <= prefix && !eq) break;
          }
          if (prefix > best.prefixMatch || (prefix === best.prefixMatch && total > best.totalMatch)) {
            best = { prefixMatch: prefix, totalMatch: total, config: { solcVer: short, evm: evm || 'default', runs } };
          }
        } catch (e) { /* skip */ }
      }
    }
    if (exact) break;
  }

  if (exact) {
    console.log('COINCIDENCIA EXACTA');
    console.log('  Compiler:', exact.solcVer, '| EVM:', exact.evm, '| Runs:', exact.runs);
    return;
  }
  console.log('Sin coincidencia exacta. Mejor con versiones Tronscan:\n');
  console.log('  Compiler:', best.config?.solcVer || '-', '| EVM:', best.config?.evm || '-', '| Runs:', best.config?.runs || '-');
  console.log('  Bytes coincidentes desde inicio:', best.prefixMatch);
  console.log('  Bytes totales coincidentes:', best.totalMatch);
}

main().catch(e => { console.error(e); process.exit(1); });
