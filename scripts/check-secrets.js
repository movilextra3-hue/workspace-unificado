#!/usr/bin/env node
'use strict';
/**
 * Escaneo local de patrones de alto riesgo en archivos rastreados por Git.
 * No sustituye gitleaks/trufflehog ni auditoría del SO; complementa CI.
 * Uso: node scripts/check-secrets.js
 */
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const MAX_BYTES = 5 * 1024 * 1024;

const SKIP_PATH_PARTS = [
  'node_modules',
  path.join('tools', 'binary'),
  '.git',
];

const SKIP_EXT = new Set([
  '.exe', '.dll', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.pdf',
  '.zip', '.7z', '.rar', '.tar', '.gz', '.woff', '.woff2', '.ttf', '.eot',
  '.mp4', '.mp3', '.bin', '.wasm', '.so', '.dylib',
]);

/** Regex de filas con alta probabilidad de secreto real (no solo la palabra "password"). */
const LINE_RULES = [
  { name: 'GitHub PAT (classic)', re: /\bghp_[A-Za-z0-9]{36,}\b/ },
  { name: 'GitHub fine-grained', re: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/ },
  { name: 'GitHub OAuth (gho/ ghu/ ghs/)', re: /\bgh[ous]_[A-Za-z0-9]{36,}\b/ },
  { name: 'AWS Access Key ID', re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/ },
  { name: 'OpenAI-style sk-', re: /\bsk-[A-Za-z0-9]{20,}\b/ },
  { name: 'Slack bot token', re: /\bxox[baprs]-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{20,}\b/ },
  { name: 'Stripe live key', re: /\bsk_live_[0-9a-zA-Z]{20,}\b/ },
];

const PEM_START = /-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/;

function shouldSkipRel(rel) {
  const relNorm = rel.replaceAll('\\', '/');
  for (const p of SKIP_PATH_PARTS) {
    if (relNorm.includes(p.replaceAll('\\', '/'))) return true;
  }
  return SKIP_EXT.has(path.extname(rel).toLowerCase());
}

function listTrackedFiles() {
  const out = execSync('git ls-files -z', { cwd: ROOT, encoding: 'buffer' });
  const parts = out.toString('utf8').split('\0').filter(Boolean);
  return parts;
}

function scanFile(absPath, rel) {
  const st = fs.statSync(absPath);
  if (!st.isFile() || st.size > MAX_BYTES) return { hits: [] };
  const buf = fs.readFileSync(absPath);
  if (buf.includes(0)) return { hits: [] }; // binario
  const text = buf.toString('utf8');
  const hits = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((line, idx) => {
    for (const { name, re } of LINE_RULES) {
      if (re.test(line)) {
        hits.push({ line: idx + 1, rule: name, rel });
      }
    }
    if (PEM_START.test(line)) {
      hits.push({ line: idx + 1, rule: 'PEM private key', rel });
    }
  });
  return { hits };
}

function main() {
  let tracked;
  try {
    tracked = listTrackedFiles();
  } catch (_e) {
    console.error('No se pudo ejecutar git ls-files. ¿Estás en el repo raíz?');
    process.exitCode = 2;
    return;
  }

  const allHits = [];
  for (const rel of tracked) {
    if (shouldSkipRel(rel)) continue;
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) continue;
    const { hits } = scanFile(abs, rel);
    allHits.push(...hits);
  }

  if (allHits.length) {
    console.error('\n[check-secrets] Posibles secretos detectados:\n');
    for (const h of allHits) {
      console.error(`  ${h.rel}:${h.line} — ${h.rule}`);
    }
    console.error('\nRevisa si son datos reales; si no, ajusta el archivo o añade exclusión documentada.\n');
    process.exitCode = 1;
    return;
  }

  console.log('[check-secrets] OK — sin coincidencias de patrones de alto riesgo en archivos rastreados (excl. binarios y herramientas).');
}

main();
