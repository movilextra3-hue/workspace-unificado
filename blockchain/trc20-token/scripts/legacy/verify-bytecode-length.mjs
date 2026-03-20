#!/usr/bin/env node
/**
 * Prueba configs que produzcan bytecode de ~12259 bytes (mainnet).
 * Nuestro compilado actual: 12024 (235 bytes menos).
 * Probar: runs=0, viaIR, distintas EVM.
 */
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ADDR = 'TXaXTSUKgdAdX76MhQoqQ98msE8azBwiFS';
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
      res.on('end', () => { try { resolve(JSON.parse(buf).runtimecode?.replace(/^0x/, '') || ''); } catch (e) { reject(e); } });
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

function compile(solc, source, evm, runs, viaIR) {
  const input = {
    language: 'Solidity',
    sources: { 'c.sol': { content: source } },
    settings: {
      optimizer: { enabled: runs >= 0, runs: Math.max(0, runs) },
      metadata: { bytecodeHash: 'none' },
      outputSelection: { '*': { '*': ['evm.deployedBytecode'] } }
    }
  };
  if (evm) input.settings.evmVersion = evm;
  if (viaIR) input.settings.viaIR = true;
  const out = JSON.parse(solc.compile(JSON.stringify(input)));
  const err = out.errors?.find(e => e.severity === 'error');
  if (err) throw new Error(err.formattedMessage);
  const bc = out.contracts['c.sol']?.TRC20TokenUpgradeable?.evm?.deployedBytecode?.object;
  if (!bc) throw new Error('No bytecode');
  return bc.replace(/^0x/, '');
}

function score(chain, compiled) {
  let p = 0, t = 0, done = false;
  for (let i = 0; i < Math.min(chain.length, compiled.length); i += 2) {
    const eq = chain.slice(i, i + 2) === compiled.slice(i, i + 2);
    if (eq) t++;
    if (!done) { if (eq) p++; else done = true; }
  }
  return { prefixMatch: p, totalMatch: t };
}

async function main() {
  console.log('=== Bytecode length search TXaXTSUK ===\n');
  const chain = stripMetadata(await fetchBytecode(ADDR));
  const targetLen = chain.length / 2;
  console.log('Mainnet (sin metadata):', targetLen, 'bytes\n');

  const source = prepareSource(fs.readFileSync(FLAT, 'utf8'));
  const solc = await loadSolc('v0.8.25+commit.b61c2a91');

  const RUNS = [0, 1, 50, 100, 150, 199, 200, 201, 250, 300, 400, 500];
  const EVMS = [undefined, 'cancun', 'shanghai', 'paris', 'london'];
  let best = { prefixMatch: 0, totalMatch: 0, cfg: null };
  let exact = null;
  const lengthMatch = [];

  for (const runs of RUNS) {
    for (const evm of EVMS) {
      for (const viaIR of [false, true]) {
        try {
          const compiled = stripMetadata(compile(solc, source, evm, runs, viaIR));
          const len = compiled.length / 2;
          const { prefixMatch, totalMatch } = score(chain, compiled);

          if (compiled === chain) {
            exact = { runs, evm: evm || 'default', viaIR };
            break;
          }

          if (len === targetLen) {
            lengthMatch.push({ runs, evm: evm || 'default', viaIR, prefixMatch, totalMatch });
          }

          if (prefixMatch > best.prefixMatch || (prefixMatch === best.prefixMatch && totalMatch > best.totalMatch)) {
            best = { prefixMatch, totalMatch, cfg: { runs, evm: evm || 'default', viaIR }, len };
          }
        } catch { /* skip */ }
        if (exact) break;
      }
      if (exact) break;
    }
    if (exact) break;
  }

  if (exact) {
    console.log('✅ COINCIDENCIA EXACTA');
    console.log('   runs:', exact.runs, '| evm:', exact.evm, '| viaIR:', exact.viaIR);
    fs.writeFileSync(path.join(ROOT, 'verification', 'TXaXTSUK-verification', 'COINCIDENCIA-EXACTA-ENCONTRADA.txt'),
      JSON.stringify(exact, null, 2), 'utf8');
    process.exit(0);
  }

  console.log('Configs con longitud exacta (12259 bytes):', lengthMatch.length);
  lengthMatch.slice(0, 10).forEach(c => console.log('  ', c));
  console.log('\nMejor match:', best.prefixMatch, 'prefix,', best.totalMatch, 'total | len compilado:', best.len);
  if (best.cfg) console.log('   Config:', best.cfg);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
