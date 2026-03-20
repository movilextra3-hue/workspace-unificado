/**
 * Genera abi/mainnet-compile-standard-input.json para compilar con solc 0.8.34
 * y reproducir el bytecode de mainnet (comparar con abi/mainnet-implementation-exact.json).
 *
 * Uso:
 *   1. npm run prepare:verification   (genera verification/TRC20TokenUpgradeable.sol con pragma 0.8.34)
 *   2. node scripts/generate-mainnet-compile-spec.js
 *   3. Compilar con solc 0.8.34: solc --standard-json < abi/mainnet-compile-standard-input.json
 *      O con solc npm: node -e "const solc=require('solc'); const fs=require('fs'); const r=JSON.parse(solc.compile(JSON.stringify(JSON.parse(fs.readFileSync('abi/mainnet-compile-standard-input.json','utf8'))))); console.log(r.contracts['TRC20TokenUpgradeable.sol'].TRC20TokenUpgradeable.evm.bytecode.object);"
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const VERIFICATION_DIR = path.join(__dirname, '..', 'verification');
const FLATTENED = path.join(VERIFICATION_DIR, 'TRC20TokenUpgradeable.sol');
const OUT = path.join(__dirname, '..', 'abi', 'mainnet-compile-standard-input.json');

function main() {
  if (!fs.existsSync(FLATTENED)) {
    console.error('Falta verification/TRC20TokenUpgradeable.sol. Ejecuta antes: npm run prepare:verification');
    process.exit(1);
  }
  const content = fs.readFileSync(FLATTENED, 'utf8');
  const standardInput = {
    language: 'Solidity',
    sources: {
      'TRC20TokenUpgradeable.sol': { content }
    },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: 'shanghai',
      outputSelection: {
        '*': { '*': ['evm.bytecode.object', 'evm.bytecode.linkReferences'] }
      }
    }
  };
  const outDir = path.dirname(OUT);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(standardInput, null, 2), 'utf8');
  console.log('Generado:', OUT);
  console.log('Compilador requerido: 0.8.34 (metadata del bytecode en mainnet).');
  console.log('Para compilar: solc-0.8.34 --standard-json < abi/mainnet-compile-standard-input.json');
}

main();
