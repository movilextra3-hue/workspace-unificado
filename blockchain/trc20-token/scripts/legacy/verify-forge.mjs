#!/usr/bin/env node
/**
 * Verificación TXaXTSUK usando Foundry (forge build).
 * Compara bytecode compilado con forge vs mainnet.
 */
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const ADDR = 'TXaXTSUKgdAdX76MhQoqQ98msE8azBwiFS';
const MAIN = 'TRC20TokenUpgradeable';
const FLAT_OZ = path.join(ROOT, 'verification', 'TXaXTSUK-verification', 'TRC20TokenUpgradeable-hardhat-flatten-OZ.sol');
const FLAT = path.join(ROOT, 'verification', 'TXaXTSUK-verification', 'TRC20TokenUpgradeable-flattened.sol');
const FORGE_DIR = path.join(ROOT, '.forge-verify');

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

function getForgePath() {
  const win = path.join(process.env.USERPROFILE || '', '.foundry', 'bin', 'forge.cmd');
  if (fs.existsSync(win)) return win;
  return 'forge';
}

function runForge(cwd, tomlContent) {
  const srcDir = path.join(cwd, 'src');
  const tomlPath = path.join(cwd, 'foundry.toml');
  fs.mkdirSync(srcDir, { recursive: true });
  fs.writeFileSync(tomlPath, tomlContent, 'utf8');
  const forgeCmd = getForgePath();
  const r = spawnSync(forgeCmd, ['build', '--force'], {
    cwd,
    encoding: 'utf8',
    shell: true
  });
  return r;
}

function getDeployedBytecode(cwd) {
  const artifactPath = path.join(cwd, 'out', `${MAIN}.sol`, `${MAIN}.json`);
  if (!fs.existsSync(artifactPath)) return null;
  const art = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  const bc = art.deployedBytecode?.object;
  return bc ? bc.replace(/^0x/, '') : null;
}

const CONFIGS = [
  { runs: 200, evm: 'paris', viaIR: false },
  { runs: 200, evm: 'cancun', viaIR: false },
  { runs: 199, evm: 'paris', viaIR: false },
  { runs: 200, evm: 'shanghai', viaIR: false },
  { runs: 0, evm: 'paris', viaIR: true },
  { runs: 200, evm: 'paris', viaIR: true }
];

async function main() {
  console.log('=== Verificación TXaXTSUK con Foundry ===\n');

  const flatPath = fs.existsSync(FLAT_OZ) ? FLAT_OZ : FLAT;
  if (!fs.existsSync(flatPath)) {
    console.error('Falta fuente flattened. Ejecutar: npm run generate:verification');
    process.exit(1);
  }
  const source = prepareSource(fs.readFileSync(flatPath, 'utf8'));
  const chain = stripMetadata(await fetchBytecode(ADDR));
  const targetLen = chain.length / 2;

  fs.mkdirSync(FORGE_DIR, { recursive: true });
  const srcPath = path.join(FORGE_DIR, 'src', `${MAIN}.sol`);
  fs.mkdirSync(path.dirname(srcPath), { recursive: true });
  fs.writeFileSync(srcPath, source, 'utf8');

  let best = { prefixMatch: 0, totalMatch: 0, len: 0, cfg: null };
  let exactMatch = null;

  for (const cfg of CONFIGS) {
    const viaIR = cfg.viaIR ? '\nvia_ir = true' : '';
    const toml = `[profile.default]
src = "src"
solc = "0.8.25"
optimizer = true
optimizer_runs = ${cfg.runs}
evm_version = "${cfg.evm}"${viaIR}
`;
    const r = runForge(FORGE_DIR, toml);
    if (r.status !== 0) {
      console.log(`  [skip] runs=${cfg.runs} evm=${cfg.evm} viaIR=${cfg.viaIR}: ${r.stderr?.slice(0, 80) || 'error'}`);
      continue;
    }
    const compiled = getDeployedBytecode(FORGE_DIR);
    if (!compiled) {
      console.log(`  [skip] runs=${cfg.runs} evm=${cfg.evm}: no artifact`);
      continue;
    }
    const stripped = stripMetadata(compiled);
    const len = stripped.length / 2;

    let p = 0, t = 0, done = false;
    for (let i = 0; i < Math.min(chain.length, stripped.length); i += 2) {
      const eq = chain.slice(i, i + 2) === stripped.slice(i, i + 2);
      if (eq) t++;
      if (!done) { if (eq) p++; else done = true; }
    }

    if (stripped === chain) {
      exactMatch = cfg;
      break;
    }
    if (p > best.prefixMatch || (p === best.prefixMatch && t > best.totalMatch)) {
      best = { prefixMatch: p, totalMatch: t, len, cfg };
    }
    const diff = Math.abs(len - targetLen);
    console.log(`  runs=${cfg.runs} evm=${cfg.evm} viaIR=${cfg.viaIR}: ${len} bytes, diff=${diff}, prefix=${p}`);
  }

  if (exactMatch) {
    console.log('\n✅ COINCIDENCIA EXACTA (Foundry)');
    console.log(exactMatch);
    fs.writeFileSync(path.join(ROOT, 'verification', 'TXaXTSUK-verification', 'COINCIDENCIA-EXACTA-FOUNDRY.txt'),
      JSON.stringify(exactMatch, null, 2), 'utf8');
    process.exit(0);
  }

  console.log('\n⚠️ Sin coincidencia exacta con Foundry');
  console.log('Mejor:', best.prefixMatch, 'prefix,', best.totalMatch, 'total,', best.len, 'bytes |', best.cfg);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
