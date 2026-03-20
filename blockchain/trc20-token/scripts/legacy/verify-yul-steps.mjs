#!/usr/bin/env node
/**
 * Prueba diferentes optimizerSteps (Yul) para TXaXTSUK.
 * Ref: Solidity optimizer - distintas secuencias pueden producir bytecode distinto.
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
const FLAT_OZ = path.join(ROOT, 'verification', 'TXaXTSUK-verification', 'TRC20TokenUpgradeable-hardhat-flatten-OZ.sol');
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

function compile(solc, source, evm, runs, optimizerSteps) {
  const optimizer = { enabled: runs >= 0, runs: Math.max(0, runs) };
  if (optimizerSteps != null && optimizerSteps !== '') {
    optimizer.details = { yul: true, yulDetails: { optimizerSteps } };
  }
  const settings = {
    optimizer,
    metadata: { bytecodeHash: 'none' },
    outputSelection: { '*': { '*': ['evm.deployedBytecode'] } }
  };
  if (evm) settings.evmVersion = evm;
  const input = { language: 'Solidity', sources: { 'c.sol': { content: source } }, settings };
  const out = JSON.parse(solc.compile(JSON.stringify(input)));
  const err = out.errors?.find(e => e.severity === 'error');
  if (err) throw new Error(err.formattedMessage);
  const bc = out.contracts['c.sol']?.[MAIN]?.evm?.deployedBytecode?.object;
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

const STEPS = ['default', '', 'u', 'n', 'dhfoDgvulfnTUtnIf', 'ul', 'x', 'f'];
const RUNS = [0, 199, 200, 201];
const EVMS = [undefined, 'paris', 'cancun', 'shanghai'];

function prepareSource(raw) {
  let s = raw.replaceAll(/^\s*\/\/\s*SPDX-License-Identifier:[^\n]*\n?/gm, '');
  if (!/SPDX-License-Identifier/i.test(s.slice(0, 500))) s = '// SPDX-License-Identifier: MIT\n' + s;
  return s;
}

async function main() {
  console.log('=== verify-yul-steps TXaXTSUK ===\n');
  const chain = stripMetadata(await fetchBytecode(ADDR));
  const flatPath = fs.existsSync(FLAT_OZ) ? FLAT_OZ : FLAT;
  const source = prepareSource(fs.readFileSync(flatPath, 'utf8'));
  const solc = await loadSolc('v0.8.25+commit.b61c2a91');
  let best = { prefixMatch: 0, totalMatch: 0, cfg: null };
  let exact = null;
  let n = 0;

  for (const steps of STEPS) {
    for (const evm of EVMS) {
      for (const runs of RUNS) {
        try {
          const compiled = stripMetadata(compile(solc, source, evm, runs, steps));
          n++;
          if (n <= 2) process.stdout.write(`  ok steps=${steps} evm=${evm || 'def'} runs=${runs} `);
          if (compiled === chain) {
            exact = { steps, evm: evm || 'default', runs };
            break;
          }
          const { prefixMatch, totalMatch } = score(chain, compiled);
          if (prefixMatch > best.prefixMatch || (prefixMatch === best.prefixMatch && totalMatch > best.totalMatch)) {
            best = { prefixMatch, totalMatch, cfg: { steps, evm: evm || 'default', runs } };
          }
        } catch (e) {
          if (n === 0) console.log('  Error:', e.message?.slice(0, 80));
        }
        if (exact) break;
      }
      if (exact) break;
    }
    if (exact) break;
  }

  if (exact) {
    console.log('\n✅ COINCIDENCIA EXACTA');
    console.log('   optimizerSteps:', exact.steps);
    console.log('   EVM:', exact.evm);
    console.log('   runs:', exact.runs);
    fs.writeFileSync(path.join(ROOT, 'verification', 'TXaXTSUK-verification', 'COINCIDENCIA-EXACTA-ENCONTRADA.txt'),
      JSON.stringify(exact, null, 2), 'utf8');
    process.exit(0);
  }
  console.log('\n⚠️ Sin coincidencia. Comprobaciones:', n);
  console.log('Mejor:', best.prefixMatch, 'prefix,', best.totalMatch, 'total |', best.cfg);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
