#!/usr/bin/env node
/**
 * Verificación PROFUNDA de bytecode TXaXTSUK.
 * Matriz ampliada de configs, diagnóstico hex, comparación con build/tronbox.
 *
 * Uso: node scripts/verify-deep-tronscan.js
 *   o: npm run verify:deep
 */
'use strict';
if (process.setMaxListeners) process.setMaxListeners(100);
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');

const ADDR = 'TXaXTSUKgdAdX76MhQoqQ98msE8azBwiFS';
const MAIN_CONTRACT = 'TRC20TokenUpgradeable';
const ROOT = path.join(__dirname, '..');
const VERIFICATION_DIR = path.join(ROOT, 'verification', 'TXaXTSUK-verification');
const SOURCE_FILE = path.join(VERIFICATION_DIR, 'TRC20TokenUpgradeable-flattened.sol');

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
  const len = parseInt(hex.slice(-4), 16);
  if (len > 0 && len < 200 && hex.length >= (len + 2) * 2) return hex.slice(0, -(len + 2) * 2);
  const idx = hex.lastIndexOf('a264');
  if (idx > 0 && hex.length - idx >= 86) return hex.slice(0, idx);
  return hex;
}

function compile(solc, source, mainContract, evm, runs, viaIR) {
  const input = {
    language: 'Solidity',
    sources: { 'flat.sol': { content: source } },
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
  const bc = out.contracts['flat.sol']?.[mainContract]?.evm?.deployedBytecode?.object;
  if (!bc) throw new Error('No deployedBytecode');
  return bc.replace(/^0x/, '');
}

function scoreMatch(chainHex, compiledHex) {
  let prefixMatch = 0;
  let totalMatch = 0;
  const len = Math.min(chainHex.length, compiledHex.length);
  let prefixDone = false;
  for (let i = 0; i < len; i += 2) {
    const eq = chainHex.slice(i, i + 2) === compiledHex.slice(i, i + 2);
    if (eq) totalMatch++;
    if (!prefixDone) {
      if (eq) prefixMatch++;
      else prefixDone = true;
    }
  }
  const totalBytes = Math.max(chainHex.length, compiledHex.length) / 2;
  return { prefixMatch, totalMatch, pct: totalBytes ? (100 * totalMatch / totalBytes).toFixed(2) : 0 };
}

function hexDump(hex, offset, count = 32) {
  const start = Math.max(0, offset * 2 - count);
  const end = Math.min(hex.length, start + count * 2);
  const slice = hex.slice(start, end);
  let out = '';
  for (let i = 0; i < slice.length; i += 2) {
    out += slice.slice(i, i + 2) + ' ';
  }
  return out.trim();
}

// Matriz ampliada: metadata CBOR 0.8.25; tronbox 0.8.20; TYqRvxio (Impl ant.) dio exact match con 0.8.34
const SOLC_VERSIONS = [
  'v0.8.25+commit.b61c2a91',
  'v0.8.20+commit.a1b79de6',
  'v0.8.24+commit.e11b9ed9',
  'v0.8.34+commit.80d5c536'
];
const EVM_VERSIONS = ['istanbul', 'berlin', 'london', 'paris', 'shanghai', 'cancun', undefined];
const RUNS_LIST = [0, 50, 100, 200, 500];

function buildConfigs() {
  const configs = [];
  for (const solc of SOLC_VERSIONS) {
    for (const evm of EVM_VERSIONS) {
      for (const runs of RUNS_LIST) {
        configs.push({ solc, evm, runs, viaIR: false });
        if (solc.includes('0.8.25') && ['shanghai', 'cancun'].includes(evm) && runs === 200) {
          configs.push({ solc, evm, runs, viaIR: true });
        }
      }
    }
  }
  return configs;
}

const CONFIGS = buildConfigs();
const solcCache = new Map();

async function main() {
  console.log('=== Verificación PROFUNDA TXaXTSUK ===\n');

  if (!fs.existsSync(SOURCE_FILE)) {
    console.error('❌ No existe:', SOURCE_FILE);
    console.error('   Ejecuta: npm run generate:verification');
    process.exit(1);
  }

  let source = fs.readFileSync(SOURCE_FILE, 'utf8');
  source = source.replace(/^\s*\/\/\s*SPDX-License-Identifier:[^\n]*\n?/gm, '');
  if (!/SPDX-License-Identifier/i.test(source.slice(0, 300))) {
    source = '// SPDX-License-Identifier: MIT\n' + source;
  }

  console.log('1. Obteniendo bytecode mainnet...');
  const chainBytecode = await fetchBytecode(ADDR);
  const chainClean = stripMetadata(chainBytecode);
  console.log('   Bytecode (sin metadata):', chainClean.length / 2, 'bytes');

  const buildPath = path.join(ROOT, 'build', 'contracts', 'TRC20TokenUpgradeable.json');
  if (fs.existsSync(buildPath)) {
    const build = JSON.parse(fs.readFileSync(buildPath, 'utf8'));
    const buildHex = (build.deployedBytecode?.object || '').replace(/^0x/, '');
    const buildClean = stripMetadata(buildHex);
    const s = scoreMatch(chainClean, buildClean);
    console.log('2. Build/tronbox bytecode: prefix', s.prefixMatch, 'total', s.totalMatch, s.pct + '%');
  }

  console.log('3. Probando', CONFIGS.length, 'configuraciones...\n');

  let exactMatch = null;
  const results = [];

  for (const cfg of CONFIGS) {
    try {
      if (!solcCache.has(cfg.solc)) solcCache.set(cfg.solc, loadSolc(cfg.solc));
      const solc = await solcCache.get(cfg.solc);
      const compiled = compile(solc, source, MAIN_CONTRACT, cfg.evm, cfg.runs, cfg.viaIR);
      const compiledClean = stripMetadata(compiled);
      if (compiledClean === chainClean) {
        exactMatch = {
          ...cfg,
          compiler: cfg.solc.replace('v', '').split('+')[0],
          evmStr: cfg.evm || 'default'
        };
        break;
      }
      const s = scoreMatch(chainClean, compiledClean);
      results.push({
        cfg,
        compiledClean,
        ...s,
        evmStr: cfg.evm || 'default',
        compiler: cfg.solc.replace('v', '').split('+')[0]
      });
    } catch {
      // ignorar errores de compilación
    }
  }

  if (exactMatch) {
    console.log('✅ COINCIDENCIA EXACTA DE BYTECODE');
    console.log('   Solc:', exactMatch.compiler, '| EVM:', exactMatch.evmStr, '| runs:', exactMatch.runs, '| viaIR:', exactMatch.cfg.viaIR);
    const paramsPath = path.join(VERIFICATION_DIR, 'PARAMETROS-TRONSCAN-EXACTO.txt');
    fs.writeFileSync(paramsPath, `COINCIDENCIA EXACTA\nAddress: ${ADDR}\nContract: ${MAIN_CONTRACT}\nCompiler: ${exactMatch.compiler}\nEVM: ${exactMatch.evmStr}\nRuns: ${exactMatch.runs}\nviaIR: ${exactMatch.cfg.viaIR}\n`);
    console.log('   Parámetros guardados:', paramsPath);
    return;
  }

  results.sort((a, b) => {
    if (b.prefixMatch !== a.prefixMatch) return b.prefixMatch - a.prefixMatch;
    return b.totalMatch - a.totalMatch;
  });

  const best = results[0];
  if (!best) {
    console.error('❌ Ninguna config compiló correctamente.');
    process.exit(1);
  }

  console.log('⚠️ Sin coincidencia exacta.\n');
  console.log('--- Top 5 configs ---');
  for (let i = 0; i < Math.min(5, results.length); i++) {
    const r = results[i];
    console.log(`   ${i + 1}. ${r.compiler} | ${r.evmStr} | runs=${r.cfg.runs} | viaIR=${!!r.cfg.viaIR} → prefix ${r.prefixMatch}, total ${r.totalMatch} (${r.pct}%)`);
  }

  const diffIdx = best.prefixMatch;
  console.log('\n--- Diagnóstico: primer byte distinto (índice', diffIdx, ') ---');
  console.log('   Mainnet:', hexDump(chainClean, diffIdx));
  console.log('   Compilado:', hexDump(best.compiledClean, diffIdx));

  const evmLabel = best.cfg.evm === 'shanghai' ? 'Shanghai (20)' : best.cfg.evm === 'paris' ? 'Paris (14)' : best.cfg.evm === 'cancun' ? 'Cancun (21)' : (best.cfg.evm || 'default');
  const paramsPath = path.join(VERIFICATION_DIR, 'PARAMETROS-TRONSCAN.txt');
  const paramsText = `Verificación profunda - mejor config (sin coincidencia exacta)

Address: ${ADDR}
Contract: ${MAIN_CONTRACT}
Compiler: ${best.compiler}
EVM: ${evmLabel}
Runs: ${best.cfg.runs}
viaIR: ${best.cfg.viaIR}

Similitud: ${best.prefixMatch} bytes desde inicio, ${best.totalMatch} total (${best.pct}%)
Primer byte distinto: índice ${diffIdx}

Metadata bytecode: solc 0.8.25 (CBOR)
`;
  fs.writeFileSync(paramsPath, paramsText);
  console.log('\n   Parámetros:', paramsPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
