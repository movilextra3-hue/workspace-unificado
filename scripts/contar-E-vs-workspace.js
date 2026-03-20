#!/usr/bin/env node
'use strict';
/**
 * Cuenta archivos en E: (orígenes del sync) y en workspace. Compara con revisados.
 * Uso: node scripts/contar-E-vs-workspace.js
 */
const fs = require('node:fs');
const path = require('node:path');

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

const SKIP = /node_modules|\.git|build|dist|venv|__pycache__|\.mypy_cache|archivos_delicados|verification|audio_hls|hls_output/;

function walk(dir, exclude, counts) {
  if (!fs.existsSync(dir)) return;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (exclude && exclude.includes(e.name)) continue;
      if (e.isDirectory()) {
        walk(full, exclude, counts);
      } else {
        counts.total++;
        const ext = path.extname(e.name).slice(1) || '(sin ext)';
        counts.byExt[ext] = (counts.byExt[ext] || 0) + 1;
      }
    }
  } catch (err) {
    counts.errors = (counts.errors || []).concat({ path: dir, msg: err.message });
  }
}

const eCounts = { total: 0, byExt: {}, byOrigen: {} };
for (const o of ORIGENES_E) {
  const c = { total: 0, byExt: {} };
  walk(o.dir, o.exclude, c);
  eCounts.byOrigen[o.name] = c.total;
  eCounts.total += c.total;
  for (const [ext, n] of Object.entries(c.byExt)) {
    eCounts.byExt[ext] = (eCounts.byExt[ext] || 0) + n;
  }
}

const wsCounts = { total: 0, byExt: {} };
function walkWs(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    const rel = path.relative(ROOT, full);
    if (SKIP.test(rel)) continue;
    if (e.isDirectory()) walkWs(full);
    else {
      wsCounts.total++;
      const ext = path.extname(e.name).slice(1) || '(sin ext)';
      wsCounts.byExt[ext] = (wsCounts.byExt[ext] || 0) + 1;
    }
  }
}
walkWs(ROOT);

const revisados = { js: 66, sol: 6, py: 4, md: 8 };
const totalRevisados = revisados.js + revisados.sol + revisados.py + revisados.md;

console.log('=== E: DRIVE (orígenes del sync) ===\n');
console.log('Total archivos en E:', eCounts.total);
console.log('Por origen:', eCounts.byOrigen);
if (eCounts.errors && eCounts.errors.length) {
  console.log('Errores acceso:', eCounts.errors);
}

console.log('\n=== WORKSPACE (e:\\workspace-unificado) ===\n');
console.log('Total archivos:', wsCounts.total);

console.log('\n=== REVISADOS POR LINT ===\n');
console.log('JS:', revisados.js, '| Sol:', revisados.sol, '| Py:', revisados.py, '| MD:', revisados.md);
console.log('TOTAL revisados:', totalRevisados);

const lintablesE = (eCounts.byExt.js || 0) + (eCounts.byExt.sol || 0) + (eCounts.byExt.py || 0) + (eCounts.byExt.md || 0);
const lintablesWs = (wsCounts.byExt.js || 0) + (wsCounts.byExt.sol || 0) + (wsCounts.byExt.py || 0) + (wsCounts.byExt.md || 0);

console.log('\n=== COMPARATIVA ===\n');
console.log('E: total           ', eCounts.total);
console.log('Workspace total    ', wsCounts.total);
console.log('Revisados (lint)   ', totalRevisados);
console.log('');
console.log('Archivos LINTABLES (js+sol+py+md):');
console.log('  En E:            ', lintablesE);
console.log('  En workspace     ', lintablesWs);
console.log('  Revisados        ', totalRevisados);
console.log('  Cobertura lint   ', totalRevisados, '/', lintablesWs, '=', (100 * totalRevisados / Math.max(1, lintablesWs)).toFixed(1) + '%');
