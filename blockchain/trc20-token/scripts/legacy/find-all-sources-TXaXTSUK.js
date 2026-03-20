#!/usr/bin/env node
'use strict';
/**
 * Busca en TODOS los archivos .sol del proyecto la combinación que compile
 * exactamente al bytecode de TXaXTSUK. Respeta reglas vitácora.
 */
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');

const ADDR = 'TXaXTSUKgdAdX76MhQoqQ98msE8azBwiFS';
const ROOT = path.join(__dirname, '..');
const WORKSPACE = path.resolve(ROOT, '..', '..');

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

function* walkSol(baseDir, pattern = /TRC20TokenUpgradeable|Initializable/) {
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
  const sources = [];
  const backupBase = path.join(WORKSPACE, 'blockchain', 'trc20-token-backup-completo-20260308-210130');
  const dirs = [
    path.join(ROOT, 'contracts'),
    path.join(ROOT, 'verification'),
    path.join(ROOT),
    path.join(backupBase, 'contracts'),
    path.join(backupBase, 'verification'),
    backupBase
  ].filter(d => fs.existsSync(d));
  const seen = new Set();
  for (const dir of dirs) {
    for (const fp of walkSol(dir, /TRC20TokenUpgradeable|Initializable/)) {
      const rel = path.relative(WORKSPACE, fp);
      if (seen.has(rel)) continue;
      seen.add(rel);
      if (fp.includes('Proxy') || fp.includes('Migrations') || fp.includes('MetaCoin') || fp.includes('ConvertLib') || fp.includes('Lock') || fp.includes('MiToken')) continue;
      sources.push(fp);
    }
  }
  return sources;
}

function readSafe(fp) {
  try {
    return fs.readFileSync(fp, 'utf8');
  } catch (e) {
    return null;
  }
}

function isFlattened(content) {
  return /contract Initializable/.test(content) && /contract TRC20TokenUpgradeable/.test(content);
}

function buildFlat(implPath, initPath, _baseDir) {
  const impl = readSafe(implPath);
  const init = readSafe(initPath);
  if (!impl || !init) return null;
  const implClean = impl
    .replace(/\/\/\s*SPDX-License-Identifier:.*\n?/g, '')
    .replace(/pragma\s+solidity\s+\^?0\.8\.\d+;/, 'pragma solidity ^0.8.25;')
    .replace(/import\s*\{\s*Initializable\s*\}\s*from\s*["'][^"']+["'];\s*\n?/i, '');
  const initClean = init
    .replace(/\/\/\s*SPDX-License-Identifier:.*\n?/g, '')
    .replace(/pragma\s+solidity\s+\^?0\.8\.\d+;/, 'pragma solidity ^0.8.25;')
    .replace(/\babstract\s+contract\s+Initializable\b/, 'contract Initializable');
  return `// SPDX-License-Identifier: MIT\npragma solidity ^0.8.25;\n\n${initClean}\n\n${implClean}`;
}

async function main() {
  console.log('=== Búsqueda ALL .sol → bytecode TXaXTSUK ===\n');
  const chainHex = await fetchBytecode(ADDR);
  console.log('Mainnet:', chainHex.length / 2, 'bytes\n');

  const solc = await loadSolc('v0.8.25+commit.b61c2a91');
  const EVM = [undefined, 'shanghai', 'cancun'];
  const RUNS = [0, 200, 1000];
  const VIA_IR = [false, true];

  const toTry = [];

  const implFiles = collectSources().filter(p => /TRC20TokenUpgradeable/.test(p) && !/Initializable/.test(p));
  const initFiles = collectSources().filter(p => /Initializable\.sol$/.test(p));

  for (const implPath of implFiles) {
    const content = readSafe(implPath);
    if (!content) continue;
    const baseDir = path.dirname(implPath);
    const impl0825 = content.replace(/pragma\s+solidity\s+\^?0\.8\.\d+;/, 'pragma solidity ^0.8.25;');
    if (isFlattened(content)) {
      toTry.push({ name: implPath, source: impl0825, flat: true });
    } else {
      const initPath = path.join(baseDir, 'Initializable.sol');
      const parentInit = path.join(baseDir, '..', 'contracts', 'Initializable.sol');
      const grandInit = path.join(ROOT, 'contracts', 'Initializable.sol');
      const initCand = fs.existsSync(initPath) ? initPath : (fs.existsSync(parentInit) ? parentInit : (fs.existsSync(grandInit) ? grandInit : initFiles.find(p => fs.existsSync(p))));
      if (initCand) {
        const init = readSafe(initCand);
        if (init) {
          const init0825 = init.replace(/pragma\s+solidity\s+\^?0\.8\.\d+;/, 'pragma solidity ^0.8.25;').replace(/\babstract\s+contract\s+Initializable\b/, 'contract Initializable');
          toTry.push({ name: implPath, source: impl0825, initSource: init0825, flat: false });
        }
        const flat = buildFlat(implPath, initCand, baseDir);
        if (flat) toTry.push({ name: `flat:${implPath}`, source: flat, flat: true });
      }
    }
  }

  function compileOne(source, opts) {
    const input = {
      language: 'Solidity',
      sources: { 'C.sol': { content: source } },
      settings: {
        optimizer: { enabled: opts.runs >= 0, runs: opts.runs },
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

  function compileMulti(impl, init, opts) {
    const input = {
      language: 'Solidity',
      sources: {
        'TRC20TokenUpgradeable.sol': { content: impl },
        'Initializable.sol': { content: init }
      },
      settings: {
        optimizer: { enabled: opts.runs >= 0, runs: opts.runs },
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

  let tried = 0;
  let best = { name: '', len: 0, diff: Infinity, opts: null };

  console.log('Fuentes a probar:', toTry.length);
  for (const e of toTry) console.log(' -', e.name);

  for (const entry of toTry) {
    const { name, source, flat, initSource } = entry;
    for (const evm of EVM) {
      for (const runs of RUNS) {
        for (const viaIR of VIA_IR) {
          tried++;
          if (tried % 100 === 0) process.stdout.write('.');
          try {
            const bc = flat ? compileOne(source, { evmVersion: evm, runs, viaIR }) : compileMulti(source, initSource, { evmVersion: evm, runs, viaIR });
            if (!bc) continue;
            if (bc === chainHex) {
              console.log('\n\n*** COINCIDE ***');
              console.log('Source:', name);
              console.log('EVM:', evm || 'default');
              console.log('Runs:', runs);
              console.log('viaIR:', viaIR);
              const outDir = path.join(ROOT, 'verification');
              fs.mkdirSync(outDir, { recursive: true });
              const outSol = path.join(outDir, 'TRC20TokenUpgradeable-TXaXTSUK-MATCHING.sol');
              const outParams = path.join(outDir, 'PARAMETROS-TXaXTSUK-MATCHING.txt');
              fs.writeFileSync(outSol, source, 'utf8');
              fs.writeFileSync(outParams, `COINCIDE CON TXaXTSUK\nSource: ${name}\nCompiler: 0.8.25\nEVM: ${evm || 'default'}\nRuns: ${runs}\nviaIR: ${viaIR}\nbytecodeHash: none\n`, 'utf8');
              console.log('Guardado:', outSol);
              process.exit(0);
            }
            const diff = Math.abs(bc.length - chainHex.length);
            if (diff < best.diff) {
              best = { name, len: bc.length / 2, diff, opts: { evm, runs, viaIR } };
            }
          } catch (e) { /* skip */ }
        }
      }
    }
  }

  console.log('\n\nNo se encontró coincidencia exacta.');
  console.log('Mejor aproximación:', best.name);
  console.log('  Bytes compilado:', best.len, '| diff longitud:', best.diff / 2);
  console.log('  opts:', best.opts);
  process.exit(1);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
