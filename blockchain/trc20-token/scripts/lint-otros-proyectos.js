'use strict';
/**
 * Ejecuta ESLint sobre otros proyectos del workspace (solana/555, etc.) con la config de trc20-token.
 * Uso: node scripts/lint-otros-proyectos.js
 */
const { execSync } = require('child_process');
const path = require('path');

const WORKSPACE_ROOT = path.resolve(__dirname, '..', '..', '..');
const configPath = path.join(__dirname, '..', '.eslintrc.cjs');
const archivos = [
  path.join(WORKSPACE_ROOT, 'solana', '555', 'enviar_sol.js')
].filter((f) => require('fs').existsSync(f));

let ok = true;
for (const f of archivos) {
  try {
    execSync(`npx eslint "${f}" --config "${configPath}"`, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  } catch (_) {
    ok = false;
  }
}
process.exit(ok ? 0 : 1);
