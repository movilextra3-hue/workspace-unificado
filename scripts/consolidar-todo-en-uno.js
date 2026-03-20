'use strict';
/**
 * Consolida TODOS los archivos de docs/vitacora en un único documento.
 * Organizado por dominio (Solana, TRC20, Apps, Blockchain, Docs-origen, Raíz)
 * y ordenado por mtime dentro de cada dominio.
 *
 * Uso: node scripts/consolidar-todo-en-uno.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const VITACORA = path.join(ROOT, 'docs', 'vitacora');
const OUTPUT = path.join(VITACORA, 'CONSOLIDACION_COMPLETA_TODO.md');
const INVENTARIO = path.join(VITACORA, 'vitacora_inventario.json');

function getDomain(ruta) {
  const rel = path.relative(VITACORA, ruta).replace(/\\/g, '/');
  if (rel.startsWith('solana')) return 'solana';
  if (rel.startsWith('trc20-token')) return 'trc20-token';
  if (rel.startsWith('apps')) return 'apps';
  if (rel.startsWith('blockchain')) return 'blockchain';
  if (rel.startsWith('docs-origen')) return 'docs-origen';
  return 'raiz';
}

function getRelPath(ruta) {
  return path.relative(VITACORA, ruta).replace(/\\/g, '/');
}

function main() {
  const inv = JSON.parse(fs.readFileSync(INVENTARIO, 'utf8'));
  const archivos = inv.archivos || [];

  // Excluir el output y el inventario del contenido
  const excluir = ['CONSOLIDACION_COMPLETA_TODO.md', 'vitacora_inventario.json'];
  const filtrados = archivos.filter((a) => {
    const rel = getRelPath(a.ruta);
    return !excluir.some((e) => rel.includes(e));
  });

  // Agrupar por dominio y ordenar por mtime
  const porDominio = {};
  for (const a of filtrados) {
    const dom = getDomain(a.ruta);
    if (!porDominio[dom]) porDominio[dom] = [];
    porDominio[dom].push(a);
  }
  const ordenDominios = ['raiz', 'solana', 'trc20-token', 'apps', 'blockchain', 'docs-origen'];
  for (const dom of ordenDominios) {
    if (porDominio[dom]) {
      porDominio[dom].sort((a, b) => (a.mtime || '').localeCompare(b.mtime || ''));
    }
  }

  const titulos = {
    raiz: 'Raíz vitácora',
    solana: 'Solana (555)',
    'trc20-token': 'TRC20 Token (TRON)',
    apps: 'Apps (RTSP)',
    blockchain: 'Blockchain (ERC20, Tenderly)',
    'docs-origen': 'Docs-origen',
  };

  const partes = [];

  partes.push(`# Consolidación completa — Toda la información del workspace

**Documento único** que contiene el contenido de los **${filtrados.length}** archivos consolidados en \`docs/vitacora\`.

- **Generado:** ${new Date().toISOString()}
- **Fuente:** vitacora_inventario.json
- **Organización:** Por dominio y mtime (fecha de modificación)

---

## Índice

`);

  // Índice
  for (const dom of ordenDominios) {
    if (!porDominio[dom]) continue;
    partes.push(`### ${titulos[dom] || dom}\n`);
    for (const a of porDominio[dom]) {
      const rel = getRelPath(a.ruta);
      const anchor = rel.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-');
      partes.push(`- [${rel}](#${anchor})\n`);
    }
    partes.push('\n');
  }

  partes.push('---\n\n');

  // Contenido por dominio
  for (const dom of ordenDominios) {
    if (!porDominio[dom]) continue;
    partes.push(`\n\n# ${titulos[dom] || dom}\n\n`);
    partes.push('---\n\n');

    for (const a of porDominio[dom]) {
      const rel = getRelPath(a.ruta);
      partes.push(`\n## ${rel}\n\n`);
      partes.push(`*mtime: ${a.mtime || '—'} | tamaño: ${(a.size / 1024).toFixed(1)} KB*\n\n`);

      if (!fs.existsSync(a.ruta)) {
        partes.push('*Archivo no encontrado.*\n\n');
        continue;
      }

      let content;
      try {
        content = fs.readFileSync(a.ruta, 'utf8');
      } catch (e) {
        partes.push(`*Error al leer: ${e.message}*\n\n`);
        continue;
      }

      // Para .md no escapar #; para .json/.txt usar bloque de código si empieza con {
      const ext = path.extname(a.ruta).toLowerCase();
      if (ext === '.json' || (ext === '.txt' && content.trim().startsWith('{'))) {
        partes.push('```json\n');
        partes.push(content);
        partes.push('\n```\n\n');
      } else if (ext === '.log' || ext === '.txt') {
        partes.push('```\n');
        partes.push(content);
        partes.push('\n```\n\n');
      } else {
        partes.push(content);
        if (!content.endsWith('\n')) partes.push('\n');
        partes.push('\n');
      }
    }
  }

  const resultado = partes.join('');
  fs.writeFileSync(OUTPUT, resultado, 'utf8');
  console.log('Generado:', OUTPUT);
  console.log('Tamaño:', (resultado.length / 1024 / 1024).toFixed(2), 'MB');
  console.log('Archivos incluidos:', filtrados.length);
}

main();
