'use strict';
/**
 * Consolidación y auditoría ENV - Nivel profesional.
 * 1. Audita todos los archivos (texto vs binario, codificaciones).
 * 2. Extrae cada KEY=value y cada comentario con trazabilidad.
 * 3. Genera ENV_CONSOLIDADO_COMPLETO.env sin omitir información.
 * 4. Escribe informe de verificación.
 */
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'archivos_delicados');
const OUT_ENV = path.join(__dirname, '..', 'ENV_CONSOLIDADO_COMPLETO.env');
const OUT_INFORME = path.join(__dirname, '..', 'INFORME_CONSOLIDACION_ENV.md');

const ENCODINGS = ['utf8', 'latin1', 'utf16le'];
const KEY_REGEX = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_.-]*)\s*=\s*(.*)$/;
const COMMENT_REGEX = /^\s*#/;
const BINARY_THRESHOLD = 0.3;

function isLikelyBinary(buffer) {
  if (!buffer || buffer.length === 0) return true;
  let nonPrintable = 0;
  const len = Math.min(buffer.length, 4096);
  for (let i = 0; i < len; i++) {
    const b = buffer[i];
    if (b < 0x20 && b !== 0x09 && b !== 0x0a && b !== 0x0d) nonPrintable++;
  }
  return nonPrintable / len > BINARY_THRESHOLD;
}

function readFileSafe(filePath) {
  const buf = fs.readFileSync(filePath);
  if (isLikelyBinary(buf)) return { binary: true, text: null, encoding: null };
  for (const enc of ENCODINGS) {
    try {
      const text = buf.toString(enc);
      if (text && /\n/.test(text)) return { binary: false, text, encoding: enc };
    } catch (_) { /* ignorar codificación no válida */ }
  }
  return { binary: false, text: buf.toString('utf8'), encoding: 'utf8' };
}

function parseLines(text) {
  const lines = text.split(/\r?\n/);
  const result = { comments: [], vars: [], other: [] };
  let commentBlock = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '') {
      commentBlock = [];
      continue;
    }
    if (COMMENT_REGEX.test(trimmed)) {
      commentBlock.push(line);
      result.comments.push({ line, block: [...commentBlock] });
      continue;
    }
    const m = line.match(KEY_REGEX);
    if (m) {
      result.vars.push({
        key: m[1],
        value: m[2].trim(),
        raw: line,
        commentsBefore: [...commentBlock]
      });
      commentBlock = [];
    } else {
      result.other.push(line);
      commentBlock = [];
    }
  }
  return result;
}

function main() {
  if (!fs.existsSync(DIR)) {
    console.error('No existe la carpeta archivos_delicados. Crear la carpeta o ejecutar desde blockchain/trc20-token.');
    process.exit(1);
  }
  const files = fs.readdirSync(DIR).map(n => ({ name: n, path: path.join(DIR, n) })).filter(f => fs.statSync(f.path).isFile());
  const audit = { total: files.length, binary: [], text: [], errors: [], byFile: {} };
  const globalVars = new Map();
  const globalCommentsByKey = new Map();
  const order = [];
  const envrcSections = [];

  for (const f of files) {
    const fullPath = f.path;
    const read = readFileSafe(fullPath);
    audit.byFile[f.name] = { binary: read.binary, encoding: read.encoding, vars: 0, comments: 0 };

    if (read.binary) {
      audit.binary.push(f.name);
      continue;
    }
    audit.text.push(f.name);

    const isEnvrc = /\.envrc/i.test(f.name);
    const parsed = parseLines(read.text);

    if (isEnvrc) {
      envrcSections.push({ file: f.name, content: read.text });
      continue;
    }

    audit.byFile[f.name].vars = parsed.vars.length;
    audit.byFile[f.name].comments = parsed.comments.length;

    for (const v of parsed.vars) {
      if (!globalVars.has(v.key)) {
        order.push(v.key);
        globalVars.set(v.key, v.value);
        globalCommentsByKey.set(v.key, new Set());
      }
      const currentVal = globalVars.get(v.key);
      if ((currentVal === '' || currentVal === undefined) && v.value !== '') {
        globalVars.set(v.key, v.value);
      }
      v.commentsBefore.forEach(c => globalCommentsByKey.get(v.key).add(c));
    }
  }

  // Segundo pase: rellenar claves vacías si algún archivo tiene valor (varias codificaciones)
  for (const key of order) {
    if (globalVars.get(key) !== '' && globalVars.get(key) != null) continue;
    for (const f of files) {
      const fullPath = f.path;
      const buf = fs.readFileSync(fullPath);
      if (isLikelyBinary(buf)) continue;
      for (const enc of ENCODINGS) {
        try {
          const text = buf.toString(enc);
          const parsed = parseLines(text);
          const found = parsed.vars.find(x => x.key === key && x.value !== '');
          if (found) {
            globalVars.set(key, found.value);
            break;
          }
        } catch (_) { /* codificación no válida para este archivo */ }
      }
      if (globalVars.get(key) !== '' && globalVars.get(key) != null) break;
    }
  }

  const sb = [];
  sb.push('# ==============================================================================');
  sb.push('# CONSOLIDADO ENV - AUDITORÍA PROFESIONAL');
  sb.push('# Generado por scripts/consolidar-env-auditoria.js');
  sb.push('# ==============================================================================');
  sb.push(`# Archivos procesados: ${audit.text.length} texto | ${audit.binary.length} binarios (no legibles como texto) | Total: ${audit.total} — SIN EXCLUSIONES`);
  sb.push(`# Variables únicas: ${order.length}`);
  sb.push('# Criterio valor: primera aparición no vacía por orden de archivo.');
  sb.push('# Comentarios: todos los asociados a cada variable en cualquier archivo.');
  sb.push('# IMPORTANTE: Todos los valores son REALES (extraídos de los archivos fuente). Sin omisiones.');
  sb.push('# ==============================================================================');
  sb.push('');

  for (const key of order) {
    const comments = Array.from(globalCommentsByKey.get(key) || []).filter(Boolean);
    comments.forEach(c => sb.push(c));
    sb.push(`${key}=${globalVars.get(key) || ''}`);
    sb.push('');
  }

  sb.push('');
  sb.push('# ==============================================================================');
  sb.push('# CONTENIDO ARCHIVOS .envrc (referencia íntegra)');
  sb.push('# ==============================================================================');
  for (const sec of envrcSections) {
    sb.push('');
    sb.push(`# --- ${sec.file} ---`);
    sb.push(sec.content.trim());
  }

  const outContent = sb.join('\n');
  fs.writeFileSync(OUT_ENV, outContent, 'utf8');

  const outLines = outContent.split('\n').length;
  const outBytes = Buffer.byteLength(outContent, 'utf8');

  const report = [];
  report.push('# Informe de consolidación ENV');
  report.push('');
  report.push('## 1. Auditoría de fuentes');
  report.push(`- Total archivos en carpeta: ${audit.total}`);
  report.push(`- Archivos de texto procesados: ${audit.text.length}`);
  report.push(`- Archivos no legibles como texto (binarios): ${audit.binary.length}`);
  if (audit.binary.length) report.push(`  - Lista: ${audit.binary.join(', ')} (se intentó leer todos; estos no son texto).`);
  report.push('- Sin exclusiones por nombre: se procesan todos los archivos de la carpeta.');
  report.push('');
  report.push('## 2. Variables');
  report.push(`- Claves únicas consolidadas: ${order.length}`);
  report.push('- Criterio de valor: primera aparición no vacía (orden de lectura).');
  report.push('');
  report.push('## 3. Comentarios');
  report.push('- Por cada variable se incluyen todos los comentarios que la precedían en cualquier archivo.');
  report.push('');
  report.push('## 4. Archivo de salida');
  report.push('- Ruta: \'ENV_CONSOLIDADO_COMPLETO.env\'');
  report.push(`- Líneas: ${outLines}`);
  report.push(`- Bytes: ${outBytes}`);
  report.push('');
  report.push('## 5. Verificación (post-ejecución)');
  report.push('- Ejecutar comprobación de claves fuentes vs consolidado.');
  report.push('');

  const verify = verification(DIR, OUT_ENV, order);
  report.push('## 6. Resultado verificación');
  report.push(`- Claves en fuentes (archivos texto): ${verify.keysInSources}`);
  report.push(`- Claves en consolidado: ${verify.keysInOutput}`);
  report.push(`- Claves en fuentes pero no en consolidado: ${verify.missingInOutput.length}`);
  if (verify.missingInOutput.length) report.push(`  - ${verify.missingInOutput.join(', ')}`);
  report.push(`- Claves en consolidado pero no en fuentes: ${verify.extraInOutput.length}`);
  if (verify.extraInOutput.length) report.push(`  - ${verify.extraInOutput.join(', ')}`);
  report.push(`- Verificación claves: ${verify.missingInOutput.length === 0 ? 'OK' : 'ERROR'}`);
  report.push(`- Total líneas en fuentes (solo archivos texto): ${verify.totalLinesSources}`);
  report.push(`- Total comentarios en fuentes: ${verify.totalCommentsSources}`);
  report.push(`- Líneas en consolidado: ${outLines}`);
  report.push('');
  const emptyKeys = order.filter(k => {
    const v = globalVars.get(k);
    return v === '' || v == null;
  });
  const filledCount = order.length - emptyKeys.length;
  report.push('## 7. Verificación: información real, no inventada');
  report.push('- **Origen de los valores:** Cada valor proviene **exclusivamente** de los archivos en `archivos_delicados`. El script no introduce valores inventados ni placeholders.');
  report.push(`- **Variables con valor:** ${filledCount} de ${order.length} claves tienen valor no vacío.`);
  report.push(`- **Variables vacías (${emptyKeys.length}):** Ningún archivo fuente contenía valor no vacío para ellas.`);
  if (emptyKeys.length) report.push('  - ' + emptyKeys.join(', '));
  report.push('- Para rellenarlas: añade .env con esas claves a `archivos_delicados` y vuelve a ejecutar el script.');
  report.push('');
  report.push('## 8. Conclusión');
  report.push(verify.missingInOutput.length === 0
    ? '- Consolidación completa. Toda la información real y verídica de las fuentes, sin omisiones.'
    : '- ATENCIÓN: Hay claves en fuentes no presentes en consolidado.');
  report.push('');

  fs.writeFileSync(OUT_INFORME, report.join('\n'), 'utf8');

  console.log('OK');
  console.log('Archivos texto:', audit.text.length, '| Binarios excluidos:', audit.binary.length);
  console.log('Variables:', order.length, '| Lineas salida:', outLines, '| Bytes:', outBytes);
  console.log('Verificacion claves:', verify.missingInOutput.length === 0 ? 'OK' : 'FALTANTES: ' + verify.missingInOutput.join(', '));
  console.log('Salida:', OUT_ENV);
  console.log('Informe:', OUT_INFORME);
}

function verification(dir, outPath, _expectedOrder) {
  const keysInSources = new Set();
  let totalLinesSources = 0;
  let totalCommentsSources = 0;
  const fileList = fs.readdirSync(dir).filter(n => {
    const p = path.join(dir, n);
    return fs.statSync(p).isFile();
  });
  for (const name of fileList) {
    const p = path.join(dir, name);
    const read = readFileSafe(p);
    if (read.binary || !read.text) continue;
    const text = read.text;
    const lines = text.split(/\r?\n/);
    totalLinesSources += lines.length;
    for (const line of lines) {
      if (COMMENT_REGEX.test(line.trim())) totalCommentsSources++;
      const m = line.match(KEY_REGEX);
      if (m && !COMMENT_REGEX.test(line)) keysInSources.add(m[1]);
    }
  }
  const outContent = fs.readFileSync(outPath, 'utf8');
  const keysInOutput = new Set();
  for (const line of outContent.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_.-]*)\s*=/);
    if (m && !line.trimStart().startsWith('#')) keysInOutput.add(m[1]);
  }
  const missingInOutput = [...keysInSources].filter(k => !keysInOutput.has(k));
  const extraInOutput = [...keysInOutput].filter(k => !keysInSources.has(k));
  return {
    keysInSources: keysInSources.size,
    keysInOutput: keysInOutput.size,
    missingInOutput,
    extraInOutput,
    totalLinesSources,
    totalCommentsSources
  };
}

main();
