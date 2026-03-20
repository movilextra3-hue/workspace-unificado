#!/usr/bin/env node
'use strict';
/**
 * Compila TRC20TokenUpgradeable-flattened.sol con 0.8.25, runs 200, Shanghai
 * y compara el bytecode con mainnet (TXaXTSUK).
 * Uso: node scripts/compare-flattened-bytecode.js
 */
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');

const ADDR = 'TXaXTSUKgdAdX76MhQoqQ98msE8azBwiFS';
const ROOT = path.join(__dirname, '..');
const FLAT_PATH = path.join(ROOT, 'verification', 'TXaXTSUK-verification', 'TRC20TokenUpgradeable-flattened.sol');

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

function loadSolc(v) {
  return new Promise((resolve, reject) => {
    require('solc').loadRemoteVersion(v, (err, s) => (err ? reject(err) : resolve(s)));
  });
}

/** Elimina metadata del bytecode para comparación (los últimos 2 bytes indican longitud). */
function stripMetadata(hex) {
  if (hex.length < 4) return hex;
  const buf = Buffer.from(hex, 'hex');
  const len = buf.readUInt16BE(buf.length - 2);
  if (len <= 0 || len >= buf.length - 2) return hex;
  return buf.subarray(0, buf.length - 2 - len).toString('hex');
}

async function main() {
  console.log('=== Comparación bytecode: flattened vs mainnet TXaXTSUK ===\n');

  if (!fs.existsSync(FLAT_PATH)) {
    console.error('Falta:', FLAT_PATH);
    console.error('Ejecuta: node scripts/generate-verification-source.js');
    process.exit(1);
  }

  const source = fs.readFileSync(FLAT_PATH, 'utf8');
  console.log('Origen:', FLAT_PATH);
  console.log('Params: solc 0.8.25, optimizer runs 200, evmVersion shanghai\n');

  const chainHex = await fetchBytecode(ADDR);
  console.log('Mainnet bytecode:', chainHex.length / 2, 'bytes');

  let solc;
  try {
    solc = await loadSolc('v0.8.25+commit.b61c2a91');
  } catch (e) {
    console.error('No se pudo cargar solc 0.8.25:', e.message);
    console.error('Prueba: npm install solc@0.8.25 o verifica conexión para loadRemoteVersion');
    process.exit(1);
  }

  const input = {
    language: 'Solidity',
    sources: { 'TRC20TokenUpgradeable-flattened.sol': { content: source } },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: 'shanghai',
      metadata: { bytecodeHash: 'none' },
      outputSelection: { '*': { '*': ['evm.deployedBytecode'] } }
    }
  };

  const out = JSON.parse(solc.compile(JSON.stringify(input)));
  const err = out.errors?.find(e => e.severity === 'error');
  if (err) {
    console.error('Error al compilar:', err.formattedMessage);
    process.exit(1);
  }

  const compiled = (out.contracts?.['TRC20TokenUpgradeable-flattened.sol']?.TRC20TokenUpgradeable?.evm?.deployedBytecode?.object || '')
    .replace(/^0x/, '');
  if (!compiled) {
    console.error('No se generó deployedBytecode. ¿Main contract = TRC20TokenUpgradeable?');
    process.exit(1);
  }
  console.log('Compilado:', compiled.length / 2, 'bytes\n');

  const chainNoMeta = stripMetadata(chainHex);
  const compNoMeta = stripMetadata(compiled);

  if (chainNoMeta === compNoMeta) {
    console.log('✓ COINCIDE (sin metadata). El flattened es correcto para Tronscan.');
    process.exit(0);
  }

  console.log('✗ NO COINCIDE. El source no compila al bytecode de mainnet.\n');

  const minLen = Math.min(chainNoMeta.length, compNoMeta.length);
  let firstDiff = -1;
  let diffCount = 0;
  for (let i = 0; i < minLen; i += 2) {
    if (chainNoMeta.slice(i, i + 2) !== compNoMeta.slice(i, i + 2)) {
      if (firstDiff < 0) firstDiff = i / 2;
      diffCount++;
    }
  }
  diffCount += Math.abs(chainNoMeta.length - compNoMeta.length) / 2;

  console.log('Bytes distintos (aprox):', diffCount);
  console.log('Primera diferencia en byte:', firstDiff >= 0 ? firstDiff : '—');
  console.log('Longitud (sin metadata): chain', chainNoMeta.length / 2, '| compilado', compNoMeta.length / 2);

  if (firstDiff >= 0 && firstDiff < 200) {
    console.log('\nContexto primera diferencia (hex):');
    const start = Math.max(0, firstDiff - 16) * 2;
    const end = Math.min(chainNoMeta.length, (firstDiff + 32) * 2);
    console.log('Chain   :', chainNoMeta.slice(start, end));
    console.log('Compilad:', compNoMeta.slice(start, end));
  }

  console.log('\nPosibles causas:');
  console.log('- Solc TRON vs Ethereum: la chain usa compilador TRON (TVM); este script usa solc estándar.');
  console.log('- Initializable distinto (OZ vs custom, InvalidInitialization 0x13a3db11).');
  console.log('- El contrato fue desplegado con source/params distintos.');
  console.log('\nTronscan compila con su solc TRON; si los params son correctos puede verificar.');
  process.exit(1);
}

main().catch(e => {
  console.error(e.message || e);
  process.exit(1);
});
