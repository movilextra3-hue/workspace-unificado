#!/usr/bin/env node
'use strict';
/**
 * Comprueba si verification/TRC20TokenUpgradeable.sol compilado con 0.8.25, runs 200, Shanghai
 * produce bytecode idéntico al on-chain de TXaXTSUK.
 * Uso: node scripts/check-bytecode-match-TXaXTSUK.js
 */
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');

const ADDR = 'TXaXTSUKgdAdX76MhQoqQ98msE8azBwiFS';
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
        try {
          const j = JSON.parse(buf);
          resolve((j.runtimecode || '').replace(/^0x/, ''));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function findImports(importPath) {
  const clean = importPath.replace(/^\.\//, '');
  for (const dir of ['verification', 'contracts']) {
    const fullPath = path.join(ROOT, dir, clean);
    if (fs.existsSync(fullPath)) {
      return { contents: fs.readFileSync(fullPath, 'utf8') };
    }
  }
  return { error: 'File not found: ' + importPath };
}

async function main() {
  const verifPath = path.join(ROOT, 'verification', 'TRC20TokenUpgradeable.sol');
  if (!fs.existsSync(verifPath)) {
    console.error('Ejecuta npm run prepare:verification primero');
    process.exit(1);
  }

  const source = fs.readFileSync(verifPath, 'utf8');

  let solc;
  try {
    solc = require('solc');
  } catch (e) {
    console.error('solc no instalado:', e.message);
    process.exit(1);
  }

  const input = {
    language: 'Solidity',
    sources: { 'TRC20TokenUpgradeable.sol': { content: source } },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: 'shanghai',
      outputSelection: { '*': { '*': ['evm.deployedBytecode'] } }
    }
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));
  const err = output.errors?.find(e => e.severity === 'error');
  if (err) {
    console.error('Error compilando:', err.formattedMessage);
    process.exit(1);
  }

  const bc = output.contracts?.['TRC20TokenUpgradeable.sol']?.TRC20TokenUpgradeable?.evm?.deployedBytecode?.object;
  if (!bc) {
    console.error('No deployedBytecode en salida');
    process.exit(1);
  }
  const compiledHex = bc.replace(/^0x/, '');

  const chainHex = await fetchBytecode(ADDR);

  console.log('=== Comprobación bytecode TXaXTSUK ===\n');
  console.log('Mainnet:', chainHex.length / 2, 'bytes');
  console.log('Compilado (0.8.25, Shanghai, runs 200):', compiledHex.length / 2, 'bytes');
  console.log('');

  if (chainHex === compiledHex) {
    console.log('✓ COINCIDE. Los datos propuestos (0.8.25, runs 200, Shanghai) son correctos para verificación.');
    process.exit(0);
  } else {
    console.log('✗ NO COINCIDE. Subir verification/TRC20TokenUpgradeable.sol con 0.8.25 fallará en Tronscan.');
    const diff = [...compiledHex].filter((c, i) => chainHex[i] !== c).length;
    console.log('  Diferencias aproximadas:', Math.min(diff, compiledHex.length / 2), 'bytes');
    console.log('\n  Probar otras combinaciones (0.8.25, evmVersion, bytecodeHash, etc.).');
    process.exit(1);
  }
}

main().catch(e => {
  console.error(e.message || e);
  process.exit(1);
});
