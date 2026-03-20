#!/usr/bin/env node
/**
 * Genera el Standard Input JSON para verificación de TXaXTSUK.
 * TXaXTSUK se desplegó con metadata.bytecodeHash: 'none'.
 * Tronscan no ofrece esa opción; OKLink u otras plataformas podrían aceptar este JSON.
 *
 * Uso: node scripts/generate-standard-input-TXaXTSUK.js
 * Salida: verification/standard-input-TXaXTSUK.json
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const ADDR = 'TXaXTSUKgdAdX76MhQoqQ98msE8azBwiFS';
const VERIFICATION_DIR = path.join(__dirname, '..', 'verification');
const SOURCE_PATH = path.join(VERIFICATION_DIR, 'TRC20TokenUpgradeable.sol');
const OUT_PATH = path.join(VERIFICATION_DIR, 'standard-input-TXaXTSUK.json');

function main() {
  if (!fs.existsSync(SOURCE_PATH)) {
    require('../prepare-verification');
  }
  if (!fs.existsSync(SOURCE_PATH)) {
    console.error('Falta verification/TRC20TokenUpgradeable.sol');
    process.exit(1);
  }

  const source = fs.readFileSync(SOURCE_PATH, 'utf8');

  // Exactamente como se usó en el deploy (con bytecodeHash:none)
  const standardInput = {
    language: 'Solidity',
    sources: {
      'TRC20TokenUpgradeable.sol': { content: source }
    },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: 'shanghai',
      metadata: { bytecodeHash: 'none' },
      outputSelection: {
        '*': { '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode'] }
      }
    }
  };

  if (!fs.existsSync(VERIFICATION_DIR)) {
    fs.mkdirSync(VERIFICATION_DIR, { recursive: true });
  }
  fs.writeFileSync(OUT_PATH, JSON.stringify(standardInput, null, 2), 'utf8');
  console.log('Generado:', OUT_PATH);
  console.log('');
  console.log('Parámetros para verificación:');
  console.log('  Contract Address:', ADDR);
  console.log('  Main Contract: TRC20TokenUpgradeable');
  console.log('  Compiler: 0.8.25 | EVM: Shanghai | Optimization: Yes | Runs: 200');
  console.log('  metadata.bytecodeHash: none (incluido en el JSON)');
  console.log('');
  console.log('Probar en OKLink: https://www.oklink.com/tron/verify-contract-preliminary');
  console.log('Si la plataforma acepta "Standard Input JSON", sube este archivo.');
}

main();
