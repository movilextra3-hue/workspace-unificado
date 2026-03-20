#!/usr/bin/env node
/**
 * Barrido exhaustivo: busca config que produzca bytecode de EXACTAMENTE 12259 bytes (mainnet).
 * runs=0+viaIR da 12267. Probamos variaciones para acercarnos.
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
const TARGET = 12259;
const FLAT_OZ = path.join(ROOT, 'verification', 'TXaXTSUK-verification', 'TRC20TokenUpgradeable-hardhat-flatten-OZ.sol');

function fetchBytecode(addr) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ value: addr, visible: true });
    const req = https.request({
      hostname: 'api.trongrid.io', path: '/wallet/getcontractinfo', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body, 'utf8') }
    }, (res) => {
      let buf = ''; res.on('data', c => { buf += c; });
      res.on('end', () => { try { resolve(JSON.parse(buf).runtimecode?.replace(/^0x/, '') || ''); } catch (e) { reject(e); } });
    });
    req.on('error', reject); req.write(body); req.end();
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

function compile(solc, source, evm, runs, viaIR) {
  const input = {
    language: 'Solidity',
    sources: { 'c.sol': { content: source } },
    settings: {
      optimizer: { enabled: runs >= 0, runs: Math.max(0, runs || 0) },
      metadata: { bytecodeHash: 'none' },
      outputSelection: { '*': { '*': ['evm.deployedBytecode'] } }
    }
  };
  if (evm) input.settings.evmVersion = evm;
  if (viaIR) input.settings.viaIR = true;
  const out = JSON.parse(solc.compile(JSON.stringify(input)));
  const err = out.errors?.find(e => e.severity === 'error');
  if (err) throw new Error(err.formattedMessage);
  const bc = out.contracts['c.sol']?.[MAIN]?.evm?.deployedBytecode?.object;
  if (!bc) throw new Error('No bytecode');
  return bc.replace(/^0x/, '');
}

function loadSolc(v) {
  return new Promise((resolve, reject) => {
    require('solc').loadRemoteVersion(v, (err, s) => (err ? reject(err) : resolve(s)));
  });
}

const SOLC_V = ['v0.8.25+commit.b61c2a91', 'v0.8.24+commit.e11b9ed9', 'v0.8.20+commit.a1b79de6'];
const EVMS = [undefined, 'cancun', 'shanghai', 'paris'];
const RUNS = [0, 1, 2, 50, 99, 100, 150, 185, 190, 195, 198, 199, 200, 201, 202, 205, 210, 215, 220, 250, 300];

async function main() {
  console.log('=== Barrido longitud exacta 12259 bytes ===\n');

  const chain = stripMetadata(await fetchBytecode(ADDR));
  const flatPath = fs.existsSync(FLAT_OZ) ? FLAT_OZ : path.join(ROOT, 'verification', 'TXaXTSUK-verification', 'TRC20TokenUpgradeable-flattened.sol');
  const source = prepareSource(fs.readFileSync(flatPath, 'utf8'));

  const solcCache = new Map();
  let bestLen = { diff: Infinity, cfg: null };
  let exactMatch = null;
  let count = 0;
  const total = SOLC_V.length * EVMS.length * RUNS.length * 2;

  for (const solcVer of SOLC_V) {
    try {
      if (!solcCache.has(solcVer)) solcCache.set(solcVer, await loadSolc(solcVer));
      const solc = solcCache.get(solcVer);

      for (const evm of EVMS) {
        for (const runs of RUNS) {
          for (const viaIR of [false, true]) {
            try {
              count++;
              if (count % 20 === 0) process.stdout.write(`  ${count}/${total} (mejor diff: ${bestLen.diff})\r`);
              const compiled = stripMetadata(compile(solc, source, evm || undefined, runs, viaIR));
              const len = compiled.length / 2;
              const diff = Math.abs(len - TARGET);

              if (len === TARGET && compiled === chain) {
                exactMatch = { solcVer, evm: evm || 'default', runs, viaIR };
                break;
              }
              if (len === TARGET) {
                console.log('  ¡Misma longitud!', solcVer.replace('v','').split('+')[0], evm || 'def', runs, viaIR);
              }
              if (diff < bestLen.diff) {
                bestLen = { diff, len, cfg: { solcVer, evm: evm || 'default', runs, viaIR } };
              }
            } catch { /* skip */ }
          }
        }
      }
    } catch (e) {
      console.warn(solcVer, e.message?.slice(0, 50));
    }
  }

  if (exactMatch) {
    console.log('\n✅ COINCIDENCIA EXACTA');
    console.log(exactMatch);
    process.exit(0);
  }

  console.log('\nMejor longitud:', bestLen.len, 'bytes, diff', bestLen.diff);
  console.log('Config:', bestLen.cfg);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
