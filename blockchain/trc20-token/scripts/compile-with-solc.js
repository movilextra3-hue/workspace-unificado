'use strict';
/**
 * Compilación principal con solc (alternativa a TronBox).
 * Genera build/contracts/ para uso con TronWeb deploy.
 * Parámetros desde config/trc20-networks.js (fuente única de verdad).
 * Uso: node scripts/compile-with-solc.js
 *      npm run compile
 */
const fs = require('fs');
const path = require('path');
const solc = require('solc');

const ROOT = path.join(__dirname, '..');
const CONTRACTS_DIR = path.join(ROOT, 'contracts');
const BUILD_DIR = path.join(ROOT, 'build', 'contracts');

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

  const config = require(path.join(ROOT, 'config', 'trc20-networks.js'));
  const comp = config.compilers?.solc || {};
  const optimizer = comp.settings?.optimizer?.enabled !== false;
  const runs = comp.settings?.optimizer?.runs ?? 200;
  const evmVersion = comp.settings?.evmVersion || 'shanghai';
  const metadata = comp.settings?.metadata;

  const files = fs.readdirSync(CONTRACTS_DIR).filter(f => f.endsWith('.sol'));
  const sources = {};
  files.forEach(f => {
    const content = fs.readFileSync(path.join(CONTRACTS_DIR, f), 'utf8');
    sources[f] = { content };
  });

  const settings = {
    outputSelection: { '*': { '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode'] } },
    optimizer: { enabled: optimizer, runs },
    evmVersion,
    viaIR: false
  };
  if (metadata !== undefined && metadata !== null) {
    settings.metadata = metadata;
  }
  const input = {
    language: 'Solidity',
    sources,
    settings
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
