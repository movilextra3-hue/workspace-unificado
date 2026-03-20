#!/usr/bin/env node
'use strict';
/**
 * Busca exhaustivamente la combinación source + compilador que produce
 * el bytecode exacto de TXaXTSUK. Sin git, sin redespliegue.
 * Salida: verification/TRC20TokenUpgradeable-TXaXTSUK-MATCHING.sol + PARAMETROS
 * Uso: node scripts/find-source-TXaXTSUK.js
 */
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');

const ADDR = 'TXaXTSUKgdAdX76MhQoqQ98msE8azBwiFS';
const ROOT = path.join(__dirname, '..');
const VERIF = path.join(ROOT, 'verification');
const CONTRACTS = path.join(ROOT, 'contracts');

const SOLC_VERSIONS = [
  'v0.8.25+commit.b61c2a91',  // Estándar TXaXTSUK / config tronbox
  'v0.8.20+commit.a1b79de6',
  'v0.8.22+commit.4fc1097e',
  'v0.8.30+commit.ef53a38a',
  'v0.8.34+commit.80d5c536'
];

const EVM_VERSIONS = [undefined, 'shanghai', 'cancun', 'paris', 'london', 'istanbul'];

const RUNS = [0, 1, 200, 1000, 10000, 1000000];

const STANDARD_CONFIGS = (() => {
  const configs = [];
  for (const evm of EVM_VERSIONS) {
    for (const runs of RUNS) {
      for (const bytecodeHashNone of [false, true]) {
        for (const viaIR of [false, true]) {
          configs.push({ evm, runs, bytecodeHashNone, viaIR });
        }
      }
    }
  }
  return configs;
})();

function buildFlattenedConfigs() {
  const configs = [];
  for (const evm of [undefined, 'shanghai']) {
    for (const runs of [200, 0]) {
      for (const bh of [false, true]) {
        configs.push({ evm, runs, bh });
      }
    }
  }
  return configs;
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
        try {
          const j = JSON.parse(buf);
          resolve((j.runtimecode || '').replace(/^0x/, ''));
        } catch (e) { reject(e); }
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

function findImports(importPath) {
  const clean = importPath.replace(/^\.\//, '');
  for (const dir of [VERIF, CONTRACTS]) {
    const fp = path.join(dir, clean);
    if (fs.existsSync(fp)) return { contents: fs.readFileSync(fp, 'utf8') };
  }
  return { error: 'Not found: ' + importPath };
}

function compile(solc, source, opts) {
  const settings = {
    optimizer: { enabled: opts.runs >= 0, runs: opts.runs },
    outputSelection: { '*': { '*': ['evm.deployedBytecode'] } }
  };
  if (opts.evmVersion) settings.evmVersion = opts.evmVersion;
  if (opts.bytecodeHashNone) settings.metadata = { bytecodeHash: 'none' };
  if (opts.viaIR) settings.viaIR = true;
  const input = {
    language: 'Solidity',
    sources: { 'TRC20TokenUpgradeable.sol': { content: source } },
    settings
  };
  const out = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));
  const err = out.errors?.find(e => e.severity === 'error');
  if (err) throw new Error(err.formattedMessage);
  const bc = out.contracts?.['TRC20TokenUpgradeable.sol']?.TRC20TokenUpgradeable?.evm?.deployedBytecode?.object;
  if (!bc) throw new Error('No deployedBytecode');
  return bc.replace(/^0x/, '');
}

function setPragma(source, ver) {
  const m = ver.match(/0\.8\.\d+/);
  const v = m ? m[0] : '0.8.25';
  return source.replace(/pragma +solidity +\^?0\.8\.\d+;/, `pragma solidity ^${v};`);
}

function writeMatchResult(outSol, outParams, content, paramsText) {
  fs.mkdirSync(VERIF, { recursive: true });
  fs.writeFileSync(outSol, content, 'utf8');
  fs.writeFileSync(outParams, paramsText, 'utf8');
  console.log('Source:', outSol);
  console.log('Parámetros:', outParams);
}

function tryCompileAndMatch(solc, src, chainHex, opts) {
  const bc = compile(solc, src, opts);
  return bc === chainHex;
}

function formatStandardParams(result) {
  const { shortVer, evm, runs, bytecodeHashNone, viaIR } = result;
  return `COINCIDE CON TXaXTSUK
Contract: ${ADDR}
Archivo: TRC20TokenUpgradeable-TXaXTSUK-MATCHING.sol

Compiler: ${shortVer}
EVM: ${evm || 'default'}
Optimization: ${runs >= 0 ? 'Yes' : 'No'}
Runs: ${runs}
bytecodeHash: ${bytecodeHashNone ? 'none' : 'default'}
viaIR: ${viaIR}
`;
}

function tryOneStandardConfig(solc, src, chainHex, shortVer, cfg) {
  const { evm, runs, bytecodeHashNone, viaIR } = cfg;
  if (viaIR && (shortVer === '0.8.20' || shortVer === '0.8.22')) return null;
  try {
    const matched = tryCompileAndMatch(solc, src, chainHex, {
      evmVersion: evm, runs, bytecodeHashNone, viaIR
    });
    if (!matched) return null;
    return { shortVer, evm, runs, bytecodeHashNone, viaIR };
  } catch (err) {
    if (process.env.DEBUG) console.debug('Skip config:', err?.message);
    return null;
  }
}

async function searchStandardSource(source, chainHex) {
  let tried = 0;
  for (const ver of SOLC_VERSIONS) {
    let solc;
    try {
      solc = await loadSolc(ver);
    } catch (err) {
      console.log('  ', ver, '- no disponible:', err?.message || '');
      continue;
    }
    const shortVer = ver.replace('v', '').split('+')[0];
    const src = setPragma(source, shortVer);

    for (const cfg of STANDARD_CONFIGS) {
      tried++;
      if (tried % 100 === 0) process.stdout.write('.');
      const result = tryOneStandardConfig(solc, src, chainHex, shortVer, cfg);
      if (result) {
        console.log('\n\n*** COINCIDE ***');
        const outSol = path.join(VERIF, 'TRC20TokenUpgradeable-TXaXTSUK-MATCHING.sol');
        const outParams = path.join(VERIF, 'PARAMETROS-TXaXTSUK-MATCHING.txt');
        writeMatchResult(outSol, outParams, src, formatStandardParams(result));
        return true;
      }
    }
  }
  return false;
}

function tryOneFlattenedConfig(solc, flat, chainHex, shortVer, cfg) {
  const { evm, runs, bh } = cfg;
  try {
    const input = {
      language: 'Solidity',
      sources: { 'flat.sol': { content: flat } },
      settings: {
        optimizer: { enabled: runs >= 0, runs },
        evmVersion: evm || 'shanghai',
        outputSelection: { '*': { '*': ['evm.deployedBytecode'] } }
      }
    };
    if (bh) input.settings.metadata = { bytecodeHash: 'none' };
    const out = JSON.parse(solc.compile(JSON.stringify(input)));
    const err = out.errors?.find(e => e.severity === 'error');
    if (err) return null;
    const bc = out.contracts?.['flat.sol']?.TRC20TokenUpgradeable?.evm?.deployedBytecode?.object;
    if (!bc) return null;
    const hex = bc.replace(/^0x/, '');
    return hex === chainHex ? { shortVer, evm, runs, bh } : null;
  } catch (err) {
    if (process.env.DEBUG) console.debug('Compilación flattened falló:', err?.message);
    return null;
  }
}

async function searchFlattenedSource(source, chainHex) {
  const initPath = path.join(VERIF, 'Initializable.sol');
  if (!fs.existsSync(initPath)) return false;

  const init = fs.readFileSync(initPath, 'utf8');
  const initClean = init
    .replace(/pragma +solidity +\^?0\.8\.\d+;/, 'pragma solidity ^0.8.25;')
    .replace(/\babstract +contract +Initializable\b/, 'contract Initializable');
  const implClean = source.replace(/import *\{ *Initializable *\} *from *["']\.\/Initializable\.sol["']; *\n?/i, '');
  const flat = `// SPDX-License-Identifier: MIT\npragma solidity ^0.8.25;\n\n${initClean}\n\n${implClean}`;

  const flattenedVersions = ['v0.8.25+commit.b61c2a91', 'v0.8.34+commit.80d5c536'];
  const configs = buildFlattenedConfigs();

  for (const ver of flattenedVersions) {
    let solc;
    try {
      solc = await loadSolc(ver);
    } catch (err) {
      if (process.env.DEBUG) console.debug(ver, 'no disponible:', err?.message);
      continue;
    }
    const shortVer = ver.replace('v', '').split('+')[0];

    for (const cfg of configs) {
      const result = tryOneFlattenedConfig(solc, flat, chainHex, shortVer, cfg);
      if (!result) continue;

      console.log('*** COINCIDE (flattened 0.8.25) ***');
      const outSol = path.join(VERIF, 'TRC20TokenUpgradeable-TXaXTSUK-MATCHING.sol');
      const outParams = path.join(VERIF, 'PARAMETROS-TXaXTSUK-MATCHING.txt');
      writeMatchResult(outSol, outParams, flat, `COINCIDE
Contract: ${ADDR}
Archivo: TRC20TokenUpgradeable-TXaXTSUK-MATCHING.sol
Compiler: ${result.shortVer}
EVM: ${result.evm || 'shanghai'}
Runs: ${result.runs}
bytecodeHash: ${result.bh ? 'none' : 'default'}
`);
      return true;
    }
  }
  return false;
}

async function main() {
  console.log('=== Búsqueda source que compile a bytecode TXaXTSUK ===\n');
  if (!fs.existsSync(VERIF)) require('../prepare-verification.js');

  const sourcePath = path.join(VERIF, 'TRC20TokenUpgradeable.sol');
  if (!fs.existsSync(sourcePath)) {
    console.error('Falta verification/TRC20TokenUpgradeable.sol');
    process.exit(1);
  }

  const source = fs.readFileSync(sourcePath, 'utf8');
  const chainHex = await fetchBytecode(ADDR);
  console.log('Mainnet:', chainHex.length / 2, 'bytes\n');

  if (await searchStandardSource(source, chainHex)) process.exit(0);

  console.log('\n\nNo se encontró coincidencia con source actual.');
  console.log('Probando source con pragma 0.8.25 (flattened)...');

  if (await searchFlattenedSource(source, chainHex)) process.exit(0);

  console.log('Ninguna combinación produjo bytecode idéntico.');
  console.log('TXaXTSUK pudo compilarse con código diferente al actual.');
  process.exit(1);
}

// CommonJS: IIFE async es el patrón estándar (top-level await requiere ESM)
(async () => {
  try {
    await main();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
