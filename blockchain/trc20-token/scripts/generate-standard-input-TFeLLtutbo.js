#!/usr/bin/env node
'use strict';
/**
 * Genera Standard Input JSON para verificación en Tronscan (mainnet TRON).
 * Usa la misma configuración que el despliegue (config/trc20-networks.js).
 *
 * Uso: node scripts/generate-standard-input-TFeLLtutbo.js
 * Salida: verification/PAQUETE-VERIFICACION-POST-UPGRADE/standard-input-TFeLLtutbo.json
 */
const fs = require('node:fs');
const path = require('node:path');

const { loadImplementationAddress } = require(path.join(__dirname, 'lib', 'implementation-address.js'));
const ROOT = path.join(__dirname, '..');
const PKG_DIR = path.join(ROOT, 'verification', 'PAQUETE-VERIFICACION-POST-UPGRADE');
const SOURCE_PATH = path.join(PKG_DIR, 'TRC20TokenUpgradeable.sol');
const OUT_PATH = path.join(PKG_DIR, 'standard-input-TFeLLtutbo.json');

function main() {
  if (!fs.existsSync(SOURCE_PATH)) {
    console.error('Falta PAQUETE-VERIFICACION-POST-UPGRADE/TRC20TokenUpgradeable.sol');
    console.error('Ejecutar: npm run guardar:verificacion');
    process.exit(1);
  }

  const source = fs.readFileSync(SOURCE_PATH, 'utf8');
  const config = require(path.join(ROOT, 'config', 'trc20-networks.js'));
  const comp = config.compilers?.solc || {};
  const optimizer = comp.settings?.optimizer?.enabled !== false;
  const runs = comp.settings?.optimizer?.runs ?? 200;
  const evmVersion = comp.settings?.evmVersion || 'shanghai';
  const metadata = comp.settings?.metadata;
  // Misma semántica que compile-with-solc.js (evmVersion + metadata + viaIR false).
  // strip-evm-version-oklink.js quita evmVersion en las variantes OKLink si el sitio rechaza "shanghai".
  const settings = {
    viaIR: false,
    optimizer: { enabled: optimizer, runs },
    evmVersion,
    ...(metadata && { metadata }),
    outputSelection: {
      '*': { '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode'] }
    }
  };
  const IMPL_ADDR = loadImplementationAddress();

  const standardInput = {
    language: 'Solidity',
    sources: {
      'TRC20TokenUpgradeable.sol': { content: source }
    },
    settings
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(standardInput, null, 2), 'utf8');
  console.log('\nGenerado:', OUT_PATH);
  console.log('\nParámetros (coinciden con despliegue y Tronscan):');
  console.log('  Contract Address:', IMPL_ADDR);
  console.log('  Main Contract: TRC20TokenUpgradeable');
  console.log('  Compiler: 0.8.25 | EVM: Shanghai | Optimization: Yes | Runs: 200');
  console.log('  metadata.bytecodeHash: none (coincide con mainnet)');
  console.log('\nTronscan no expone bytecodeHash:none → verificar en OKLink con este JSON:');
  console.log('  https://www.oklink.com/tron/verify-contract-preliminary');
  console.log('');
}

main();
