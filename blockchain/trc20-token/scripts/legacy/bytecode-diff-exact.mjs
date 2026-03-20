#!/usr/bin/env node
/**
 * Diff completo: mainnet vs compilado. Lista TODAS las diferencias.
 * Objetivo: entender exactamente qué hay que cambiar en source para coincidir.
 *
 * Uso: node scripts/bytecode-diff-exact.mjs
 */
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ADDR = 'TXaXTSUKgdAdX76MhQoqQ98msE8azBwiFS';
const MAIN = 'TRC20TokenUpgradeable';
const ROOT = path.join(__dirname, '..');
const FLAT = path.join(ROOT, 'verification', 'TXaXTSUK-verification', 'TRC20TokenUpgradeable-flattened.sol');

function fetchBytecode(addr) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ value: addr, visible: true });
    const req = https.request({
      hostname: 'api.trongrid.io', path: '/wallet/getcontractinfo', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body, 'utf8') }
    }, (res) => {
      let buf = ''; res.on('data', c => { buf += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(buf).runtimecode?.replace(/^0x/, '') || ''); } catch (e) { reject(e); }
      });
    });
    req.on('error', reject); req.write(body); req.end();
  });
}

function loadSolc(v) {
  return new Promise((resolve, reject) => {
    require('solc').loadRemoteVersion(v, (err, s) => (err ? reject(err) : resolve(s)));
  });
}

function stripMetadata(hex) {
  if (!hex || hex.length < 4) return hex;
  const len = Number.parseInt(hex.slice(-4), 16);
  if (len > 0 && len < 200 && hex.length >= (len + 2) * 2) return hex.slice(0, -(len + 2) * 2);
  const idx = hex.lastIndexOf('a264');
  if (idx > 0 && hex.length - idx >= 86) return hex.slice(0, idx);
  return hex;
}

function prepareSource(raw) {
  let s = raw.replaceAll(/^\s*\/\/\s*SPDX-License-Identifier:[^\n]*\n?/gm, '');
  if (!/SPDX-License-Identifier/i.test(s.slice(0, 300))) s = '// SPDX-License-Identifier: MIT\n' + s;
  return s;
}

function compile(solc, source, evm, runs) {
  const input = {
    language: 'Solidity', sources: { 'c.sol': { content: source } },
    settings: {
      optimizer: { enabled: true, runs: runs ?? 200 },
      metadata: { bytecodeHash: 'none' },
      outputSelection: { '*': { '*': ['evm.deployedBytecode'] } }
    }
  };
  if (evm) input.settings.evmVersion = evm;
  const out = JSON.parse(solc.compile(JSON.stringify(input)));
  const err = out.errors?.find(e => e.severity === 'error');
  if (err) throw new Error(err.formattedMessage);
  const bc = out.contracts['c.sol']?.[MAIN]?.evm?.deployedBytecode?.object;
  if (!bc) throw new Error('No bytecode');
  return bc.replace(/^0x/, '');
}

async function main() {
  console.log('=== Diff EXACTO mainnet vs compilado TXaXTSUK ===\n');

  const chain = stripMetadata(await fetchBytecode(ADDR));
  const source = prepareSource(fs.readFileSync(FLAT, 'utf8'));
  const solc = await loadSolc('v0.8.25+commit.b61c2a91');
  const compiled = stripMetadata(compile(solc, source, 'cancun', 200));

  const diffs = [];
  const maxLen = Math.max(chain.length, compiled.length);
  for (let i = 0; i < maxLen; i += 2) {
    const c = chain.slice(i, i + 2) || '??';
    const p = compiled.slice(i, i + 2) || '??';
    if (c !== p) {
      const byteIdx = i / 2;
      diffs.push({ byteIdx, hexIdx: i, mainnet: c, compiled: p });
    }
  }

  console.log('Longitud mainnet:', chain.length / 2, 'bytes');
  console.log('Longitud compilado:', compiled.length / 2, 'bytes');
  console.log('Diferencias totales:', diffs.length, 'posiciones\n');

  if (diffs.length <= 50) {
    console.log('Todas las diferencias:');
    for (const d of diffs) {
      console.log(`  byte ${d.byteIdx} (hex ${d.hexIdx}): mainnet=${d.mainnet} compilado=${d.compiled}`);
    }
  } else {
    console.log('Primeras 30 diferencias:');
    for (const d of diffs.slice(0, 30)) {
      console.log(`  byte ${d.byteIdx} (hex ${d.hexIdx}): mainnet=${d.mainnet} compilado=${d.compiled}`);
    }
    console.log('...');
    console.log('\nÚltimas 10 diferencias:');
    for (const d of diffs.slice(-10)) {
      console.log(`  byte ${d.byteIdx} (hex ${d.hexIdx}): mainnet=${d.mainnet} compilado=${d.compiled}`);
    }
  }

  const outPath = path.join(ROOT, 'verification', 'TXaXTSUK-verification', 'BYTECODE-DIFF-EXACTO.json');
  fs.writeFileSync(outPath, JSON.stringify({ totalDiffs: diffs.length, diffs }, null, 2), 'utf8');
  console.log('\nGuardado:', outPath);
}

main().catch(e => { console.error(e); process.exit(1); });
