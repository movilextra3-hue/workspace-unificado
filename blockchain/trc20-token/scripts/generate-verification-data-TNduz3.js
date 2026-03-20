#!/usr/bin/env node
/**
 * Genera datos exactos para verificación de TNduz3PrYRDDN9HmEWXFn3nEsXKCaJt9er.
 * Usa bytecode de TronGrid + ethervm.io (runtime desde 0x5b) y compara con compilación local.
 * Salida: verification/VERIFICACION-TNduz3.json y PARAMETROS-TNduz3.txt
 *
 * Uso: node scripts/generate-verification-data-TNduz3.js
 */
'use strict';
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');

const ADDRESS = 'TNduz3PrYRDDN9HmEWXFn3nEsXKCaJt9er';
const ROOT = path.join(__dirname, '..');
const VERIFICATION_DIR = path.join(ROOT, 'verification');
const FLATTENED = path.join(VERIFICATION_DIR, 'TRC20TokenUpgradeable.sol');

function fetchBytecode(addr) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ value: addr, visible: true });
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
        const runtime = (j.runtimecode || '').replace(/^0x/, '');
        resolve(runtime);
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function loadSolc(version) {
  return new Promise((resolve, reject) => {
    const solc = require('solc');
    if (typeof solc.loadRemoteVersion !== 'function') {
      return reject(new Error('solc.loadRemoteVersion no disponible'));
    }
    solc.loadRemoteVersion(version, (err, snapshot) => {
      if (err) return reject(err);
      resolve(snapshot);
    });
  });
}

function compileWith(solcSnapshot, source, evmVersion, optimizerRuns = 200) {
  const input = {
    language: 'Solidity',
    sources: { 'flat.sol': { content: source } },
    settings: {
      optimizer: { enabled: true, runs: optimizerRuns },
      outputSelection: { '*': { '*': ['evm.deployedBytecode'] } }
    }
  };
  if (evmVersion) input.settings.evmVersion = evmVersion;
  const out = JSON.parse(solcSnapshot.compile(JSON.stringify(input)));
  const err = out.errors?.find(e => e.severity === 'error');
  if (err) throw new Error(err.formattedMessage);
  const bytecode = out.contracts['flat.sol']?.TRC20TokenUpgradeable?.evm?.deployedBytecode?.object;
  if (!bytecode) throw new Error('No deployedBytecode');
  return bytecode.replace(/^0x/, '');
}

/** Quita metadata CBOR del bytecode (spec Solidity: últimos 2 bytes = longitud). */
function stripMetadata(hex) {
  if (hex.length < 4) return hex;
  const lenHex = hex.slice(-4);
  const metaLen = parseInt(lenHex, 16);
  if (metaLen > 0 && metaLen < 200 && hex.length >= (metaLen + 2) * 2) {
    return hex.slice(0, -(metaLen + 2) * 2);
  }
  const idx = hex.lastIndexOf('a264');
  if (idx > 0 && hex.length - idx >= 86) return hex.slice(0, idx);
  return hex;
}

async function main() {
  console.log('[generate-verification-data] Obteniendo bytecode de TronGrid para', ADDRESS);
  const chainBytecode = await fetchBytecode(ADDRESS);
  console.log('[generate-verification-data] Bytecode en cadena:', chainBytecode.length, 'chars hex');

  if (!fs.existsSync(FLATTENED)) {
    console.log('[generate-verification-data] Generando verification...');
    require('./prepare-verification');
  }
  const source = fs.readFileSync(FLATTENED, 'utf8');

  const chainClean = stripMetadata(chainBytecode);
  const chainLen = chainClean.length;

  const configs = [
    { solc: 'v0.8.25+commit.b61c2a91', evm: 'shanghai', runs: 200 },
    { solc: 'v0.8.25+commit.b61c2a91', evm: undefined, runs: 200 },
    { solc: 'v0.8.25+commit.b61c2a91', evm: 'shanghai', runs: 0 },
    { solc: 'v0.8.34+commit.80d5c536', evm: 'shanghai', runs: 200 },
    { solc: 'v0.8.34+commit.80d5c536', evm: undefined, runs: 200 },
  ];

  let bestMatch = null;

  for (const cfg of configs) {
    try {
      const snapshot = await loadSolc(cfg.solc);
      const compiled = compileWith(snapshot, source, cfg.evm, cfg.runs);
      const compiledClean = stripMetadata(compiled);

      const codeMatch = compiledClean === chainClean;
      const fullMatch = chainBytecode === compiled;

      const label = `${cfg.solc.split('+')[0]} evm=${cfg.evm || 'default'} runs=${cfg.runs}`;
      console.log(`  ${label}: codeMatch=${codeMatch} fullMatch=${fullMatch}`);

      if (codeMatch && !bestMatch) {
        bestMatch = {
          compiler: cfg.solc.split('+')[0].replace('v', ''),
          evmVersion: cfg.evm || 'default',
          optimization: true,
          runs: cfg.runs,
          codeMatch: true,
          fullMatch
        };
      }
    } catch (e) {
      console.log(`  ${cfg.solc} ${cfg.evm || 'default'}: ERROR`, e.message);
    }
  }

  if (!bestMatch) {
    console.log('\n[generate-verification-data] No se encontró coincidencia exacta.');
    console.log('  chainClean length:', chainLen);
    process.exit(1);
  }

  const params = {
    contractAddress: ADDRESS,
    mainContract: 'TRC20TokenUpgradeable',
    sourceFile: 'TRC20TokenUpgradeable.sol',
    compilerVersion: bestMatch.compiler,
    optimization: bestMatch.optimization,
    runs: bestMatch.runs,
    evmVersion: bestMatch.evmVersion === 'default' ? 'default (no especificar en TronScan si no hay opción)' : bestMatch.evmVersion,
    license: 'None',
    viaIR: false,
    tronScanUrl: `https://tronscan.org/#/contract/${ADDRESS}/code`,
    verifyUrl: 'https://tronscan.org/#/contracts/verify',
    note: 'TronScan solo ofrece 0.8.25. EVM: elegir Shanghai si está disponible; si no, dejar default.',
    bytecodeMatch: { codeOnly: true, fullWithMetadata: bestMatch.fullMatch },
    references: {
      ethervm: 'https://ethervm.io/decompile/tron/' + ADDRESS,
      tronscan: `https://tronscan.org/#/contract/${ADDRESS}/code`
    },
    generatedAt: new Date().toISOString()
  };

  const outPath = path.join(VERIFICATION_DIR, 'VERIFICACION-TNduz3.json');
  fs.writeFileSync(outPath, JSON.stringify(params, null, 2), 'utf8');
  console.log('\n[generate-verification-data] Escrito:', outPath);

  const txtContent = `VERIFICACIÓN TRONSCAN - TNduz3PrYRDDN9HmEWXFn3nEsXKCaJt9er
============================================================

Contract Address:     ${ADDRESS}
Main Contract:        TRC20TokenUpgradeable
Archivo a subir:      verification/TRC20TokenUpgradeable.sol

Compiler:             ${params.compilerVersion}
Optimization:         Yes
Runs:                 ${params.runs}
License:              None
EVM/VM version:       ${params.evmVersion}
ViaIR:                No

URL verificación:     ${params.verifyUrl}
URL contrato:         ${params.tronScanUrl}

NOTA: Subir el archivo TRC20TokenUpgradeable.sol (con "contract Initializable",
no "abstract contract") para evitar ParserError en TronScan.
`;
  const txtPath = path.join(VERIFICATION_DIR, 'PARAMETROS-TNduz3.txt');
  fs.writeFileSync(txtPath, txtContent, 'utf8');
  console.log('[generate-verification-data] Escrito:', txtPath);

  console.log('\n--- DATOS PARA PEGAR EN TRONSCAN ---');
  console.log('Contract Address:', ADDRESS);
  console.log('Contract Name: TRC20TokenUpgradeable');
  console.log('Compiler: v' + params.compilerVersion);
  console.log('Optimization: Yes, Runs:', params.runs);
  console.log('EVM: Shanghai (o default si no hay opción)');
  console.log('Archivo: verification/TRC20TokenUpgradeable.sol');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
