#!/usr/bin/env node
/**
 * Búsqueda PRIORITARIA para coincidencia EXACTA TXaXTSUK.
 * Solo configs más probables: 0.8.25, cancun/default, runs 199/200/201, multi+flat.
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

function compile(solc, source, evm, runs, viaIR) {
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
  const bc = out.contracts['flat.sol']?.[MAIN_CONTRACT]?.evm?.deployedBytecode?.object;
  if (!bc) throw new Error('No deployedBytecode');
  return bc.replace(/^0x/, '');
}

function prepareSource(raw) {
  let s = raw.replaceAll(/^\s*\/\/\s*SPDX-License-Identifier:[^\n]*\n?/gm, '');
  if (!/SPDX-License-Identifier/i.test(s.slice(0, 300))) s = '// SPDX-License-Identifier: MIT\n' + s;
  return s;
}

// Solo prioridad
const SOLC = 'v0.8.25+commit.b61c2a91';
const EVMS = [undefined, 'cancun', 'shanghai'];
const RUNS = [199, 200, 201];

try {
  console.log('=== Búsqueda PRIORITARIA TXaXTSUK ===\n');
  const chainBytecode = await fetchBytecode(ADDR);
  const chainClean = stripMetadata(chainBytecode);
  console.log('Bytecode:', chainClean.length / 2, 'bytes');

  const initOZPath = path.join(VERIFICATION_DIR, 'Initializable-OZ.sol');
  const initPath = fs.existsSync(initOZPath) ? initOZPath : path.join(ROOT, 'contracts', 'Initializable.sol');
  const implPath = path.join(ROOT, 'contracts', 'TRC20TokenUpgradeable.sol');
  let init = fs.readFileSync(initPath, 'utf8');
  let impl = fs.readFileSync(implPath, 'utf8');
  init = init.replace(/pragma\s+solidity\s+\^?0\.8\.\d+;/, 'pragma solidity 0.8.25;');
  impl = impl.replace(/pragma\s+solidity\s+\^?0\.8\.\d+;/, 'pragma solidity 0.8.25;');
  init = init.replace(/\babstract\s+contract\s+Initializable\b/, 'contract Initializable');
  const implNoImport = impl.replace(/import\s*\{\s*Initializable\s*\}\s*from\s*["']\.\/Initializable\.sol["'];\s*\n?/i, '');
  const source = prepareSource(`// SPDX-License-Identifier: MIT\npragma solidity 0.8.25;\n\n${init}\n\n${implNoImport}`);

  const solc = await loadSolc(SOLC);
  let best = { prefixMatch: 0, totalMatch: 0, cfg: null };

  for (const evm of EVMS) {
    for (const runs of RUNS) {
      for (const viaIR of [false, true]) {
        try {
          const compiled = compile(solc, source, evm, runs, viaIR);
          const compiledClean = stripMetadata(compiled);
          if (compiledClean === chainClean) {
            console.log('\n✅ COINCIDENCIA EXACTA');
            console.log('   EVM:', evm || 'default', '| runs:', runs, '| viaIR:', viaIR);
            process.exit(0);
          }
          let prefixMatch = 0, totalMatch = 0;
          const len = Math.min(chainClean.length, compiledClean.length);
          let prefixDone = false;
          for (let i = 0; i < len; i += 2) {
            const eq = chainClean.slice(i, i + 2) === compiledClean.slice(i, i + 2);
            if (eq) totalMatch++;
            if (!prefixDone) { if (eq) prefixMatch++; else prefixDone = true; }
          }
          if (prefixMatch > best.prefixMatch || (prefixMatch === best.prefixMatch && totalMatch > best.totalMatch)) {
            best = { prefixMatch, totalMatch, cfg: { evm: evm || 'default', runs, viaIR } };
          }
        } catch { /* skip */ }
      }
    }
  }

  console.log('\n⚠️ Sin coincidencia exacta.');
  console.log('Mejor:', best.prefixMatch, 'bytes prefix,', best.totalMatch, 'total |', best.cfg);
  process.exit(0); // búsqueda completada, sin coincidencia
} catch (e) {
  console.error(e);
  process.exit(1);
}
