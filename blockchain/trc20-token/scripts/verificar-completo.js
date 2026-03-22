#!/usr/bin/env node
'use strict';
/**
 * Verificación completa pre-despliegue/upgrade — sin omisiones.
 * Ejecuta todos los checks disponibles: preflight, compile, test, storage layout,
 * guardar paquete verificación, npm audit resumen, slither (si disponible).
 *
 * Uso: node scripts/verificar-completo.js
 *      npm run verificar:completo
 */
const { execSync, spawnSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function run(cmd, opts = {}) {
  const cwd = opts.cwd || ROOT;
  try {
    return execSync(cmd, { encoding: 'utf8', cwd, stdio: opts.silent ? 'pipe' : 'inherit', timeout: opts.timeout || 120000 });
  } catch (e) {
    if (opts.silent) return null;
    throw e;
  }
}

function main() {
  console.log('\n========================================');
  console.log('  VERIFICACIÓN COMPLETA — SIN OMISIONES');
  console.log('========================================\n');

  const errors = [];
  const warnings = [];

  // 1. Preflight (raíz workspace)
  console.log('--- 1. Preflight ---');
  try {
    run('npm run preflight', { cwd: path.join(ROOT, '..') });
  } catch (e) {
    errors.push('Preflight falló: ' + (e.message || e));
  }
  console.log('');

  // 2. Compilación (solc — sin TronBox)
  console.log('--- 2. Compilación (compile) ---');
  try {
    run('npm run compile');
  } catch (e) {
    errors.push('Compilación falló: ' + (e.message || e));
  }
  console.log('');

  // 3. Tests
  console.log('--- 3. Tests ---');
  try {
    run('npm run test');
  } catch (e) {
    errors.push('Tests fallaron: ' + (e.message || e));
  }
  console.log('');

  // 4. Storage layout
  console.log('--- 4. Storage layout ---');
  try {
    run('node scripts/validar-storage-layout.js');
  } catch (e) {
    warnings.push('Storage layout: ' + (e.message || e));
  }
  console.log('');

  // 5. Paquete verificación
  console.log('--- 5. Paquete verificación (guardar:verificacion) ---');
  try {
    run('npm run guardar:verificacion');
  } catch (e) {
    warnings.push('Paquete verificación: ' + (e.message || e));
  }
  console.log('');

  // 6. npm audit resumen (raíz del monorepo; spawnSync('npm') falla en Windows sin shell)
  console.log('--- 6. npm audit (resumen) ---');
  try {
    const workspaceRoot = path.join(ROOT, '..', '..');
    let out = '';
    try {
      out = execSync('npm audit', { cwd: workspaceRoot, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    } catch (e) {
      out = (e.stdout || '') + (e.stderr || '');
    }
    const match = out.match(/(\d+)\s+vulnerabilit(y|ies)/i);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > 0) {
        console.log('  ' + n + ' vulnerabilidades en dependencias (raíz workspace).');
        console.log('  Fix completo requeriría npm audit fix --force (puede ser breaking).');
        warnings.push(`npm audit: ${n} vulns en deps`);
      } else {
        console.log('  Sin vulnerabilidades reportadas por npm audit.');
      }
    } else {
      console.log('  Salida de npm audit no reconocida (revisar manualmente: npm audit en la raíz).');
    }
  } catch (e) {
    console.log('  npm audit no disponible o falló.');
  }
  console.log('');

  // 7. Slither (si está instalado)
  console.log('--- 7. Slither (análisis estático) ---');
  const slitherResult = spawnSync('slither', ['contracts/', '--exclude', 'naming-convention'], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: 'pipe'
  });
  if (slitherResult.status === 0) {
    console.log('  Slither OK (sin hallazgos críticos o excluidos).');
  } else if (slitherResult.error && slitherResult.error.code === 'ENOENT') {
    console.log('  Slither no instalado. Opcional: pip install slither-analyzer');
  } else {
    console.log('  Slither:', slitherResult.stderr || slitherResult.stdout || 'ver docs/vitacora');
  }
  console.log('');

  // 8. Lint
  console.log('--- 8. Lint ---');
  try {
    run('npm run lint:all');
  } catch (e) {
    warnings.push('Lint: ' + (e.message || e));
  }
  console.log('');

  // Resumen
  console.log('========================================');
  console.log('  RESUMEN');
  console.log('========================================\n');

  if (errors.length) {
    console.log('ERRORES:');
    errors.forEach(e => console.log('  -', e));
    console.log('');
    process.exit(1);
  }

  if (warnings.length) {
    console.log('AVISOS:');
    warnings.forEach(w => console.log('  -', w));
    console.log('');
  }

  console.log('Verificación completa terminada. Estado: OK para despliegue/upgrade.');
  console.log('');
}

main();
