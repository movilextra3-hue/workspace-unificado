#!/usr/bin/env node
/**
 * AUTOMATIZACIÓN EXHAUSTIVA: busca coincidencia EXACTA de bytecode TXaXTSUK.
 * Prueba ambas variantes Initializable (OZ y custom), todas las configs posibles.
 * Reglas: no delegar, no omitir, no excluir, no suponer.
 *
 * Uso: node scripts/verify-auto-exact.mjs
 *   o: npm run verify:auto
 */
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (process.setMaxListeners) process.setMaxListeners(100);

const ADDR = 'TXaXTSUKgdAdX76MhQoqQ98msE8azBwiFS';
const MAIN_CONTRACT = 'TRC20TokenUpgradeable';
const ROOT = path.join(__dirname, '..');
const VERIFICATION_DIR = path.join(ROOT, 'verification', 'TXaXTSUK-verification');

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

function buildFlattened(useOZ, pragmaVersion = '0.8.25') {
  const ver = pragmaVersion;
  const srcPath = path.join(ROOT, 'contracts', 'TRC20TokenUpgradeable.sol');
  const initOZPath = path.join(VERIFICATION_DIR, 'Initializable-OZ.sol');
  const initCustomPath = path.join(ROOT, 'contracts', 'Initializable.sol');
  const initPath = useOZ && fs.existsSync(initOZPath) ? initOZPath : initCustomPath;
  if (!fs.existsSync(srcPath) || !fs.existsSync(initPath)) return null;
  let src = fs.readFileSync(srcPath, 'utf8');
  let init = fs.readFileSync(initPath, 'utf8');
  src = src.replace(/pragma\s+solidity\s+\^?0\.8\.\d+;/, `pragma solidity ${ver};`);
  init = init.replace(/pragma\s+solidity\s+\^?0\.8\.\d+;/, `pragma solidity ${ver};`);
  init = init.replace(/\babstract\s+contract\s+Initializable\b/, 'contract Initializable');
  const implNoImport = src.replace(/import\s*\{\s*Initializable\s*\}\s*from\s*["']\.\/Initializable\.sol["'];\s*\n?/i, '');
  return `// SPDX-License-Identifier: MIT\npragma solidity ${ver};\n\n${init}\n\n${implNoImport}`;
}

function prepareSource(raw) {
  let s = raw.replaceAll(/^\s*\/\/\s*SPDX-License-Identifier:[^\n]*\n?/gm, '');
  if (!/SPDX-License-Identifier/i.test(s.slice(0, 300))) s = '// SPDX-License-Identifier: MIT\n' + s;
  return s;
}

// Solc versions: metadata 0.8.25; TYqRvxio (Impl ant.) exact match con 0.8.34; no omitir
const SOLC_VERSIONS = [
  'v0.8.25+commit.b61c2a91',
  'v0.8.24+commit.e11b9ed9',
  'v0.8.26+commit.8a97fa7d',
  'v0.8.34+commit.80d5c536',
  'v0.8.23+commit.f59f3c3b',
  'v0.8.20+commit.a1b79de6',
  'v0.8.22+commit.4fc1097e',
  'v0.8.21+commit.d9974bed',
  'v0.8.27+commit.11e6c98b',
  'v0.8.19+commit.7dd6d404'
];
const EVM_VERSIONS = [undefined, 'shanghai', 'cancun', 'paris', 'london', 'berlin', 'istanbul', 'petersburg', 'byzantium'];
const RUNS_LIST = [0, 1, 10, 50, 100, 150, 200, 250, 300, 400, 500, 600, 800, 1000];

function buildConfigs() {
  const configs = [];
  for (const solc of SOLC_VERSIONS) {
    for (const evm of EVM_VERSIONS) {
      for (const runs of RUNS_LIST) {
        configs.push({ solc, evm, runs, viaIR: false }, { solc, evm, runs, viaIR: true });
      }
    }
  }
  return configs;
}

// Prioridad: metadata 0.8.25; TYqRvxio exact match 0.8.34; no excluir
const PRIO_SOLC = ['v0.8.25+commit.b61c2a91', 'v0.8.34+commit.80d5c536', 'v0.8.24+commit.e11b9ed9', 'v0.8.26+commit.8a97fa7d'];
const PRIO_EVM = [undefined, 'shanghai', 'cancun', 'paris'];
const PRIO_RUNS = [200, 150, 250, 100, 300];
const PRIO_CONFIGS = [];
for (const solc of PRIO_SOLC) {
  for (const evm of PRIO_EVM) {
    for (const runs of PRIO_RUNS) {
      for (const viaIR of [false, true]) {
        PRIO_CONFIGS.push({ solc, evm, runs, viaIR });
      }
    }
  }
}
const FULL_CONFIGS = buildConfigs();
const PRIO_SET = new Set(PRIO_CONFIGS.map(c => `${c.solc}:${c.evm}:${c.runs}:${c.viaIR}`));
const CONFIGS = [...PRIO_CONFIGS, ...FULL_CONFIGS.filter(c => !PRIO_SET.has(`${c.solc}:${c.evm}:${c.runs}:${c.viaIR}`))];

const solcCache = new Map();

function getVariantNames(hasOZ, hasCustom) {
  if (hasOZ && hasCustom) return ['OZ', 'custom'];
  if (hasOZ) return ['OZ'];
  return ['custom'];
}

function getEvmLabel(evm) {
  if (evm === 'shanghai') return 'Shanghai (20)';
  if (evm === 'cancun') return 'Cancun (21)';
  return evm || 'default';
}

function isBetterScore(s, best) {
  return s.prefixMatch > best.prefixMatch ||
    (s.prefixMatch === best.prefixMatch && s.totalMatch > best.totalMatch);
}

function createMatchResult(vName, cfg) {
  return {
    variant: vName,
    cfg,
    compiler: cfg.solc.replace('v', '').split('+')[0],
    evmStr: cfg.evm || 'default'
  };
}

async function tryOneConfig(cfg, vName, chainClean, best, solcCache) {
  const flattened = buildFlattened(vName === 'OZ', cfg.solc.replace('v', '').split('+')[0]);
  if (!flattened) return null;
  const source = prepareSource(flattened);
  if (!solcCache.has(cfg.solc)) solcCache.set(cfg.solc, loadSolc(cfg.solc));
  const solc = await solcCache.get(cfg.solc);
  const compiled = compile(solc, source, MAIN_CONTRACT, cfg.evm, cfg.runs, cfg.viaIR);
  const compiledClean = stripMetadata(compiled);

  if (compiledClean === chainClean) {
    return { exactMatch: { ...createMatchResult(vName, cfg), compiledClean }, best, isExact: true };
  }
  const s = scoreMatch(chainClean, compiledClean);
  const newBest = isBetterScore(s, best)
    ? { prefixMatch: s.prefixMatch, totalMatch: s.totalMatch, pct: s.pct, ...createMatchResult(vName, cfg), compiledClean }
    : best;
  return { exactMatch: null, best: newBest, isExact: false };
}

async function runSearch(chainClean, variantNames) {
  let best = { prefixMatch: 0, totalMatch: 0, pct: '0', cfg: null, variant: null, compiledClean: null };
  let checked = 0;
  let exactMatch = null;

  for (const cfg of CONFIGS) {
    for (const vName of variantNames) {
      try {
        const result = await tryOneConfig(cfg, vName, chainClean, best, solcCache);
        if (!result) continue;
        checked++;
        best = result.best;
        if (result.isExact) {
          exactMatch = result.exactMatch;
          return { exactMatch, best, checked };
        }
      } catch {
        // ignorar errores de compilación
      }
    }
  }
  return { exactMatch, best, checked };
}

function printExactMatch(exactMatch, checked) {
  console.log('✅ COINCIDENCIA EXACTA ENCONTRADA\n');
  console.log('   Variante:', exactMatch.variant);
  console.log('   Solc:', exactMatch.compiler);
  console.log('   EVM:', exactMatch.evmStr);
  console.log('   Runs:', exactMatch.cfg.runs);
  console.log('   viaIR:', exactMatch.cfg.viaIR);
  console.log('   Comprobaciones realizadas:', checked);

  const outPath = path.join(VERIFICATION_DIR, 'COINCIDENCIA-EXACTA-ENCONTRADA.txt');
  fs.writeFileSync(outPath, `COINCIDENCIA EXACTA TXaXTSUK
==============================

Address: ${ADDR}
Contract: ${MAIN_CONTRACT}
Variante Initializable: ${exactMatch.variant}

Compiler: ${exactMatch.compiler}
EVM: ${exactMatch.evmStr}
Optimization: Yes
Runs: ${exactMatch.cfg.runs}
viaIR: ${exactMatch.cfg.viaIR}

Comprobaciones: ${checked}
Fecha: ${new Date().toISOString()}

Usar estos parámetros en Tronscan para verificación.
`, 'utf8');
  console.log('\n   Guardado:', outPath);

  if (exactMatch.variant === 'OZ') {
    console.log('\n   El flattened actual (generate:verification) ya usa OZ. Verificación lista.');
  } else {
    console.log('\n   NOTA: La coincidencia usa Initializable-custom. Actualiza generate-verification-source.js para usar contracts/Initializable.sol.');
  }
}

async function main() {
  console.log('=== AUTOMATIZACIÓN EXHAUSTIVA — Coincidencia EXACTA TXaXTSUK ===\n');
  console.log('Reglas: no delegar, no omitir, no excluir, no suponer.\n');

  const hasOZ = fs.existsSync(path.join(VERIFICATION_DIR, 'Initializable-OZ.sol'));
  const hasCustom = fs.existsSync(path.join(ROOT, 'contracts', 'Initializable.sol'));
  if (!hasOZ && !hasCustom) {
    console.error('❌ No Initializable. Ejecuta npm run generate:verification');
    process.exit(1);
  }

  const variantNames = getVariantNames(hasOZ, hasCustom);

  console.log('1. Obteniendo bytecode mainnet...');
  const chainBytecode = await fetchBytecode(ADDR);
  const chainClean = stripMetadata(chainBytecode);
  console.log('   Bytecode (sin metadata):', chainClean.length / 2, 'bytes');
  console.log('2. Variantes:', variantNames.join(', '));
  console.log('3. Configuraciones:', CONFIGS.length, 'x', variantNames.length);
  console.log('4. Iniciando búsqueda...\n');

  const { exactMatch, best, checked } = await runSearch(chainClean, variantNames);

  if (exactMatch) {
    printExactMatch(exactMatch, checked);
    return;
  }

  console.log('⚠️ No se encontró coincidencia exacta después de', checked, 'comprobaciones.\n');
  console.log('--- Mejor resultado ---');
  console.log('   Variante:', best.variant);
  console.log('   Solc:', best.compiler, '| EVM:', best.evmStr, '| runs:', best.cfg?.runs, '| viaIR:', !!best.cfg?.viaIR);
  console.log('   Prefix:', best.prefixMatch, '| Total:', best.totalMatch, '|', best.pct + '%');

  const paramsPath = path.join(VERIFICATION_DIR, 'PARAMETROS-TRONSCAN.txt');
  const evmLabel = getEvmLabel(best.cfg?.evm);
  fs.writeFileSync(paramsPath, `Búsqueda exhaustiva - mejor config (sin coincidencia exacta)
Comprobaciones: ${checked}

Address: ${ADDR}
Contract: ${MAIN_CONTRACT}
Variante: ${best.variant}
Compiler: ${best.compiler}
EVM: ${evmLabel}
Runs: ${best.cfg?.runs ?? 200}
viaIR: ${!!best.cfg?.viaIR}

Similitud: ${best.prefixMatch} bytes desde inicio, ${best.totalMatch} total (${best.pct}%)
`, 'utf8');
  console.log('\n   Parámetros:', paramsPath);
  process.exit(1);
}

try {
  await main();
} catch (e) {
  console.error(e);
  process.exit(1);
}
