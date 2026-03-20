#!/usr/bin/env node
'use strict';
/**
 * Pre-flight: comprobaciones antes de ejecutar procedimientos críticos.
 * Evita fallos recurrentes documentados en PREVENCION_FALLOS (vitácora).
 * Uso: node scripts/preflight.js [--check|--before-deploy|--before-verify]
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

function log(msg, ok) {
  const icon = ok ? '✓' : '✗';
  console.log(`  ${icon} ${msg}`);
}

function run(cmd, cwd = ROOT) {
  try {
    execSync(cmd, { cwd, stdio: 'pipe', encoding: 'utf8' });
    return true;
  } catch {
    return false;
  }
}

let failed = 0;

// 1. JSON válidos (evitar BOM, parse errors)
console.log('\n[Preflight] JSON válidos');
try {
  const fixBom = run('node scripts/fix-json-bom.js');
  if (!fixBom) throw new Error('fix-json-bom falló');
  const checkTodo = run('node scripts/check-todo.js');
  if (!checkTodo) {
    log('check-todo.js detectó JSON inválidos', false);
    failed++;
  } else {
    log('JSON válidos', true);
  }
} catch (e) {
  log('Comprobación JSON fallida: ' + e.message, false);
  failed++;
}

// 2. No usar eslint-disable para reglas SonarLint inexistentes en ESLint
console.log('\n[Preflight] ESLint / SonarLint');
const trc20Scripts = path.join(ROOT, 'blockchain', 'trc20-token', 'scripts');
if (fs.existsSync(trc20Scripts)) {
  const files = fs.readdirSync(trc20Scripts).filter((f) => f.endsWith('.js'));
  for (const f of files) {
    const content = fs.readFileSync(path.join(trc20Scripts, f), 'utf8');
    if (content.includes('sonarjs/prefer-top-level-await') && content.includes('eslint-disable')) {
      log(`Evitar eslint-disable sonarjs/* en ${f} (regla no existe en ESLint)`, false);
      failed++;
    }
  }
  if (failed === 0) log('Sin eslint-disable sonarjs/* incorrectos', true);
}

// 3. Compilador TRC20 alineado (0.8.25)
console.log('\n[Preflight] Config compilador TRC20');
const configPath = path.join(ROOT, 'blockchain', 'trc20-token', 'config', 'trc20-networks.js');
if (fs.existsSync(configPath)) {
  const content = fs.readFileSync(configPath, 'utf8');
  const has025 = /0\.8\.25|version:\s*['\"]0\.8\.25['\"]/.test(content);
  log('Compilador 0.8.25 en config TRC20', has025);
  if (!has025) failed++;
}

// 4. Lint básico (evita fallos de check)
console.log('\n[Preflight] Lint');
const lintOk = run('npm run lint -w trc20-token', ROOT);
log('Lint trc20-token', lintOk);
if (!lintOk) failed++;

if (failed > 0) {
  console.log('\n[Preflight] Fallos:', failed, '- Corregir antes de proceder.');
  process.exit(1);
}
console.log('\n[Preflight] OK — listo para proceder.\n');
process.exit(0);
