#!/usr/bin/env node
/**
 * Comprueba qué parámetros de compilación coinciden con el bytecode
 * de TODOS los contratos pendientes de verificación.
 * Salida: params para cada contrato (TronScan 0.8.25 o no verificable).
 *
 * Uso: node scripts/check-bytecode-all.js
 */
'use strict';
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const VERIFICATION_DIR = path.join(ROOT, 'verification');

const CONTRACTS = [
  { address: 'TXaXTSUKgdAdX76MhQoqQ98msE8azBwiFS', mainContract: 'TRC20TokenUpgradeable', sourceFile: 'TXaXTSUK-verification/TRC20TokenUpgradeable-flattened.sol' },
  { address: 'TTTT4AeRUjJEmTepb9X4uK4f6Pxg8UwwkW', mainContract: 'ProxyAdmin', sourceFile: 'ProxyAdmin.sol' },
  { address: 'TQJ6f3eczr2rK9x9kN2JMTdDN1zTm46XxE', mainContract: 'ProxyAdmin', sourceFile: 'ProxyAdmin.sol' },
  { address: 'TVeVPZGiMc9GWQ8sQHvUwhfg19EDZt3UjZ', mainContract: 'ProxyAdmin', sourceFile: 'ProxyAdmin.sol' },
  { address: 'TYqRvxioNWBqVa2nJGog8RkYQrXQdPJwR3', mainContract: 'TRC20TokenUpgradeable', sourceFile: 'TRC20TokenUpgradeable.sol' },
  { address: 'TPK7VWSGSH1nK4jetcNCz1BQqMU7gmnaLe', mainContract: 'TRC20TokenUpgradeable', sourceFile: 'TRC20TokenUpgradeable.sol' },
  { address: 'TNduz3PrYRDDN9HmEWXFn3nEsXKCaJt9er', mainContract: 'TRC20TokenUpgradeable', sourceFile: 'TRC20TokenUpgradeable.sol', verified: true }
];

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
        resolve((j.runtimecode || '').replace(/^0x/, ''));
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
    solc.loadRemoteVersion(version, (err, s) => (err ? reject(err) : resolve(s)));
  });
}

function stripMetadata(hex) {
  if (!hex || hex.length < 4) return hex;
  const lenBytes = parseInt(hex.slice(-4), 16);
  if (lenBytes > 0 && lenBytes < 200 && hex.length >= (lenBytes + 2) * 2) {
    return hex.slice(0, -(lenBytes + 2) * 2);
  }
  const idx = hex.lastIndexOf('a264');
  if (idx > 0 && hex.length - idx >= 86) return hex.slice(0, idx);
  return hex;
}

function compileContract(solcSnapshot, source, mainContract, evmVersion, runs = 200) {
  const input = {
    language: 'Solidity',
    sources: { 'flat.sol': { content: source } },
    settings: {
      optimizer: { enabled: true, runs },
      outputSelection: { '*': { '*': ['evm.deployedBytecode'] } }
    }
  };
  if (evmVersion) input.settings.evmVersion = evmVersion;
  const out = JSON.parse(solcSnapshot.compile(JSON.stringify(input)));
  const err = out.errors?.find(e => e.severity === 'error');
  if (err) throw new Error(err.formattedMessage);
  const bc = out.contracts['flat.sol']?.[mainContract]?.evm?.deployedBytecode?.object;
  if (!bc) throw new Error('No deployedBytecode');
  return bc.replace(/^0x/, '');
}

const CONFIGS = [
  { solc: 'v0.8.25+commit.b61c2a91', evm: 'shanghai', runs: 200, tronScan: true },
  { solc: 'v0.8.25+commit.b61c2a91', evm: undefined, runs: 200, tronScan: true },
  { solc: 'v0.8.34+commit.80d5c536', evm: 'shanghai', runs: 200, tronScan: false },
  { solc: 'v0.8.34+commit.80d5c536', evm: undefined, runs: 200, tronScan: false }
];

async function checkContract(contract, solcSnapshots) {
  const sourcePath = path.join(VERIFICATION_DIR, contract.sourceFile);
  if (!fs.existsSync(sourcePath)) return { ok: false, error: 'Archivo no existe: ' + contract.sourceFile };

  const source = fs.readFileSync(sourcePath, 'utf8');
  const chainBytecode = await fetchBytecode(contract.address);
  const chainClean = stripMetadata(chainBytecode);

  for (const cfg of CONFIGS) {
    try {
      const snap = solcSnapshots[cfg.solc];
      if (!snap) continue;
      const compiled = compileContract(snap, source, contract.mainContract, cfg.evm, cfg.runs);
      const compiledClean = stripMetadata(compiled);
      if (compiledClean === chainClean) {
        return {
          ok: true,
          config: cfg,
          tronScanVerifiable: cfg.tronScan,
          compiler: cfg.solc.replace('v', '').split('+')[0],
          evmVersion: cfg.evm || 'default',
          runs: cfg.runs
        };
      }
    } catch {
      /* siguiente config */
    }
  }
  return { ok: false, error: 'Ninguna config coincide' };
}

async function main() {
  if (!fs.existsSync(path.join(VERIFICATION_DIR, 'TRC20TokenUpgradeable.sol'))) {
    require('../prepare-verification');
  }

  const solcSnapshots = {};
  for (const cfg of CONFIGS) {
    if (!solcSnapshots[cfg.solc]) {
      try {
        solcSnapshots[cfg.solc] = await loadSolc(cfg.solc);
      } catch (e) {
        console.warn('No se pudo cargar', cfg.solc, e.message);
      }
    }
  }

  const results = [];
  for (const c of CONTRACTS) {
    process.stdout.write(`Comprobando ${c.address} (${c.mainContract})... `);
    const r = await checkContract(c, solcSnapshots);
    results.push({ ...c, ...r });
    if (r.ok) {
      console.log(`OK: ${r.compiler}+${r.evmVersion} runs=${r.runs} ${r.tronScanVerifiable ? '(TronScan)' : '(NO TronScan)'}`);
    } else {
      console.log('FALLO:', r.error);
    }
  }

  // Resumen y archivo de params
  const summary = [];
  summary.push('=== PARÁMETROS VERIFICACIÓN TRONSCAN ===');
  summary.push('Método TNduz3: Compiler Ethereum 0.8.25, EVM Shanghai (20), Optimization Yes, Runs 200, License None');
  summary.push('');
  for (const r of results) {
    summary.push(`--- ${r.address} (${r.mainContract}) ---`);
    if (r.ok && r.tronScanVerifiable) {
      summary.push('VERIFICABLE en TronScan');
      summary.push(`  Archivo: verification/${r.sourceFile}`);
      summary.push('  Compiler: 0.8.25 (Ethereum, NO TRON)');
      summary.push('  EVM: Shanghai (20)');
      summary.push('  Optimization: Yes, Runs: 200');
      summary.push('  License: None');
      summary.push(`  Main Contract: ${r.mainContract}`);
    } else if (r.ok && !r.tronScanVerifiable) {
      summary.push(`NO verificable en TronScan (compilado con ${r.compiler}+${r.evmVersion})`);
      summary.push(`  TronScan solo ofrece 0.8.25. Probar OKLink si ofrece ${r.compiler}.`);
    } else {
      summary.push('NO se encontró coincidencia de bytecode.');
    }
    summary.push('');
  }

  const outPath = path.join(VERIFICATION_DIR, 'PARAMETROS-TODOS-CONTRATOS.txt');
  fs.writeFileSync(outPath, summary.join('\n'), 'utf8');
  console.log('\nEscrito:', outPath);

  const jsonPath = path.join(VERIFICATION_DIR, 'VERIFICACION-RESULTADOS.json');
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2), 'utf8');
  console.log('Escrito:', jsonPath);

  const verifiable = results.filter(r => r.ok && r.tronScanVerifiable);
  console.log(`\n${verifiable.length}/${results.length} contratos verificables en TronScan con método TNduz3.`);
  return verifiable.length === results.length ? 0 : 1;
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).then(c => process.exit(c));
