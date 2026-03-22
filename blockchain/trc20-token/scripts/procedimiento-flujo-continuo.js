#!/usr/bin/env node
'use strict';
/**
 * Orquesta el procedimiento establecido en pasos encadenados (una sola invocación npm).
 * Guarda checkpoint en procedimiento-flujo-checkpoint.json para retomar si falla un paso intermedio.
 *
 * Uso (desde blockchain/trc20-token):
 *   npm run flujo:continuo
 *   npm run flujo:continuo -- --resume        (continúa desde el último checkpoint)
 *   npm run flujo:continuo -- --from-step=gate:mainnet
 *   npm run flujo:continuo -- --reset         (borra checkpoint y ejecuta desde el inicio)
 *   npm run flujo:continuo -- --only-local    (solo lint + test; sin mainnet)
 *
 * Pasos manuales posteriores (OKLink/Tronscan) no se automatizan aquí; al final se imprimen recordatorios.
 */
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const CHECKPOINT_FILE = path.join(ROOT, 'procedimiento-flujo-checkpoint.json');

const STEPS = [
  { id: 'lint:js', npmScript: 'lint:js', desc: 'ESLint scripts' },
  { id: 'test', npmScript: 'test', desc: 'compile + test-artifacts' },
  { id: 'gate:mainnet', npmScript: 'gate:mainnet', desc: 'gate mainnet (cadena + bytecode + aviso Tronscan)' },
  { id: 'verify:implementation:pipeline', npmScript: 'verify:implementation:pipeline', desc: 'pipeline verificación implementation' }
];

function readCheckpoint() {
  if (!fs.existsSync(CHECKPOINT_FILE)) {
    return { completedIds: [], lastRun: null, lastError: null };
  }
  try {
    return JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf8'));
  } catch {
    return { completedIds: [], lastRun: null, lastError: null };
  }
}

function writeCheckpoint(data) {
  const payload = {
    ...data,
    updatedAt: new Date().toISOString(),
    project: 'trc20-token',
    stepsOrder: STEPS.map((s) => s.id)
  };
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(payload, null, 2), 'utf8');
}

function runNpm(script) {
  execSync(`npm run ${script}`, { cwd: ROOT, stdio: 'inherit', env: process.env, shell: true });
}

function parseArgs() {
  const argv = process.argv.slice(2);
  return {
    resume: argv.includes('--resume'),
    reset: argv.includes('--reset'),
    onlyLocal: argv.includes('--only-local'),
    fromStep: (() => {
      const m = argv.find((a) => a.startsWith('--from-step='));
      return m ? m.split('=')[1].trim() : null;
    })()
  };
}

function main() {
  const opts = parseArgs();
  let cp = readCheckpoint();

  if (opts.reset) {
    cp = { completedIds: [], lastRun: null, lastError: null };
    if (fs.existsSync(CHECKPOINT_FILE)) fs.unlinkSync(CHECKPOINT_FILE);
    console.log('[flujo:continuo] Checkpoint reiniciado.\n');
  }

  let startIndex = 0;
  const stepsToRun = opts.onlyLocal ? STEPS.filter((s) => s.id === 'lint:js' || s.id === 'test') : STEPS;

  if (opts.fromStep) {
    const idx = stepsToRun.findIndex((s) => s.id === opts.fromStep);
    if (idx < 0) {
      console.error('Paso desconocido:', opts.fromStep, '| Válidos:', stepsToRun.map((s) => s.id).join(', '));
      process.exit(1);
    }
    startIndex = idx;
  } else if (opts.resume && cp.completedIds && cp.completedIds.length > 0) {
    const lastOk = cp.completedIds[cp.completedIds.length - 1];
    const idxLast = stepsToRun.findIndex((s) => s.id === lastOk);
    startIndex = idxLast >= 0 ? idxLast + 1 : 0;
    console.log('[flujo:continuo] Reanudando tras paso completado:', lastOk, '→ índice', startIndex, '\n');
  }

  console.log('=== FLUJO CONTINUO — procedimiento trc20-token ===');
  console.log('Fecha:', new Date().toISOString());
  if (opts.onlyLocal) {
    console.log('Modo: --only-local (sin mainnet; no escribe checkpoint para no pisar un flujo completo)\n');
  }

  const completed = [...(cp.completedIds || [])].filter((id) => stepsToRun.some((s) => s.id === id));
  const persistCheckpoint = !opts.onlyLocal;

  for (let i = startIndex; i < stepsToRun.length; i++) {
    const step = stepsToRun[i];
    console.log(`\n--- Paso ${i + 1}/${stepsToRun.length}: ${step.id} (${step.desc}) ---\n`);
    try {
      runNpm(step.npmScript);
      if (!completed.includes(step.id)) completed.push(step.id);
      if (persistCheckpoint) {
        writeCheckpoint({
          completedIds: completed,
          lastRun: step.id,
          lastError: null
        });
      }
    } catch (e) {
      const msg = e && e.message ? e.message : String(e);
      if (persistCheckpoint) {
        writeCheckpoint({
          completedIds: completed,
          lastRun: step.id,
          lastError: msg
        });
      }
      console.error('\n[flujo:continuo] Falló:', step.id);
      console.error('Checkpoint guardado en:', CHECKPOINT_FILE);
      console.error('Para reanudar tras corregir: npm run flujo:continuo -- --resume');
      console.error('O desde este paso: npm run flujo:continuo -- --from-step=' + step.id);
      process.exit(1);
    }
  }

  if (persistCheckpoint) {
    writeCheckpoint({
      completedIds: completed,
      lastRun: stepsToRun[stepsToRun.length - 1].id,
      lastError: null
    });
  }

  console.log('\n=== FLUJO CONTINUO: COMPLETADO (pasos automáticos) ===\n');
  console.log('Siguientes pasos suelen ser MANUALES (otra ventana / explorador):');
  console.log('  - Verificación OKLink / Tronscan: verification/PAQUETE-VERIFICACION-POST-UPGRADE/ y VERIFICAR_AHORA.txt');
  console.log('  - Tras enviar en explorador: npm run check:oklink');
  console.log('  - Cierre estricto en cadena: npm run gate:mainnet:strict (cuando impl verificada)');
  console.log('');
}

try {
  main();
} catch (e) {
  console.error(e.message || e);
  process.exit(1);
}
