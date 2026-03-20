#!/usr/bin/env node
'use strict';
/**
 * Prueba verificable: lista cada archivo en E: (orígenes sync), indica si es lintable
 * y si está incluido en el lint. Genera informe.
 * Uso: node scripts/probar-revision-completa.js
 */
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const E = 'E:\\';

const ORIGENES_E = [
  { name: 'trc20-token', dir: path.join(E, 'Cursor-Workspace', 'trc20-token'), exclude: ['node_modules', 'build', '.env', 'archivos_delicados'] },
  { name: 'token-erc20', dir: path.join(E, 'ethereum-api-quickstart', 'token'), exclude: ['node_modules', 'build', '.env'] },
  { name: 'tenderly_tools', dir: path.join(E, 'ethereum-api-quickstart', 'tenderly_tools'), exclude: ['node_modules'] },
  { name: '555', dir: path.join(E, '555'), exclude: ['node_modules'] },
  { name: 'rtsp-virtual-webcam', dir: path.join(E, 'rtsp-virtual-webcam'), exclude: ['venv', '.mypy_cache'] },
  { name: 'rtsp-webcam', dir: path.join(E, 'rtsp-webcam'), exclude: ['venv', '.mypy_cache', 'audio_hls', 'hls_output'] },
];

// Mapeo: ruta relativa en workspace (desde sync) -> ¿está en lint?
const LINT_JS = new Set([
  'blockchain/trc20-token/scripts', 'blockchain/trc20-token/migrations', 'blockchain/trc20-token/test',
  'blockchain/trc20-token/tronbox.js', 'scripts', 'solana/555', 'blockchain/token-erc20/scripts',
  'blockchain/token-erc20/test', 'blockchain/token-erc20/hardhat.config.js'
]);
const LINT_SOL = new Set(['blockchain/trc20-token/contracts', 'blockchain/token-erc20/contracts']);
const LINT_PY = new Set(['apps/rtsp-virtual-webcam', 'apps/rtsp-webcam']);
const LINT_MD = true; // markdownlint revisa todos los .md

function dirStartsWith(rel, prefixes) {
  for (const p of prefixes) {
    if (rel === p || rel.startsWith(p + '/') || rel.startsWith(p + '\\')) return true;
  }
  return false;
}

function walk(dir, exclude, base, list) {
  if (!fs.existsSync(dir)) return;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (exclude && exclude.includes(e.name)) continue;
      const rel = path.relative(base, full).replace(/\\/g, '/');
      if (e.isDirectory()) {
        walk(full, exclude, base, list);
      } else {
        list.push(rel);
      }
    }
  } catch (err) {
    list.push({ error: dir, msg: err.message });
  }
}

// Mapeo origen E: -> ruta en workspace
const MAP = {
  'trc20-token': 'blockchain/trc20-token',
  'token-erc20': 'blockchain/token-erc20',
  'tenderly_tools': 'blockchain/tenderly_tools',
  '555': 'solana/555',
  'rtsp-virtual-webcam': 'apps/rtsp-virtual-webcam',
  'rtsp-webcam': 'apps/rtsp-webcam',
};

const LINTABLE = { js: 1, cjs: 1, sol: 1, py: 1, md: 1 };
const report = { revisados: [], noRevisados: [], noLintables: [], errores: [] };

for (const o of ORIGENES_E) {
  const files = [];
  walk(o.dir, o.exclude, o.dir, files);
  const wsBase = MAP[o.name];
  for (const f of files) {
    if (typeof f === 'object' && f.error) {
      report.errores.push(f);
      continue;
    }
    const wsRel = wsBase + '/' + f.replace(/\\/g, '/');
    const ext = path.extname(f).slice(1).toLowerCase();
    const isLintable = LINTABLE[ext];
    if (!isLintable) {
      report.noLintables.push(wsRel);
      continue;
    }
    let enLint = false;
    if (ext === 'js' || ext === 'cjs') {
      enLint = dirStartsWith(wsRel, ['blockchain/trc20-token/scripts', 'blockchain/trc20-token/migrations', 'blockchain/trc20-token/test', 'scripts', 'solana/555', 'blockchain/token-erc20/scripts', 'blockchain/token-erc20/test']) ||
        wsRel === 'blockchain/trc20-token/tronbox.js' || wsRel === 'blockchain/trc20-token/.eslintrc.cjs' || wsRel === 'blockchain/token-erc20/hardhat.config.js';
    } else if (ext === 'sol') {
      enLint = dirStartsWith(wsRel, ['blockchain/trc20-token/contracts', 'blockchain/token-erc20/contracts']);
    } else if (ext === 'py') {
      enLint = dirStartsWith(wsRel, ['apps/rtsp-virtual-webcam', 'apps/rtsp-webcam']);
    } else if (ext === 'md') {
      enLint = true; // markdownlint revisa todos
    }
    if (enLint) report.revisados.push(wsRel);
    else report.noRevisados.push(wsRel);
  }
}

console.log('=== PRUEBA: ¿SE REVISÓ TODO? ===\n');
console.log('Archivos LINTABLES en E: (orígenes sync):');
console.log('  Revisados:   ', report.revisados.length);
console.log('  No revisados:', report.noRevisados.length);
console.log('  No lintables:', report.noLintables.length);
if (report.errores.length) console.log('  Errores acceso:', report.errores.length);

if (report.noRevisados.length > 0) {
  console.log('\n--- NO REVISADOS ---');
  report.noRevisados.forEach((f) => console.log('  ', f));
}

console.log('\n--- EJECUTANDO LINT REAL ---');
try {
  execSync('npm run check', { cwd: ROOT, stdio: 'inherit' });
  console.log('\n✓ npm run check PASÓ');
} catch (e) {
  console.log('\n✗ npm run check FALLÓ');
  process.exit(1);
}

console.log('\n--- RESUMEN ---');
const totalLint = report.revisados.length + report.noRevisados.length;
const pct = totalLint ? (100 * report.revisados.length / totalLint).toFixed(1) : 100;
console.log('Cobertura:', report.revisados.length, '/', totalLint, '=', pct + '%');
if (report.noRevisados.length === 0) {
  console.log('\n✓ TODOS los archivos lintables están revisados.');
}
