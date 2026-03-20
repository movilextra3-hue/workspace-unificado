#!/usr/bin/env node
'use strict';
/**
 * Ejecuta Ruff sobre los proyectos Python (apps RTSP).
 * Si Ruff no está instalado, imprime aviso y sale con 0 (no rompe npm run check).
 * Uso: node scripts/lint-python.js
 */
const { execSync, spawnSync } = require('node:child_process');
const path = require('node:path');

const APPS = path.join(__dirname, '..', 'apps');
const configPath = path.join(__dirname, '..', 'pyproject.toml');

function runRuff() {
  const cwd = path.join(__dirname, '..');
  const args = ['check', 'apps/', '--config', configPath];
  let r = spawnSync('ruff', args, { stdio: 'inherit', cwd });
  if (r.status !== null) return r.status;
  r = spawnSync('python', ['-m', 'ruff', ...args], { stdio: 'inherit', cwd });
  if (r.status !== null) return r.status;
  r = spawnSync('python3', ['-m', 'ruff', ...args], { stdio: 'inherit', cwd });
  return r.status === null ? 1 : r.status;
}

function ruffAvailable() {
  try {
    execSync('ruff --version', { stdio: 'ignore' });
    return true;
  } catch (_) {
    try {
      execSync('python -m ruff --version', { stdio: 'ignore' });
      return true;
    } catch (_) {
      return false;
    }
  }
}

if (!ruffAvailable()) {
  console.log('Ruff no instalado. Para lint Python: pip install ruff');
  console.log('Omitiendo lint:py.');
  process.exit(0);
}

process.exit(runRuff());
