#!/usr/bin/env node
'use strict';
/**
 * Ejecuta Ruff sobre los proyectos Python (apps RTSP).
 * Si Ruff no está instalado, imprime aviso y sale con 0 (no rompe npm run check).
 * Usa `python.defaultInterpreterPath` de `.vscode/settings.json` si existe (evita stub de Windows Store).
 * Uso: node scripts/lint-python.js
 */
const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const cwd = path.join(__dirname, '..');
const configPath = path.join(cwd, 'pyproject.toml');

function getPythonFromWorkspaceSettings() {
  const p = path.join(cwd, '.vscode', 'settings.json');
  try {
    const raw = fs.readFileSync(p, 'utf8');
    const j = JSON.parse(raw);
    const v = j['python.defaultInterpreterPath'];
    if (v && typeof v === 'string') {
      const normalized = path.normalize(v);
      if (fs.existsSync(normalized)) return normalized;
    }
  } catch {
    // Intérprete o JSON no disponible: se prueban otros métodos en ruffAvailable().
  }
  return null;
}

function getRuffExeNextToPython(py) {
  if (!py || process.platform !== 'win32') return null;
  const scripts = path.join(path.dirname(py), 'Scripts', 'ruff.exe');
  return fs.existsSync(scripts) ? scripts : null;
}

function ruffAvailable() {
  try {
    execFileSync('ruff', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    // ruff no está en PATH; se prueba intérprete del workspace.
  }
  const py = getPythonFromWorkspaceSettings();
  const ruffExe = getRuffExeNextToPython(py);
  if (ruffExe) {
    try {
      execFileSync(ruffExe, ['--version'], { stdio: 'ignore' });
      return true;
    } catch {
      // ruff.exe existe pero no responde; se prueba python -m ruff.
    }
  }
  if (py) {
    try {
      execFileSync(py, ['-m', 'ruff', '--version'], { stdio: 'ignore' });
      return true;
    } catch {
      // -m ruff falla con este intérprete; se prueban otros comandos.
    }
  }
  for (const cmd of ['python', 'python3', 'py']) {
    try {
      execFileSync(cmd, ['-m', 'ruff', '--version'], { stdio: 'ignore', shell: process.platform === 'win32' });
      return true;
    } catch {
      // Este comando no expone ruff; se prueba el siguiente.
    }
  }
  return false;
}

function runRuff() {
  const args = ['check', 'apps/', '--config', configPath];
  let r = spawnSync('ruff', args, { stdio: 'inherit', cwd });
  if (r.status !== null && r.status !== undefined) return r.status;

  const py = getPythonFromWorkspaceSettings();
  const ruffExe = getRuffExeNextToPython(py);
  if (ruffExe) {
    r = spawnSync(ruffExe, args, { stdio: 'inherit', cwd });
    if (r.status !== null && r.status !== undefined) return r.status;
  }
  if (py) {
    r = spawnSync(py, ['-m', 'ruff', ...args], { stdio: 'inherit', cwd });
    if (r.status !== null && r.status !== undefined) return r.status;
  }
  r = spawnSync('python', ['-m', 'ruff', ...args], { stdio: 'inherit', cwd, shell: process.platform === 'win32' });
  if (r.status !== null && r.status !== undefined) return r.status;
  r = spawnSync('python3', ['-m', 'ruff', ...args], { stdio: 'inherit', cwd });
  return r.status === null || r.status === undefined ? 1 : r.status;
}

if (!ruffAvailable()) {
  console.log('Ruff no instalado. Para lint Python: pip install ruff');
  console.log('Omitiendo lint:py.');
  process.exit(0);
}

process.exit(runRuff());
