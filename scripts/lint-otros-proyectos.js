'use strict';
/**
 * Ejecuta ESLint sobre otros proyectos (555, etc.) con la config de este repo.
 * En workspace-unificado usa solana/555; en Cursor-Workspace usa E:\555.
 * Uso: node scripts/lint-otros-proyectos.js
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const configPath = path.join(__dirname, '..', '.eslintrc.cjs');
// Rutas: si estamos en workspace-unificado, usar solana/555; si no, E:\555
const root = path.resolve(__dirname, '..', '..', '..');
const esUnificado = path.basename(root) === 'workspace-unificado';
const archivos = [
  esUnificado ? path.join(root, 'solana', '555', 'enviar_sol.js') : 'E:\\555\\enviar_sol.js'
].filter((f) => fs.existsSync(f));

let ok = true;
for (const f of archivos) {
  try {
    execSync(`npx eslint "${f}" --config "${configPath}"`, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  } catch (_) {
    ok = false;
  }
}
process.exit(ok ? 0 : 1);
