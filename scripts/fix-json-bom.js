#!/usr/bin/env node
'use strict';
/**
 * Elimina BOM (Byte Order Mark) de archivos JSON para que parseen correctamente.
 * Uso: node scripts/fix-json-bom.js [ruta]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BOM = '\uFEFF';

function fixFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  if (!raw.startsWith(BOM)) return false;
  const content = raw.slice(1);
  JSON.parse(content); // validate
  fs.writeFileSync(filePath, content, 'utf8');
  return true;
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const fixed = [];
  fs.readdirSync(dir).forEach((f) => {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      if (f !== 'node_modules') fixed.push(...walk(p));
    } else if (f.endsWith('.json') && !path.basename(p).startsWith('package-lock')) {
      try {
        if (fixFile(p)) fixed.push(p);
      } catch (e) {
        console.error('Error en', p, e.message);
      }
    }
  });
  return fixed;
}

const dir = process.argv[2] ? path.resolve(process.argv[2]) : path.join(ROOT, 'solana', '555');
const fixed = walk(dir);
fixed.forEach((f) => console.log('Corregido (BOM eliminado):', path.relative(ROOT, f)));
if (fixed.length === 0) console.log('Ningún archivo con BOM encontrado.');
process.exit(0);
