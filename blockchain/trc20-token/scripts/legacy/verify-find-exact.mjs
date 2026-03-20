#!/usr/bin/env node
/**
 * Búsqueda exhaustiva ampliada para coincidencia EXACTA TXaXTSUK.
 * Prueba: multi-file, flattened, OZ/custom, solc 0.8.19-0.8.34, runs 199/200/201.
 * Reglas: no omitir, no excluir, agotar posibilidades.
 *
 * Uso: node scripts/verify-find-exact.mjs
 */
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (process.setMaxListeners) process.setMaxListeners(150);

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

function compileMultiFile(solc, initContent, implContent, mainContract, evm, runs, viaIR) {
  const input = {
    language: 'Solidity',
    sources: {
      'Initializable.sol': { content: initContent },
      'TRC20TokenUpgradeable.sol': { content: implContent }
    },
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
  const bc = out.contracts['TRC20TokenUpgradeable.sol']?.[mainContract]?.evm?.deployedBytecode?.object;
  if (!bc) throw new Error('No deployedBytecode');
  return bc.replace(/^0x/, '');
}

function compileFlattened(solc, source, mainContract, evm, runs, viaIR) {
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

function prepareSource(raw) {
  let s = raw.replaceAll(/^\s*\/\/\s*SPDX-License-Identifier:[^\n]*\n?/gm, '');
  if (!/SPDX-License-Identifier/i.test(s.slice(0, 300))) s = '// SPDX-License-Identifier: MIT\n' + s;
  return s;
}

// Matriz ampliada: solc 0.8.19-0.8.34 + 0.8.28-0.8.33; runs 199,200,201
const SOLC_LIST = [
  'v0.8.25+commit.b61c2a91',
  'v0.8.24+commit.e11b9ed9',
  'v0.8.26+commit.8a97fa7d',
  'v0.8.34+commit.80d5c536',
  'v0.8.23+commit.f59f3c3b',
  'v0.8.20+commit.a1b79de6',
  'v0.8.22+commit.4fc1097e',
  'v0.8.21+commit.d9974bed',
  'v0.8.27+commit.11e6c98b',
  'v0.8.19+commit.7dd6d404',
  'v0.8.28+commit.fc8a0a3b',
  'v0.8.29+commit.4aa0a6e5',
  'v0.8.30+commit.3f4ccfb0',
  'v0.8.31+commit.d8b777f6',
  'v0.8.32+commit.8df9f7a4',
  'v0.8.33+commit.7e8e2d6a'
];
const EVM_LIST = [undefined, 'cancun', 'shanghai', 'paris', 'london'];
const RUNS_LIST = [199, 200, 201, 150, 250, 100, 300];

const solcCache = new Map();

async function getSolc(v) {
  if (!solcCache.has(v)) solcCache.set(v, loadSolc(v));
  return solcCache.get(v);
}

function buildMultiFileSources(useOZ, pragmaVer) {
  const initPath = useOZ && fs.existsSync(path.join(VERIFICATION_DIR, 'Initializable-OZ.sol'))
    ? path.join(VERIFICATION_DIR, 'Initializable-OZ.sol')
    : path.join(ROOT, 'contracts', 'Initializable.sol');
  const implPath = path.join(ROOT, 'contracts', 'TRC20TokenUpgradeable.sol');
  if (!fs.existsSync(initPath) || !fs.existsSync(implPath)) return null;
  let init = fs.readFileSync(initPath, 'utf8');
  let impl = fs.readFileSync(implPath, 'utf8');
  init = init.replace(/pragma\s+solidity\s+\^?0\.8\.\d+;/, `pragma solidity ${pragmaVer};`);
  impl = impl.replace(/pragma\s+solidity\s+\^?0\.8\.\d+;/, `pragma solidity ${pragmaVer};`);
  init = init.replace(/\babstract\s+contract\s+Initializable\b/, 'contract Initializable');
  return { init: prepareSource(init), impl: prepareSource(impl) };
}

function buildFlattened(useOZ, pragmaVer) {
  const initPath = useOZ && fs.existsSync(path.join(VERIFICATION_DIR, 'Initializable-OZ.sol'))
    ? path.join(VERIFICATION_DIR, 'Initializable-OZ.sol')
    : path.join(ROOT, 'contracts', 'Initializable.sol');
  const implPath = path.join(ROOT, 'contracts', 'TRC20TokenUpgradeable.sol');
  if (!fs.existsSync(initPath) || !fs.existsSync(implPath)) return null;
  let init = fs.readFileSync(initPath, 'utf8');
  let impl = fs.readFileSync(implPath, 'utf8');
  init = init.replace(/pragma\s+solidity\s+\^?0\.8\.\d+;/, `pragma solidity ${pragmaVer};`);
  impl = impl.replace(/pragma\s+solidity\s+\^?0\.8\.\d+;/, `pragma solidity ${pragmaVer};`);
  init = init.replace(/\babstract\s+contract\s+Initializable\b/, 'contract Initializable');
  const implNoImport = impl.replace(/import\s*\{\s*Initializable\s*\}\s*from\s*["']\.\/Initializable\.sol["'];\s*\n?/i, '');
  return prepareSource(`// SPDX-License-Identifier: MIT\npragma solidity ${pragmaVer};\n\n${init}\n\n${implNoImport}`);
}

try {
  console.log('=== Búsqueda EXACTA ampliada TXaXTSUK ===\n');

  const chainBytecode = await fetchBytecode(ADDR);
  const chainClean = stripMetadata(chainBytecode);
  console.log('Bytecode mainnet (sin metadata):', chainClean.length / 2, 'bytes');
  console.log('Probando: multi-file + flattened, OZ + custom, solc ampliado, runs 199/200/201\n');

  let best = { prefixMatch: 0, totalMatch: 0, cfg: null };
  let checked = 0;
  let exactMatch = null;

  const pragmaFromSolc = (s) => s.replace('v', '').split('+')[0];

  for (const solcVer of SOLC_LIST) {
    const pragmaVer = pragmaFromSolc(solcVer);
    for (const useOZ of [true, false]) {
      const multiFile = buildMultiFileSources(useOZ, pragmaVer);
      const flattened = buildFlattened(useOZ, pragmaVer);
      if (!multiFile && !flattened) continue;

      for (const evm of EVM_LIST) {
        for (const runs of RUNS_LIST) {
          for (const viaIR of [false, true]) {
            for (const useMulti of [true, false]) {
              const cfg = { solcVer, useOZ, evm, runs, viaIR, useMulti };
              try {
                const solc = await getSolc(solcVer);
                let compiled;
                if (useMulti && multiFile) {
                  compiled = compileMultiFile(solc, multiFile.init, multiFile.impl, MAIN_CONTRACT, evm || undefined, runs, viaIR);
                } else if (flattened) {
                  compiled = compileFlattened(solc, flattened, MAIN_CONTRACT, evm || undefined, runs, viaIR);
                } else continue;
                const compiledClean = stripMetadata(compiled);
                checked++;
                if (checked % 100 === 0) process.stdout.write(`\r  Comprobadas: ${checked} (mejor prefix: ${best.prefixMatch})   `);

                if (compiledClean === chainClean) {
                  exactMatch = { ...cfg, compiler: pragmaVer, evmStr: evm || 'default' };
                  break;
                }

                let prefixMatch = 0;
                let totalMatch = 0;
                const len = Math.min(chainClean.length, compiledClean.length);
                let prefixDone = false;
                for (let i = 0; i < len; i += 2) {
                  const eq = chainClean.slice(i, i + 2) === compiledClean.slice(i, i + 2);
                  if (eq) totalMatch++;
                  if (!prefixDone) { if (eq) prefixMatch++; else prefixDone = true; }
                }
                if (prefixMatch > best.prefixMatch || (prefixMatch === best.prefixMatch && totalMatch > best.totalMatch)) {
                  best = { prefixMatch, totalMatch, cfg };
                }
              } catch {
                // skip
              }
            }
            if (exactMatch) break;
          }
          if (exactMatch) break;
        }
        if (exactMatch) break;
      }
      if (exactMatch) break;
    }
    if (exactMatch) break;
  }

  if (exactMatch) {
    console.log('\n✅ COINCIDENCIA EXACTA ENCONTRADA\n');
    console.log('   Source:', exactMatch.useMulti ? 'multi-file' : 'flattened');
    console.log('   Initializable:', exactMatch.useOZ ? 'OZ' : 'custom');
    console.log('   Solc:', exactMatch.compiler);
    console.log('   EVM:', exactMatch.evmStr);
    console.log('   Runs:', exactMatch.runs);
    console.log('   viaIR:', exactMatch.viaIR);
    console.log('   Comprobaciones:', checked);

    const outPath = path.join(VERIFICATION_DIR, 'COINCIDENCIA-EXACTA-ENCONTRADA.txt');
    fs.writeFileSync(outPath, `COINCIDENCIA EXACTA TXaXTSUK
Source: ${exactMatch.useMulti ? 'multi-file' : 'flattened'}
Initializable: ${exactMatch.useOZ ? 'OZ' : 'custom'}
Compiler: ${exactMatch.compiler}
EVM: ${exactMatch.evmStr}
Runs: ${exactMatch.runs}
viaIR: ${exactMatch.viaIR}
Comprobaciones: ${checked}
`, 'utf8');
    console.log('\n   Guardado:', outPath);
    process.exit(0);
  }

  console.log('\n\n⚠️ Sin coincidencia exacta después de', checked, 'comprobaciones.\n');
  console.log('Mejor:', best.prefixMatch, 'bytes prefix,', best.totalMatch, 'total');
  if (best.cfg) {
    console.log('   Config:', best.cfg.useMulti ? 'multi' : 'flat', best.cfg.useOZ ? 'OZ' : 'custom',
      best.cfg.solcVer?.replace('v', '').split('+')[0], best.cfg.evm || 'default',
      'runs', best.cfg.runs, 'viaIR', best.cfg.viaIR);
  }
  process.exit(0); // búsqueda completada
} catch (e) {
  console.error(e);
  process.exit(1);
}
