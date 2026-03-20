#!/usr/bin/env node
'use strict';
/**
 * Búsqueda usando SOLO solc 0.8.25 (extraído del metadata CBOR del bytecode).
 * Agota todas las combinaciones EVM, runs, bytecodeHash, viaIR.
 */
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');

const ADDR = 'TXaXTSUKgdAdX76MhQoqQ98msE8azBwiFS';
const ROOT = path.join(__dirname, '..');
const VERIF = path.join(ROOT, 'verification');

const EVM_VERSIONS = [undefined, 'shanghai', 'cancun', 'paris', 'london', 'istanbul'];
const RUNS = [0, 1, 200, 1000, 10000];

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

async function main() {
  console.log('=== Búsqueda TXaXTSUK con solc 0.8.25 (metadata CBOR) ===\n');
  if (!fs.existsSync(VERIF)) {
    require('../prepare-verification.js');
  }
  const sourcePath = path.join(VERIF, 'TRC20TokenUpgradeable.sol');
  if (!fs.existsSync(sourcePath)) {
    console.error('Falta verification/TRC20TokenUpgradeable.sol');
    process.exit(1);
  }
  let source = fs.readFileSync(sourcePath, 'utf8');
  source = source.replace(/pragma\s+solidity\s+\^?0\.8\.\d+;/, 'pragma solidity ^0.8.25;');

  const CONTRACTS = path.join(ROOT, 'contracts');
  function findImports(importPath) {
    const clean = importPath.replace(/^\.\//, '');
    for (const dir of [VERIF, CONTRACTS]) {
      const fp = path.join(dir, clean);
      if (fs.existsSync(fp)) return { contents: fs.readFileSync(fp, 'utf8') };
    }
    return { error: 'Not found: ' + importPath };
  }

  const chainHex = await fetchBytecode(ADDR);
  console.log('Mainnet:', chainHex.length / 2, 'bytes');

  let solc;
  try {
    solc = await loadSolc('v0.8.25+commit.b61c2a91');
  } catch (e) {
    console.error('No se pudo cargar solc 0.8.25:', e.message);
    process.exit(1);
  }

  const wrapCompile = (opts) => {
  const input = {
    language: 'Solidity',
    sources: { 'TRC20TokenUpgradeable.sol': { content: source } },
    settings: {
      optimizer: { enabled: opts.runs >= 0, runs: opts.runs },
      metadata: { bytecodeHash: 'none' },
      outputSelection: { '*': { '*': ['evm.deployedBytecode'] } }
    }
  };
  if (opts.evmVersion) input.settings.evmVersion = opts.evmVersion;
  if (opts.viaIR) input.settings.viaIR = true;
    const out = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));
    const err = out.errors?.find(e => e.severity === 'error');
    if (err) throw new Error(err.formattedMessage);
    const bc = out.contracts?.['TRC20TokenUpgradeable.sol']?.TRC20TokenUpgradeable?.evm?.deployedBytecode?.object;
    if (!bc) throw new Error('No bytecode');
    return bc.replace(/^0x/, '');
  };

  let tried = 0;
  for (const evm of EVM_VERSIONS) {
    for (const runs of RUNS) {
      for (const viaIR of [false, true]) {
        tried++;
        if (tried % 20 === 0) process.stdout.write('.');
        try {
          const bc = wrapCompile({ evmVersion: evm, runs, bytecodeHashNone: true, viaIR });
          if (bc === chainHex) {
            console.log('\n\n*** COINCIDE ***');
            const outSol = path.join(VERIF, 'TRC20TokenUpgradeable-TXaXTSUK-MATCHING.sol');
            const outParams = path.join(VERIF, 'PARAMETROS-TXaXTSUK-MATCHING.txt');
            fs.writeFileSync(outSol, source, 'utf8');
            fs.writeFileSync(outParams, `COINCIDE CON TXaXTSUK
Contract: ${ADDR}
Archivo: TRC20TokenUpgradeable-TXaXTSUK-MATCHING.sol

Compiler: 0.8.25 (metadata CBOR)
EVM: ${evm || 'default'}
Optimization: ${runs >= 0 ? 'Yes' : 'No'}
Runs: ${runs}
bytecodeHash: none (metadata chain)
viaIR: ${viaIR}
`, 'utf8');
              console.log('Source:', outSol);
              console.log('Parámetros:', outParams);
              process.exit(0);
            }
          } catch (e) { /* skip */ }
      }
    }
  }

  console.log('\n\nCon multi-archivo: ninguna coincidencia.');
  console.log('Probando flattened (Initializable + TRC20TokenUpgradeable)...');

  const initPath = path.join(VERIF, 'Initializable.sol');
  let flat;
  if (fs.existsSync(initPath)) {
    const init = fs.readFileSync(initPath, 'utf8');
    const initClean = init
      .replace(/pragma\s+solidity\s+\^?0\.8\.\d+;/, 'pragma solidity ^0.8.25;')
      .replace(/\babstract\s+contract\s+Initializable\b/, 'contract Initializable');
    const implClean = source.replace(/import\s*\{\s*Initializable\s*\}\s*from\s*["']\.\/Initializable\.sol["'];\s*\n?/i, '');
    flat = `// SPDX-License-Identifier: MIT\npragma solidity ^0.8.25;\n\n${initClean}\n\n${implClean}`;
  } else {
    // TRC20TokenUpgradeable.sol autocontenido (Initializable inlined) — usar source directo
    flat = source.replace(/pragma\s+solidity\s+\^?0\.8\.\d+;/, 'pragma solidity ^0.8.25;');
  }

  const flatInput = {
    language: 'Solidity',
    sources: { 'flat.sol': { content: flat } },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      metadata: { bytecodeHash: 'none' },
      outputSelection: { '*': { '*': ['evm.deployedBytecode'] } }
    }
  };

  for (const evm of EVM_VERSIONS) {
    for (const runs of RUNS) {
      for (const viaIR of [false, true]) {
        try {
          flatInput.settings.optimizer = { enabled: runs >= 0, runs };
          flatInput.settings.evmVersion = evm || undefined;
          flatInput.settings.viaIR = viaIR;
            const out = JSON.parse(solc.compile(JSON.stringify(flatInput)));
            const err = out.errors?.find(e => e.severity === 'error');
            if (err) continue;
            const bc = out.contracts?.['flat.sol']?.TRC20TokenUpgradeable?.evm?.deployedBytecode?.object;
            if (!bc) continue;
            const hex = bc.replace(/^0x/, '');
            if (hex === chainHex) {
              console.log('*** COINCIDE (flattened) ***');
              const outSol = path.join(VERIF, 'TRC20TokenUpgradeable-TXaXTSUK-MATCHING.sol');
              const outParams = path.join(VERIF, 'PARAMETROS-TXaXTSUK-MATCHING.txt');
              fs.writeFileSync(outSol, flat, 'utf8');
              fs.writeFileSync(outParams, `COINCIDE (flattened)
Contract: ${ADDR}
Compiler: 0.8.25
EVM: ${evm || 'default'}
Runs: ${runs}
bytecodeHash: none
viaIR: ${viaIR}
`, 'utf8');
              console.log('Source:', outSol);
              process.exit(0);
            }
          } catch (e) { /* skip */ }
      }
    }
  }

  console.log('Ninguna combinación con 0.8.25 produjo bytecode idéntico.');
  process.exit(1);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
