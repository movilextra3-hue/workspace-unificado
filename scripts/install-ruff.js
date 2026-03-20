#!/usr/bin/env node
'use strict';
/**
 * Instala Ruff para lint Python (apps RTSP).
 * No falla si Python/pip no está disponible.
 * Uso: node scripts/install-ruff.js
 */
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const root = path.join(__dirname, '..');
const r = spawnSync('pip', ['install', '-q', 'ruff'], {
  cwd: root,
  stdio: 'pipe',
  shell: true
});
if (r.status === 0) {
  console.log('Ruff instalado (lint Python).');
} else if (r.stderr?.toString().includes('not found') || r.error) {
  /* Python/pip no disponible; omitir */
} else {
  console.warn('Ruff no instalado. Para lint Python: pip install ruff');
}
