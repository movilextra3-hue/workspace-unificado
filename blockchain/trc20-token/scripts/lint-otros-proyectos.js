'use strict';
/**
 * ESLint sobre el resto de proyectos JS del workspace (sin exclusiones de carpetas con código).
 * Config: bank-tokenization/.eslintrc.cjs (Node estricto) o .eslintrc.cjs de trc20-token para legado.
 * Uso: node scripts/lint-otros-proyectos.js
 */
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const WORKSPACE_ROOT = path.resolve(__dirname, '..', '..', '..');
const TRC20_ESLINT = path.join(__dirname, '..', '.eslintrc.cjs');
const BANK_ESLINT = path.join(WORKSPACE_ROOT, 'blockchain', 'bank-tokenization', '.eslintrc.cjs');

/** Patrones glob desde la raíz del workspace; se omiten si la carpeta no existe. */
const POR_PATRON = [
  { dir: path.join(WORKSPACE_ROOT, 'blockchain', 'bank-tokenization'), pat: 'blockchain/bank-tokenization/**/*.js', config: BANK_ESLINT },
  { dir: path.join(WORKSPACE_ROOT, 'blockchain', 'usdtunified-polygon'), pat: 'blockchain/usdtunified-polygon/**/*.js', config: BANK_ESLINT }
];

const SOLANA = path.join(WORKSPACE_ROOT, 'solana', '555', 'enviar_sol.js');

let ok = true;

function run(fn) {
  try {
    fn();
  } catch {
    ok = false;
  }
}

for (const { dir, pat, config } of POR_PATRON) {
  if (!fs.existsSync(dir)) continue;
  run(() => {
    execSync(`npx eslint "${pat}" --config "${config}"`, { stdio: 'inherit', cwd: WORKSPACE_ROOT });
  });
}

if (fs.existsSync(SOLANA)) {
  run(() => {
    execSync(`npx eslint "${SOLANA}" --config "${TRC20_ESLINT}"`, { stdio: 'inherit', cwd: WORKSPACE_ROOT });
  });
}

process.exit(ok ? 0 : 1);
