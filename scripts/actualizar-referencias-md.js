'use strict';
/**
 * Actualiza referencias a archivos .md según MAPA_RUTAS_MD_CONSOLIDACION.json
 * Reemplaza rutas antiguas por docs/vitacora/... (desde raíz workspace)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MAP_PATH = path.join(ROOT, 'docs', 'vitacora', 'MAPA_RUTAS_MD_CONSOLIDACION.json');
const EXCLUDE = ['node_modules', '.git', 'build', 'dist', 'MAPA_RUTAS_MD_CONSOLIDACION.json'];

const map = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));

// Construir reemplazos: orig -> dest (solo nombre para búsqueda flexible)
const replacements = [];
for (const { orig, dest } of map) {
  const origBase = path.basename(orig);
  const destNorm = dest.replace(/\\/g, '/');
  // Variantes que pueden aparecer en referencias
  replacements.push({ from: orig.replace(/\\/g, '/'), to: destNorm });
  replacements.push({ from: origBase, to: destNorm }); // solo nombre
  // docs/FILE cuando orig es blockchain/trc20-token/docs/FILE
  if (orig.includes('blockchain/trc20-token/docs/')) {
    const short = 'docs/' + origBase;
    replacements.push({ from: short, to: destNorm });
  }
  if (orig.includes('blockchain/trc20-token/') && !orig.includes('/docs/')) {
    const short = orig.replace('blockchain/trc20-token/', '').replace(/\\/g, '/');
    replacements.push({ from: short, to: destNorm });
  }
}

function getAllFiles(dir, list = [], ext = ['.md', '.js', '.json', '.mdc', '.txt']) {
  if (!fs.existsSync(dir)) return list;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!EXCLUDE.includes(e.name)) getAllFiles(full, list, ext);
    } else if (ext.some(x => e.name.endsWith(x))) {
      list.push(full);
    }
  }
  return list;
}

const files = getAllFiles(ROOT);
let total = 0;
for (const file of files) {
  if (file.includes('MAPA_RUTAS')) continue;
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  for (const { from, to } of replacements) {
    // Evitar reemplazar si ya apunta a docs/vitacora
    if (content.includes(from) && !content.includes('docs/vitacora/' + path.basename(from))) {
      const re = new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const newContent = content.replace(re, to);
      if (newContent !== content) {
        content = newContent;
        changed = true;
      }
    }
  }
  if (changed) {
    fs.writeFileSync(file, content);
    total++;
    console.log('Actualizado:', path.relative(ROOT, file));
  }
}
console.log('Archivos actualizados:', total);
