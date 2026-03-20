#!/usr/bin/env node
'use strict';
/**
 * Búsqueda exhaustiva con salida a archivo. Ejecutar:
 *   node scripts/find-all-sources-robust.js
 *   node scripts/find-all-sources-robust.js --fast   (solo shanghai/runs200/viaIR=false)
 * Salida siempre en verification/FIND_SOURCES_RESULT.txt
 */
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');

const ADDR = 'TXaXTSUKgdAdX76MhQoqQ98msE8azBwiFS';
const ROOT = path.join(__dirname, '..');
const WORKSPACE = path.resolve(ROOT, '..', '..');
const OUT_FILE = path.join(ROOT, 'verification', 'FIND_SOURCES_RESULT.txt');
const FAST = process.argv.includes('--fast');

function log(msg, alsoConsole = true) {
  const s = typeof msg === 'string' ? msg : JSON.stringify(msg, null, 2);
  fs.appendFileSync(OUT_FILE, s + '\n');
  if (alsoConsole) process.stdout.write(s + '\n');
}

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

function* walkSol(baseDir, pattern) {
  if (!fs.existsSync(baseDir)) return;
  const entries = fs.readdirSync(baseDir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(baseDir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules') continue;
      yield* walkSol(full, pattern);
    } else if (e.name.endsWith('.sol') && pattern.test(e.name)) {
      yield full;
    }
  }
}

function collectSources() {
  const backupBase = path.join(WORKSPACE, 'blockchain', 'trc20-token-backup-completo-20260308-210130');
  const dirs = [
    path.join(ROOT, 'contracts'),
    path.join(ROOT, 'verification'),
    path.join(ROOT, '.forge-verify', 'src'),
    path.join(ROOT),
    path.join(backupBase, 'contracts'),
    path.join(backupBase, 'verification'),
    backupBase
  ].filter(d => fs.existsSync(d));
  const seen = new Set();
  const out = [];
  for (const dir of dirs) {
    for (const fp of walkSol(dir, /TRC20TokenUpgradeable|Initializable/)) {
      const rel = path.relative(WORKSPACE, fp);
      if (seen.has(rel)) continue;
      seen.add(rel);
      if (/Proxy|Migrations|MetaCoin|ConvertLib|Lock|MiToken/.test(fp)) continue;
      out.push(fp);
    }
  }
  return out;
}

function readSafe(fp) {
  try { return fs.readFileSync(fp, 'utf8'); } catch { return null; }
}

function isFlattened(c) {
  return /contract Initializable/.test(c) && /contract TRC20TokenUpgradeable/.test(c);
}

function buildFlat(implPath, initPath) {
  const impl = readSafe(implPath);
  const init = readSafe(initPath);
  if (!impl || !init) return null;
  const implClean = impl
    .replace(/\/\/\s*SPDX-License-Identifier:.*\n?/g, '')
    .replace(/pragma\s+solidity\s+\^?0\.8\.\d+;/, 'pragma solidity 0.8.25;')
    .replace(/import\s*\{\s*Initializable\s*\}\s*from\s*["'][^"']+["'];\s*\n?/i, '');
  const initClean = init
    .replace(/\/\/\s*SPDX-License-Identifier:.*\n?/g, '')
    .replace(/pragma\s+solidity\s+\^?0\.8\.\d+;/, 'pragma solidity 0.8.25;')
    .replace(/\babstract\s+contract\s+Initializable\b/, 'contract Initializable');
  return `// SPDX-License-Identifier: MIT\npragma solidity 0.8.25;\n\n${initClean}\n\n${implClean}`;
}

async function main() {
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, `=== Find sources TXaXTSUK ${new Date().toISOString()} ===\n`);
  if (FAST) log('Modo FAST: shanghai, runs 200, viaIR false\n');

  const chainHex = await fetchBytecode(ADDR);
  log(`Mainnet: ${chainHex.length / 2} bytes\n`);

  const solc = await loadSolc('v0.8.25+commit.b61c2a91');

  const EVM = FAST ? ['shanghai'] : [undefined, 'shanghai', 'cancun', 'paris', 'london'];
  const RUNS = FAST ? [200] : [0, 1, 200, 1000, 10000];
  const VIA_IR = FAST ? [false] : [false, true];

  function compileOne(source, opts = {}) {
    const input = {
      language: 'Solidity',
      sources: { 'C.sol': { content: source } },
      settings: {
        optimizer: { enabled: opts.runs !== undefined ? opts.runs >= 0 : true, runs: opts.runs ?? 200 },
        metadata: { bytecodeHash: 'none' },
        outputSelection: { '*': { '*': ['evm.deployedBytecode'] } }
      }
    };
    if (opts.evmVersion) input.settings.evmVersion = opts.evmVersion;
    if (opts.viaIR) input.settings.viaIR = true;
    const out = JSON.parse(solc.compile(JSON.stringify(input)));
    const err = out.errors?.find(e => e.severity === 'error');
    if (err) throw new Error(err.formattedMessage);
    for (const k of Object.keys(out.contracts || {})) {
      const c = out.contracts[k].TRC20TokenUpgradeable;
      if (c?.evm?.deployedBytecode?.object) return c.evm.deployedBytecode.object.replace(/^0x/, '');
    }
    return null;
  }

  function compileMulti(impl, init, opts = {}) {
    const input = {
      language: 'Solidity',
      sources: {
        'TRC20TokenUpgradeable.sol': { content: impl },
        'Initializable.sol': { content: init }
      },
      settings: {
        optimizer: { enabled: opts.runs !== undefined ? opts.runs >= 0 : true, runs: opts.runs ?? 200 },
        metadata: { bytecodeHash: 'none' },
        outputSelection: { '*': { '*': ['evm.deployedBytecode'] } }
      }
    };
    if (opts.evmVersion) input.settings.evmVersion = opts.evmVersion;
    if (opts.viaIR) input.settings.viaIR = true;
    const out = JSON.parse(solc.compile(JSON.stringify(input)));
    const err = out.errors?.find(e => e.severity === 'error');
    if (err) throw new Error(err.formattedMessage);
    const c = out.contracts?.['TRC20TokenUpgradeable.sol']?.TRC20TokenUpgradeable;
    return c?.evm?.deployedBytecode?.object?.replace(/^0x/, '') || null;
  }

  const implFiles = collectSources().filter(p => /TRC20TokenUpgradeable/.test(p) && !/Initializable\.sol$/.test(p));
  const initFiles = collectSources().filter(p => /Initializable\.sol$/.test(p));
  const toTry = [];

  for (const implPath of implFiles) {
    const content = readSafe(implPath);
    if (!content) continue;
    const baseDir = path.dirname(implPath);
    const impl0825 = content.replace(/pragma\s+solidity\s+\^?0\.8\.\d+;/, 'pragma solidity 0.8.25;');
    if (isFlattened(content)) {
      toTry.push({ name: implPath, source: impl0825, flat: true });
    } else {
      const initPath = [path.join(baseDir, 'Initializable.sol'), path.join(baseDir, '..', 'contracts', 'Initializable.sol'), path.join(ROOT, 'contracts', 'Initializable.sol')].find(p => fs.existsSync(p)) || initFiles[0];
      if (initPath) {
        const init = readSafe(initPath);
        if (init) {
          const init0825 = init.replace(/pragma\s+solidity\s+\^?0\.8\.\d+;/, 'pragma solidity 0.8.25;').replace(/\babstract\s+contract\s+Initializable\b/, 'contract Initializable');
          toTry.push({ name: implPath, source: impl0825, initSource: init0825, flat: false });
        }
        const flat = buildFlat(implPath, initPath);
        if (flat) toTry.push({ name: `flat:${implPath}`, source: flat, flat: true });
      }
    }
  }

  const totalCombos = EVM.length * RUNS.length * VIA_IR.length * toTry.length;
  log(`Fuentes: ${toTry.length} | Combos: ${totalCombos}\n`);

  let tried = 0;
  for (const entry of toTry) {
    for (const evm of EVM) {
      for (const runs of RUNS) {
        for (const viaIR of VIA_IR) {
          tried++;
          if (tried % 20 === 0) process.stdout.write('.');
          try {
            const opts = { evmVersion: evm, runs, viaIR };
            const bc = entry.flat ? compileOne(entry.source, opts) : compileMulti(entry.source, entry.initSource, opts);
            if (!bc) continue;
            if (bc === chainHex) {
              const msg = `\n*** COINCIDE ***\nSource: ${entry.name}\nEVM: ${evm || 'default'} | Runs: ${runs} | viaIR: ${viaIR}`;
              log(msg);
              fs.writeFileSync(path.join(ROOT, 'verification', 'PARAMETROS-TXaXTSUK-MATCHING.txt'), msg);
              process.exit(0);
            }
          } catch (e) { /* skip */ }
        }
      }
    }
  }

  const result = `\nFINAL: No coincide. Probadas ${tried} combinaciones.`;
  log(result);
  process.exit(1);
}

main().catch(e => {
  fs.appendFileSync(OUT_FILE, `ERROR: ${e.message}\n`);
  console.error(e);
  process.exit(1);
});
