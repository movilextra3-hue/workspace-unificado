#!/usr/bin/env node
/**
 * Diagnóstico de verificación para TXaXTSUKgdAdX76MhQoqQ98msE8azBwiFS.
 * El upgrade usó metadata: { bytecodeHash: 'none' } - Tronscan puede no soportarlo.
 * Uso: node scripts/diagnose-verify-TXaXTSUK.js
 */
'use strict';
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');

const ADDR = 'TXaXTSUKgdAdX76MhQoqQ98msE8azBwiFS';
const VERIFICATION_DIR = path.join(__dirname, '..', 'verification');
const SOURCE_PATH = path.join(VERIFICATION_DIR, 'TRC20TokenUpgradeable.sol');

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

function stripMetadata(hex) {
  if (!hex || hex.length < 4) return hex;
  const len = parseInt(hex.slice(-4), 16);
  if (len > 0 && len < 200 && hex.length >= (len + 2) * 2) return hex.slice(0, -(len + 2) * 2);
  const idx = hex.lastIndexOf('a264');
  if (idx > 0 && hex.length - idx >= 86) return hex.slice(0, idx);
  return hex;
}

function compile(solc, source, opts = {}) {
  const settings = {
    optimizer: { enabled: true, runs: opts.runs ?? 200 },
    outputSelection: { '*': { '*': ['evm.deployedBytecode'] } }
  };
  if (opts.evm) settings.evmVersion = opts.evm;
  if (opts.bytecodeHashNone) settings.metadata = { bytecodeHash: 'none' };
  const input = {
    language: 'Solidity',
    sources: { 'flat.sol': { content: source } },
    settings
  };
  const out = JSON.parse(solc.compile(JSON.stringify(input)));
  const err = out.errors?.find(e => e.severity === 'error');
  if (err) throw new Error(err.formattedMessage);
  const bc = out.contracts['flat.sol']?.TRC20TokenUpgradeable?.evm?.deployedBytecode?.object;
  if (!bc) throw new Error('No deployedBytecode');
  return bc.replace(/^0x/, '');
}

async function main() {
  console.log('=== Diagnóstico verificación', ADDR, '===\n');

  if (!fs.existsSync(SOURCE_PATH)) {
    require('./prepare-verification');
  }
  if (!fs.existsSync(SOURCE_PATH)) {
    console.error('Falta verification/TRC20TokenUpgradeable.sol');
    process.exit(1);
  }

  const source = fs.readFileSync(SOURCE_PATH, 'utf8');
  const chainHex = await fetchBytecode(ADDR);
  const chainStripped = stripMetadata(chainHex);

  console.log('Bytecode en chain:', chainHex.length, 'hex chars');
  console.log('Bytecode (sin metadata):', chainStripped.length, 'hex chars\n');

  const solc = await loadSolc('v0.8.25+commit.b61c2a91');

  const configs = [
    { name: '0.8.25+shanghai runs200 (sin metadata)', evm: 'shanghai', runs: 200, bytecodeHashNone: false },
    { name: '0.8.25+shanghai runs200 CON bytecodeHash:none (como deploy)', evm: 'shanghai', runs: 200, bytecodeHashNone: true }
  ];

  for (const cfg of configs) {
    try {
      const compiled = compile(solc, source, cfg);
      const compStripped = stripMetadata(compiled);
      const fullMatch = compiled === chainHex;
      const strippedMatch = compStripped === chainStripped;

      console.log('Config:', cfg.name);
      console.log('  Full bytecode match:', fullMatch ? 'SÍ' : 'NO');
      console.log('  Bytecode ejecutable (sin metadata) match:', strippedMatch ? 'SÍ' : 'NO');
      if (strippedMatch && !fullMatch) {
        console.log('  → La diferencia es METADATA. Tronscan suele ignorar metadata.');
        console.log('  → Si Tronscan falla, puede que compare bytecode completo.');
      }
      if (fullMatch) {
        console.log('  → ¡Coincidencia exacta! Parámetros correctos.');
      }
      console.log('');
    } catch (e) {
      console.log('Config:', cfg.name, '- Error:', e.message, '\n');
    }
  }

  console.log('--- Conclusión ---');
  console.log('El deploy usó metadata.bytecodeHash:none (upgrade-with-solc.js).');
  console.log('Tronscan NO ofrece esa opción en su formulario.');
  console.log('');
  console.log('Opciones:');
  console.log('1. Probar OKLink: https://www.oklink.com/tron/verify-contract-preliminary');
  console.log('2. Probar verificación "Standard Input JSON" en Tronscan (si existe)');
  console.log('3. Para futuros upgrades: quitar metadata.bytecodeHash de upgrade-with-solc.js');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
