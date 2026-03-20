'use strict';
/**
 * Consolidación de TODOS los archivos .md del workspace en docs/vitacora
 * Sin omisiones ni excepciones. Genera mapa de rutas para actualizar referencias.
 *
 * Uso: node scripts/consolidar-md-vitacora.js [--dry-run]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const VITACORA = path.join(ROOT, 'docs', 'vitacora');
const EXCLUDE = ['node_modules', '.git', 'build', 'dist', '.next', 'verification'];

function getAllMdFiles(dir, list = []) {
  if (!fs.existsSync(dir)) return list;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!EXCLUDE.includes(e.name)) getAllMdFiles(full, list);
    } else if (e.name.endsWith('.md')) {
      list.push(full);
    }
  }
  return list;
}

function getDestPath(orig) {
  const rel = path.relative(ROOT, orig);
  const dir = path.dirname(rel);
  const base = path.basename(orig);

  // Ya está en docs/vitacora -> mantener
  if (rel.startsWith('docs' + path.sep + 'vitacora' + path.sep)) {
    return orig;
  }

  // Mapear origen -> destino en vitacora
  let destDir;
  if (rel.startsWith('blockchain' + path.sep + 'trc20-token')) {
    destDir = path.join(VITACORA, 'trc20-token');
  } else if (rel.startsWith('blockchain' + path.sep + 'token-erc20')) {
    destDir = path.join(VITACORA, 'blockchain', 'token-erc20');
  } else if (rel.startsWith('blockchain' + path.sep + 'tenderly_tools')) {
    destDir = path.join(VITACORA, 'blockchain', 'tenderly_tools');
  } else if (rel.startsWith('solana' + path.sep + '555')) {
    destDir = path.join(VITACORA, 'solana', '555');
  } else if (rel.startsWith('apps' + path.sep + 'rtsp-virtual-webcam')) {
    destDir = path.join(VITACORA, 'apps', 'rtsp-virtual-webcam');
  } else if (rel.startsWith('apps' + path.sep + 'rtsp-webcam')) {
    destDir = path.join(VITACORA, 'apps', 'rtsp-webcam');
  } else if (rel.startsWith('docs' + path.sep) && !rel.startsWith('docs' + path.sep + 'vitacora')) {
    destDir = path.join(VITACORA, 'docs-origen');
  } else if (dir === '.' || dir === '') {
    destDir = VITACORA;
  } else {
    destDir = path.join(VITACORA, 'raiz', dir);
  }

  return path.join(destDir, base);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const dryRun = process.argv.includes('--dry-run');
const all = getAllMdFiles(ROOT);
const map = [];
const seen = new Map(); // dest -> orig (para detectar colisiones)

for (const orig of all) {
  const dest = getDestPath(orig);
  if (orig === dest) continue; // ya en vitacora

  const destNorm = path.normalize(dest);
  if (seen.has(destNorm)) {
    const other = seen.get(destNorm);
    if (other !== orig) {
      const base = path.basename(orig, '.md');
      const ext = path.extname(orig);
      const dir = path.dirname(dest);
      const subdir = path.relative(ROOT, path.dirname(orig)).replace(/[\\/]/g, '_');
      const newDest = path.join(dir, `${base}_${subdir}${ext}`);
      seen.set(path.normalize(newDest), orig);
      map.push({ orig, dest: newDest });
      if (!dryRun) {
        ensureDir(path.dirname(newDest));
        fs.copyFileSync(orig, newDest);
      }
      continue;
    }
  }
  seen.set(destNorm, orig);
  map.push({ orig, dest });
  if (!dryRun) {
    ensureDir(path.dirname(dest));
    fs.copyFileSync(orig, dest);
  }
}

// Escribir mapa de rutas (relativas al workspace)
const mapRel = map.map(({ orig, dest }) => ({
  orig: path.relative(ROOT, orig).replace(/\\/g, '/'),
  dest: path.relative(ROOT, dest).replace(/\\/g, '/'),
}));

fs.writeFileSync(
  path.join(VITACORA, 'MAPA_RUTAS_MD_CONSOLIDACION.json'),
  JSON.stringify(mapRel, null, 2),
  'utf8'
);

console.log(dryRun ? '[DRY-RUN] ' : '');
console.log(`Archivos a consolidar: ${map.length}`);
console.log('Mapa guardado en docs/vitacora/MAPA_RUTAS_MD_CONSOLIDACION.json');
if (dryRun) console.log('Ejecuta sin --dry-run para copiar.');
