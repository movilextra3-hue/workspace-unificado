#!/usr/bin/env node
'use strict';
/**
 * Cuenta archivos en workspace y compara con los revisados por lint.
 * Uso: node scripts/contar-archivos.js
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SKIP = /node_modules|\.git|build|dist|venv|__pycache__|\.mypy_cache|archivos_delicados|verification|audio_hls|hls_output/;

const counts = { total: 0, byExt: {}, revisados: { js: 0, sol: 0, py: 0, md: 0 } };

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    const rel = path.relative(ROOT, full);
    if (SKIP.test(rel)) continue;
    if (e.isDirectory()) {
      walk(full);
    } else {
      counts.total++;
      const ext = path.extname(e.name).slice(1) || '(sin ext)';
      counts.byExt[ext] = (counts.byExt[ext] || 0) + 1;
    }
  }
}

walk(ROOT);

// Archivos que el lint REVISA (según configuración actual)
const lintJsDirs = [
  'blockchain/trc20-token/scripts', 'blockchain/trc20-token/migrations', 'blockchain/trc20-token/test',
  'scripts', 'solana/555', 'blockchain/token-erc20/scripts', 'blockchain/token-erc20/test'
];
const lintJsFiles = ['blockchain/trc20-token/tronbox.js']; // archivos sueltos
const lintSol = ['blockchain/trc20-token/contracts'];
const lintPy = ['apps/rtsp-virtual-webcam', 'apps/rtsp-webcam'];
const _lintMd = ['**/*.md'];

function countInDirs(dirs, ext) {
  let n = 0;
  for (const d of dirs) {
    const p = path.join(ROOT, d);
    if (!fs.existsSync(p)) continue;
    function w(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (SKIP.test(path.relative(ROOT, full))) continue;
        if (e.isDirectory()) w(full);
        else if (path.extname(e.name).slice(1) === ext) n++;
      }
    }
    w(p);
  }
  return n;
}

counts.revisados.js = countInDirs(lintJsDirs, 'js') + lintJsFiles.filter((f) => fs.existsSync(path.join(ROOT, f))).length;
counts.revisados.sol = countInDirs(lintSol, 'sol');
counts.revisados.py = countInDirs(lintPy, 'py');

// MD: markdownlint revisa todos los .md (excl. node_modules)
let mdCount = 0;
function countMd(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    const rel = path.relative(ROOT, full);
    if (SKIP.test(rel)) continue;
    if (e.isDirectory()) countMd(full);
    else if (e.name.endsWith('.md')) mdCount++;
  }
}
countMd(ROOT);
counts.revisados.md = mdCount;

// Total revisables (JS + Sol + Py + MD que son código/docs)
const totalRevisables = counts.revisados.js + counts.revisados.sol + counts.revisados.py + counts.revisados.md;

console.log('=== COMPARATIVA: archivos en workspace vs revisados ===\n');
console.log('TOTAL archivos (excl. node_modules, .git, build, venv, etc.):', counts.total);
console.log('\nPor extensión (top 15):');
const sorted = Object.entries(counts.byExt).sort((a, b) => b[1] - a[1]);
sorted.slice(0, 15).forEach(([ext, n]) => console.log('  ', ext.padEnd(12), n));

console.log('\n--- ARCHIVOS REVISADOS POR LINT ---');
console.log('  JS (ESLint):     ', counts.revisados.js);
console.log('  Solidity (Solhint):', counts.revisados.sol);
console.log('  Python (Ruff):  ', counts.revisados.py);
console.log('  Markdown:       ', counts.revisados.md);
console.log('  TOTAL revisados:', totalRevisables);

const jsTotal = counts.byExt.js || 0;
const solTotal = counts.byExt.sol || 0;
const pyTotal = counts.byExt.py || 0;
const noRevisados = {
  js: jsTotal - counts.revisados.js,
  sol: solTotal - counts.revisados.sol,
  py: pyTotal - counts.revisados.py
};

console.log('\n--- NO REVISADOS (fuera del alcance del lint) ---');
console.log('  JS no revisados:', noRevisados.js, '(ej. blockchain/token-erc20/hardhat.config.js, blockchain/tenderly_tools, etc.)');
console.log('  Sol no revisados:', noRevisados.sol);
console.log('  Py no revisados:', noRevisados.py);

console.log('\n--- OTROS TIPOS NO LINTEADOS ---');
['json', 'txt', 'html', 'css', 'yml', 'yaml', 'toml', 'cjs', 'mjs'].forEach(ext => {
  const n = counts.byExt[ext] || 0;
  if (n > 0) console.log('  ', ext.padEnd(8), n, 'archivos (sin lint configurado)');
});
