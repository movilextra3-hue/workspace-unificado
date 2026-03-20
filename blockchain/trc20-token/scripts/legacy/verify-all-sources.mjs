#!/usr/bin/env node
/**
 * Prueba TODAS las fuentes .sol en verification contra bytecode mainnet TXaXTSUK.
 * Incluye: flattened, tronbox-flatten, decompiled, from-commit, 0.8.25, 0.8.30, etc.
 *
 * Uso: node scripts/verify-all-sources.mjs
 */
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ADDR = 'TXaXTSUKgdAdX76MhQoqQ98msE8azBwiFS';
const MAIN_CONTRACT = 'TRC20TokenUpgradeable';
const ROOT = path.join(__dirname, '..');
const VER_DIR = path.join(ROOT, 'verification');
const TXA_DIR = path.join(VER_DIR, 'TXaXTSUK-verification');
const FORGE_VERIFY_DIR = path.join(ROOT, '.forge-verify', 'src');

function fetchBytecode(addr) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ value: addr, visible: true });
    const req = https.request({
      hostname: 'api.trongrid.io',
      path: '/wallet/getcontractinfo',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body, 'utf8') }
    }, (res) => {
      let buf = '';
      res.on('data', c => { buf += c; });
      res.on('end', () => {
        try {
          const j = JSON.parse(buf);
          resolve((j.runtimecode || '').replace(/^0x/, ''));
        } catch (e) { reject(e); }
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
  const len = Number.parseInt(hex.slice(-4), 16);
  if (len > 0 && len < 200 && hex.length >= (len + 2) * 2) return hex.slice(0, -(len + 2) * 2);
  const idx = hex.lastIndexOf('a264');
  if (idx > 0 && hex.length - idx >= 86) return hex.slice(0, idx);
  return hex;
}

function compileSource(solc, source, contractName, evm, runs, viaIR) {
  const input = {
    language: 'Solidity',
    sources: { 'contract.sol': { content: source } },
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
  for (const file of Object.keys(out.contracts || {})) {
    const contracts = out.contracts[file] || {};
    for (const name of Object.keys(contracts)) {
      if (contractName && name !== contractName) continue;
      const bc = contracts[name]?.evm?.deployedBytecode?.object;
      if (bc) return bc.replace(/^0x/, '');
    }
  }
  throw new Error('No deployedBytecode');
}

function scoreMatch(chainHex, compiledHex) {
  let prefixMatch = 0, totalMatch = 0;
  const len = Math.min(chainHex.length, compiledHex.length);
  let prefixDone = false;
  for (let i = 0; i < len; i += 2) {
    const eq = chainHex.slice(i, i + 2) === compiledHex.slice(i, i + 2);
    if (eq) totalMatch++;
    if (!prefixDone) { if (eq) prefixMatch++; else prefixDone = true; }
  }
  return { prefixMatch, totalMatch };
}

const SOLC_V = ['v0.8.25+commit.b61c2a91', 'v0.8.20+commit.a1b79de6', 'v0.8.24+commit.e11b9ed9', 'v0.8.34+commit.80d5c536'];
const EVMS = [undefined, 'cancun', 'shanghai', 'paris'];
const RUNS = [199, 200, 201, 150, 250, 100, 0];

async function main() {
  console.log('=== Verificación TODAS las fuentes TXaXTSUK ===\n');

  const chainBytecode = await fetchBytecode(ADDR);
  const chainClean = stripMetadata(chainBytecode);
  console.log('Bytecode mainnet:', chainClean.length / 2, 'bytes\n');

  const sourcesToTry = [];
  const dirs = [TXA_DIR, VER_DIR, FORGE_VERIFY_DIR].filter(d => fs.existsSync(d));
  for (const dir of dirs) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const f of files) {
      if (!f.isFile() || !f.name.endsWith('.sol')) continue;
      const fp = path.join(dir, f.name);
      try {
        let content = fs.readFileSync(fp, 'utf8');
        if (content.length < 500) continue;
        if (!content.includes('contract') && !content.includes('interface')) continue;
        const main = content.match(/contract\s+(\w+)/)?.[1] || MAIN_CONTRACT;
        if (main !== MAIN_CONTRACT && !content.includes('contract TRC20TokenUpgradeable')) continue;
        sourcesToTry.push({ path: fp, content, name: f.name, main });
      } catch {
        // skip
      }
    }
  }

  console.log('Fuentes a probar:', sourcesToTry.length, '\n');

  const solcCache = new Map();
  let best = { prefixMatch: 0, totalMatch: 0, cfg: null };
  let exactMatch = null;
  let checked = 0;

  const pragmaFromSolc = (v) => v.replace('v', '').split('+')[0];

  for (const src of sourcesToTry) {
    for (const solcVer of SOLC_V) {
      if (exactMatch) break;
      try {
        if (!solcCache.has(solcVer)) solcCache.set(solcVer, await loadSolc(solcVer));
        const solc = solcCache.get(solcVer);
        const pragmaVer = pragmaFromSolc(solcVer);
        const contentAdapted = src.content.replaceAll(/pragma\s+solidity\s+\^?0\.8\.\d+;/g, `pragma solidity ${pragmaVer};`);

        for (const evm of EVMS) {
          for (const runs of RUNS) {
            for (const viaIR of [false, true]) {
              try {
                const compiled = compileSource(solc, contentAdapted, src.main, evm || undefined, runs, viaIR);
                const compiledClean = stripMetadata(compiled);
                checked++;
                if (checked % 100 === 0) process.stdout.write(`\r  ${checked} (mejor: ${best.prefixMatch} prefix)   `);

                if (compiledClean === chainClean) {
                  exactMatch = { source: src.name, main: src.main, solcVer, evm: evm || 'default', runs, viaIR };
                  break;
                }

                const { prefixMatch, totalMatch } = scoreMatch(chainClean, compiledClean);
                if (prefixMatch > best.prefixMatch || (prefixMatch === best.prefixMatch && totalMatch > best.totalMatch)) {
                  best = { prefixMatch, totalMatch, cfg: { source: src.name, solcVer, evm: evm || 'default', runs, viaIR } };
                }
              } catch {
                // skip
              }
            }
            if (exactMatch) break;
          }
          if (exactMatch) break;
        }
      } catch (e) {
        process.stdout.write(`  ${src.name}: ${e.message?.slice(0, 40)}... `);
      }
    }
    if (exactMatch) break;
  }

  if (exactMatch) {
    console.log('\n\n✅ COINCIDENCIA EXACTA\n');
    console.log('   Fuente:', exactMatch.source);
    console.log('   Contrato:', exactMatch.main);
    console.log('   Solc:', exactMatch.solcVer.replace('v', '').split('+')[0]);
    console.log('   EVM:', exactMatch.evm);
    console.log('   Runs:', exactMatch.runs);
    console.log('   viaIR:', exactMatch.viaIR);
    fs.writeFileSync(path.join(TXA_DIR, 'COINCIDENCIA-EXACTA-ENCONTRADA.txt'), JSON.stringify(exactMatch, null, 2), 'utf8');
    process.exit(0);
  }

  console.log('\n\n⚠️ Sin coincidencia exacta.');
  console.log('Comprobaciones:', checked);
  console.log('Mejor:', best.prefixMatch, 'prefix,', best.totalMatch, 'total');
  if (best.cfg) console.log('   Config:', best.cfg);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
