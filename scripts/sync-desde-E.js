#!/usr/bin/env node
'use strict';
/**
 * Sincroniza el workspace unificado copiando desde las ubicaciones actuales en E:
 * Ejecutar desde E:\workspace-unificado: node scripts/sync-desde-E.js
 * Opción --dry-run: solo muestra qué se copiaría, sin escribir.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DRY_RUN = process.argv.includes('--dry-run');
const ROOT = path.resolve(__dirname, '..');
const E = 'E:\\';

const COPY = [
  {
    name: 'blockchain/trc20-token',
    from: path.join(E, 'Cursor-Workspace', 'trc20-token'),
    exclude: ['node_modules', 'build', '.env', 'archivos_delicados', 'ENV_CONSOLIDADO_COMPLETO.env', 'INFORME_CONSOLIDACION_ENV.md'],
  },
  {
    name: 'blockchain/token-erc20',
    from: path.join(E, 'ethereum-api-quickstart', 'token'),
    exclude: ['node_modules', 'build', '.env'],
  },
  {
    name: 'blockchain/tenderly_tools',
    from: path.join(E, 'ethereum-api-quickstart', 'tenderly_tools'),
    exclude: ['node_modules'],
  },
  {
    name: 'solana/555',
    from: path.join(E, '555'),
    exclude: ['node_modules'],
  },
  {
    name: 'apps/rtsp-virtual-webcam',
    from: path.join(E, 'rtsp-virtual-webcam'),
    exclude: ['venv', '.mypy_cache'],
  },
  {
    name: 'apps/rtsp-webcam',
    from: path.join(E, 'rtsp-webcam'),
    exclude: ['venv', '.mypy_cache', 'audio_hls', 'hls_output'],
  },
];

function shouldExclude(relPath, exclude) {
  const parts = relPath.split(path.sep);
  return exclude.some((ex) => parts.includes(ex));
}

function copyDir(src, dest, exclude) {
  if (!fs.existsSync(src)) {
    console.warn('Origen no existe:', src);
    return;
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const ent of entries) {
    const srcPath = path.join(src, ent.name);
    const rel = path.relative(src, srcPath);
    const destPath = path.join(dest, ent.name);
    if (shouldExclude(rel, exclude)) continue;
    if (ent.isDirectory()) {
      if (!DRY_RUN) fs.mkdirSync(destPath, { recursive: true });
      copyDir(srcPath, destPath, exclude);
    } else {
      if (DRY_RUN) {
        console.log('[dry-run] copiar:', srcPath, '->', destPath);
      } else {
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}

function main() {
  console.log(DRY_RUN ? '--- DRY RUN (no se escribe nada) ---' : '--- Sincronizando desde E: ---');
  for (const { name, from, exclude } of COPY) {
    const dest = path.join(ROOT, name);
    console.log('\n' + name + ': ' + from + ' -> ' + dest);
    if (!fs.existsSync(from)) {
      console.warn('  Origen no encontrado, se omite.');
      continue;
    }
    if (DRY_RUN) {
      copyDir(from, dest, exclude);
    } else {
      if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
      copyDir(from, dest, exclude);
    }
  }
  if (!DRY_RUN) {
    try {
      execSync('node scripts/fix-json-bom.js', { cwd: ROOT, stdio: 'inherit' });
    } catch (_) {
      // ignore if fix-json-bom fails (e.g. no JSON with BOM)
    }
  }
  console.log('\n' + (DRY_RUN ? 'Dry run terminado.' : 'Sincronización terminada.'));
}

main();
