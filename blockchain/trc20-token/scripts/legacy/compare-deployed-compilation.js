#!/usr/bin/env node
/**
 * Compara la compilación que se desplegó (upgrade-with-solc) con el bytecode en mainnet.
 * Identifica diferencias byte a byte y extrae metadata del bytecode desplegado.
 * Uso: node scripts/compare-deployed-compilation.js
 */
'use strict';
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');

const ADDR = 'TXaXTSUKgdAdX76MhQoqQ98msE8azBwiFS';
const ROOT = path.join(__dirname, '..');
const SOURCE = path.join(ROOT, 'verification', 'TRC20TokenUpgradeable.sol');
const BUILD_ARTIFACT = path.join(ROOT, 'build', 'contracts', 'TRC20TokenUpgradeable.json');

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
        const j = JSON.parse(buf);
        resolve((j.runtimecode || '').replace(/^0x/, ''));
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

/** Compila con la misma config que upgrade-with-solc (0.8.25, Shanghai, runs 200, sin bytecodeHash:none). */
function compileDeployedConfig(solc, source) {
  const input = {
    language: 'Solidity',
    sources: { 'TRC20TokenUpgradeable.sol': { content: source } },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: 'shanghai',
      outputSelection: { '*': { '*': ['evm.deployedBytecode'] } }
    }
  };
  const out = JSON.parse(solc.compile(JSON.stringify(input)));
  const err = out.errors?.find(e => e.severity === 'error');
  if (err) throw new Error(err.formattedMessage);
  const bc = out.contracts['TRC20TokenUpgradeable.sol']?.TRC20TokenUpgradeable?.evm?.deployedBytecode?.object;
  if (!bc) throw new Error('No deployedBytecode');
  return bc.replace(/^0x/, '');
}

/** Compila con bytecodeHash:none (config que tenía upgrade-with-solc cuando se desplegó TXaXTSUK). */
function compileWithBytecodeHashNone(solc, source) {
  const input = {
    language: 'Solidity',
    sources: { 'TRC20TokenUpgradeable.sol': { content: source } },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: 'shanghai',
      metadata: { bytecodeHash: 'none' },
      outputSelection: { '*': { '*': ['evm.deployedBytecode'] } }
    }
  };
  const out = JSON.parse(solc.compile(JSON.stringify(input)));
  const err = out.errors?.find(e => e.severity === 'error');
  if (err) throw new Error(err.formattedMessage);
  const bc = out.contracts['TRC20TokenUpgradeable.sol']?.TRC20TokenUpgradeable?.evm?.deployedBytecode?.object;
  if (!bc) throw new Error('No deployedBytecode');
  return bc.replace(/^0x/, '');
}

/** Extrae metadata del bytecode (sufijo CBOR). Devuelve { suffix, compilerHint } */
function extractMetadata(hex) {
  if (!hex || hex.length < 20) return { suffix: '', compilerHint: null };
  const idx = hex.lastIndexOf('a264');
  if (idx < 0) return { suffix: '', compilerHint: null };
  const suffix = hex.slice(idx);
  let compilerHint = null;
  const solcIdx = suffix.indexOf('736f6c63'); // "solc" en hex (key en CBOR)
  if (solcIdx >= 0 && suffix.length >= solcIdx + 16) {
    const verHex = suffix.slice(solcIdx + 10, solcIdx + 16); // skip "solc"(4) + 43(1), read 3 bytes
    if (verHex.length >= 6) {
      const major = parseInt(verHex.slice(0, 2), 16);
      const minor = parseInt(verHex.slice(2, 4), 16);
      const patch = parseInt(verHex.slice(4, 6), 16);
      compilerHint = `0.${major}.${minor}.${patch}`;
    }
  }
  return { suffix, compilerHint };
}

/** Lista todas las diferencias byte a byte (máx maxDiffs). */
function findAllDiffs(a, b, maxDiffs = 100) {
  const diffs = [];
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len && diffs.length < maxDiffs; i += 2) {
    if (a.slice(i, i + 2) !== b.slice(i, i + 2)) {
      diffs.push({
        bytePos: i / 2,
        hexIndex: i,
        mainnet: a.slice(i, i + 2),
        compiled: b.slice(i, i + 2)
      });
    }
  }
  if (a.length !== b.length) {
    diffs.push({
      bytePos: len / 2,
      hexIndex: len,
      lengthDiff: true,
      mainnetBytes: a.length / 2,
      compiledBytes: b.length / 2
    });
  }
  return diffs;
}

function main() {
  return (async () => {
    console.log('=== Comparación: compilación desplegada vs mainnet ===\n');
    console.log('Implementation:', ADDR);
    console.log('');

    if (!fs.existsSync(SOURCE)) {
      try { require('../prepare-verification'); } catch { /* fallback */ }
    }
    if (!fs.existsSync(SOURCE)) {
      console.error('Falta verification/TRC20TokenUpgradeable.sol. Ejecuta: npm run prepare:verification');
      process.exit(1);
    }

    const source = fs.readFileSync(SOURCE, 'utf8');
    const chainHex = await fetchBytecode(ADDR);

    console.log('--- 1. Bytecode en mainnet ---');
    console.log('  Longitud:', chainHex.length, 'hex chars =', chainHex.length / 2, 'bytes');
    const meta = extractMetadata(chainHex);
    if (meta.suffix) {
      console.log('  Sufijo metadata (últimos 86 chars):', chainHex.slice(-86));
      if (meta.compilerHint) console.log('  Compilador (hint desde metadata):', meta.compilerHint);
    }
    console.log('');

    const solc = await loadSolc('v0.8.25+commit.b61c2a91');

    console.log('--- 2. Compilación actual (upgrade-with-solc: 0.8.25, Shanghai, runs 200) ---');
    const deployedConfig = compileDeployedConfig(solc, source);
    console.log('  Longitud:', deployedConfig.length, 'hex chars =', deployedConfig.length / 2, 'bytes');
    console.log('');

    console.log('--- 3. Compilación con bytecodeHash:none (config antigua de upgrade-with-solc) ---');
    const hashNoneConfig = compileWithBytecodeHashNone(solc, source);
    console.log('  Longitud:', hashNoneConfig.length, 'hex chars =', hashNoneConfig.length / 2, 'bytes');
    console.log('');

    let tronboxBytecode = null;
    if (fs.existsSync(BUILD_ARTIFACT)) {
      const artifact = JSON.parse(fs.readFileSync(BUILD_ARTIFACT, 'utf8'));
      const raw = artifact.deployedBytecode;
      tronboxBytecode = (typeof raw === 'string' ? raw : raw?.object || '').replace(/^0x/, '') || null;
      if (tronboxBytecode) {
        console.log('--- 4. Bytecode TronBox (build/contracts/) ---');
        console.log('  Longitud:', tronboxBytecode.length, 'hex chars');
        console.log('');
      }
    }

    console.log('=== DIFERENCIAS DETALLADAS ===\n');

    const configs = [
      { name: 'Config actual (sin bytecodeHash:none)', hex: deployedConfig },
      { name: 'Config antigua (con bytecodeHash:none)', hex: hashNoneConfig }
    ];
    if (tronboxBytecode) configs.push({ name: 'TronBox build/', hex: tronboxBytecode });

    for (const cfg of configs) {
      console.log('---', cfg.name, '---');
      const diffs = findAllDiffs(chainHex, cfg.hex, 80);
      const lenDiff = (chainHex.length - cfg.hex.length) / 2;
      console.log('  Diferencia longitud: mainnet', chainHex.length / 2, 'bytes | compilado', cfg.hex.length / 2, 'bytes (diff:', lenDiff > 0 ? '+' : '', lenDiff, 'bytes)');
      console.log('  Total diferencias encontradas:', diffs.length);
      if (diffs.length > 0) {
        console.log('  Primeras 25 diferencias (byte | mainnet | compilado):');
        for (const d of diffs.slice(0, 25)) {
          if (d.lengthDiff) {
            console.log('    byte', d.bytePos, '| LONGITUD: mainnet', d.mainnetBytes, '| compilado', d.compiledBytes);
          } else {
            console.log('    byte', String(d.bytePos).padStart(5), '|', d.mainnet, '|', d.compiled);
          }
        }
        if (diffs.length > 25) {
          console.log('    ... y', diffs.length - 25, 'más');
        }
      }
      console.log('');
    }

    console.log('--- Contexto bytes 0-50 (mainnet vs config actual) ---');
    const mainnetStart = chainHex.slice(0, 100);
    const compiledStart = deployedConfig.slice(0, 100);
    console.log('  Mainnet :', mainnetStart);
    console.log('  Compilado:', compiledStart);
    for (let i = 0; i < Math.min(100, mainnetStart.length, compiledStart.length); i += 2) {
      if (mainnetStart.slice(i, i + 2) !== compiledStart.slice(i, i + 2)) {
        console.log('  ^ Primera diff en hexIndex', i, '(byte', i / 2, '): mainnet', mainnetStart.slice(i, i + 2), '| compilado', compiledStart.slice(i, i + 2));
        break;
      }
    }
    console.log('');

    console.log('--- Conclusión ---');
    const matchDeployed = chainHex === deployedConfig;
    const matchHashNone = chainHex === hashNoneConfig;
    if (matchDeployed) {
      console.log('  La compilación actual COINCIDE con mainnet.');
    } else if (matchHashNone) {
      console.log('  La compilación con bytecodeHash:none COINCIDE con mainnet.');
    } else {
      console.log('  Ninguna compilación local coincide con mainnet.');
      console.log('  Causas probables:');
      console.log('    1. El código fuente actual difiere del que se usó en el despliegue.');
      console.log('    2. Se usó otra versión de Solidity (p. ej. 0.8.34).');
      console.log('    3. Se usó TronBox con configuración distinta.');
      console.log('  La primera diferencia en byte 22 indica divergencia desde el inicio del bytecode.');
    }
  })();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
