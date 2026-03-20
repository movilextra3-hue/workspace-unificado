#!/usr/bin/env node
'use strict';
/**
 * Verificación global: valida que todos los JSON del workspace parseen bien.
 * Uso: node scripts/check-todo.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SKIP = /node_modules|package-lock|\.git/;
// JSONC (JSON con comentarios): VSCode y devcontainer usan comentarios; excluir de validación estricta
const SKIP_JSONC = /\.vscode\/|\.devcontainer\/|tools\/binary\/|trc20-token-backup/;
const errors = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach((f) => {
    const p = path.join(dir, f);
    if (SKIP.test(p)) return;
    if (SKIP_JSONC.test(path.relative(ROOT, p).replace(/\\/g, '/'))) return;
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else if (f.endsWith('.json')) {
      try {
        const raw = fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '');
        JSON.parse(raw);
      } catch (e) {
        errors.push({ file: path.relative(ROOT, p), message: e.message });
      }
    }
  });
}

walk(ROOT);
if (errors.length) {
  errors.forEach(({ file, message }) => console.error('JSON inválido:', file, message));
  process.exit(1);
}
console.log('Todos los JSON válidos.');
process.exit(0);
