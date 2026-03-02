'use strict';
/**
 * Compilación alternativa con solc (cuando TronBox no descarga soljson).
 * Genera build/contracts/ para uso con TronWeb deploy.
 * Requiere solc@0.8.34 (package.json) para coincidir con tronbox.js y verificación.
 */
const fs = require('fs');
const path = require('path');
const solc = require('solc');

const CONTRACTS_DIR = path.join(__dirname, '..', 'contracts');
const BUILD_DIR = path.join(__dirname, '..', 'build', 'contracts');

function findImports(importPath) {
  try {
    const fullPath = path.join(CONTRACTS_DIR, importPath.replace(/^\.\//, ''));
    if (!fs.existsSync(fullPath)) return { error: 'File not found' };
    return { contents: fs.readFileSync(fullPath, 'utf8') };
  } catch (e) {
    return { error: e.message || 'File not found' };
  }
}

function compile() {
  if (!fs.existsSync(CONTRACTS_DIR)) {
    console.error('No existe contracts/. Verificar estructura del proyecto.');
    process.exit(1);
  }
  const files = fs.readdirSync(CONTRACTS_DIR).filter(f => f.endsWith('.sol'));
  const sources = {};
  files.forEach(f => {
    const content = fs.readFileSync(path.join(CONTRACTS_DIR, f), 'utf8');
    sources[f] = { content };
  });

  const input = {
    language: 'Solidity',
    sources,
    settings: {
      outputSelection: { '*': { '*': ['abi', 'evm.bytecode'] } },
      optimizer: { enabled: true, runs: 200 }
    }
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));

  if (output.errors) {
    const errs = output.errors.filter(e => e.severity === 'error');
    if (errs.length) {
      console.error(errs);
      process.exit(1);
    }
  }

  if (!fs.existsSync(BUILD_DIR)) {
    fs.mkdirSync(BUILD_DIR, { recursive: true });
  }

  for (const contract of Object.values(output.contracts || {})) {
    for (const [cname, data] of Object.entries(contract)) {
      const artifact = {
        contractName: cname,
        abi: data.abi,
        bytecode: data.evm?.bytecode?.object || '0x',
        deployedBytecode: data.evm?.deployedBytecode?.object || '0x'
      };
      fs.writeFileSync(
        path.join(BUILD_DIR, `${cname}.json`),
        JSON.stringify(artifact, null, 2)
      );
      console.log(`Compilado: ${cname}`);
    }
  }
  console.log('Compilación completada.');
}

compile();
