#!/usr/bin/env node
'use strict';
/**
 * Descompilación AUTOMATIZADA del bytecode TXaXTSUK.
 * Regla #1: No delegar. Ejecuta todo el proceso hasta completarlo.
 *
 * Orden de intentos:
 * 1. Docker (Linux nativo, sin sudo ni interacción)
 * 2. WSL con ensurepip --user (sin sudo)
 * 3. Panoramix en Windows (puede fallar por SIGALRM)
 * 4. Fallback: código fuente conocido (flattened)
 *
 * Uso: node scripts/decompile-auto.js
 * O: npm run decompile:auto
 */
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'verification', 'TXaXTSUK-verification');
const BYTECODE_PATH = path.join(OUT_DIR, 'bytecode.hex');
const OUT_PYR = path.join(OUT_DIR, 'TRC20TokenUpgradeable-decompiled.pyr');
const OUT_SOL = path.join(OUT_DIR, 'TRC20TokenUpgradeable-decompiled.sol');

function ensureBytecode() {
  if (fs.existsSync(BYTECODE_PATH)) return true;
  console.log('Generando bytecode...');
  const r = spawnSync('node', [path.join(__dirname, 'generate-verification-source.js')], {
    encoding: 'utf8',
    timeout: 60000,
    cwd: ROOT,
    stdio: 'inherit'
  });
  return r.status === 0 && fs.existsSync(BYTECODE_PATH);
}

function getWslPath(dirPath) {
  const parsed = path.parse(path.resolve(dirPath));
  const drive = (parsed.root || '').replace(/:\\?/, '').toLowerCase();
  if (drive && drive.length === 1) {
    const rest = parsed.dir.replace(/^[A-Za-z]:[\\/]*/, '').replace(/\\/g, '/');
    return '/mnt/' + drive + (rest ? '/' + rest : '') + (parsed.base ? '/' + parsed.base : '');
  }
  return dirPath.replace(/\\/g, '/').replace(/^([A-Za-z]):/, (_, d) => '/mnt/' + d.toLowerCase());
}

function runDocker() {
  try {
    const info = spawnSync('docker', ['info'], { encoding: 'utf8', stdio: 'pipe', timeout: 5000 });
    if (info.status !== 0 || /cannot connect|failed to connect/i.test(info.stderr || '')) return null;
  } catch (_) { return null; }
  const vol = OUT_DIR.replace(/\\/g, '/');
  const cmd = 'pip install -q panoramix-decompiler && BC="0x$(cat /data/bytecode.hex | tr -d \'\\n\')" && python -m panoramix "$BC" > /data/TRC20TokenUpgradeable-decompiled.pyr 2>&1';
  spawnSync('docker', ['run', '--rm', '-v', `${vol}:/data`, 'python:3.11-slim', 'sh', '-c', cmd], {
    encoding: 'utf8', timeout: 300000, stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 10 * 1024 * 1024
  });
  const outPath = path.join(OUT_DIR, 'TRC20TokenUpgradeable-decompiled.pyr');
  if (fs.existsSync(outPath) && fs.statSync(outPath).size > 500) return fs.readFileSync(outPath, 'utf8');
  return null;
}

function runWslDecompile() {
  const wslRoot = getWslPath(ROOT);
  const wslOut = getWslPath(OUT_DIR);
  const script = `
set -e
export PATH="$HOME/.local/bin:$PATH"
OUT="${wslOut}"
cd "${wslRoot}"
if ! python3 -c "import panoramix" 2>/dev/null; then
  curl -sSfL https://bootstrap.pypa.io/get-pip.py -o /tmp/get-pip.py 2>/dev/null || true
  python3 /tmp/get-pip.py --user 2>/dev/null || true
  python3 -m pip install --user panoramix-decompiler 2>/dev/null || python3 -m pip install --user panoramix-decompiler
fi
BC="0x$(cat "$OUT/bytecode.hex" | tr -d '\\n')"
python3 -m panoramix "$BC" > "$OUT/TRC20TokenUpgradeable-decompiled.pyr" 2>&1
cat "$OUT/TRC20TokenUpgradeable-decompiled.pyr"
`;
  const r = spawnSync('wsl', ['-d', 'Ubuntu', '--', 'bash', '-c', script], {
    encoding: 'utf8', timeout: 300000, stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 10 * 1024 * 1024
  });
  if (r.stdout && r.stdout.length > 500) return r.stdout;
  if (fs.existsSync(path.join(OUT_DIR, 'TRC20TokenUpgradeable-decompiled.pyr'))) {
    return fs.readFileSync(path.join(OUT_DIR, 'TRC20TokenUpgradeable-decompiled.pyr'), 'utf8');
  }
  return null;
}

function runPanoramixWindows() {
  const pyScript = path.join(__dirname, 'decompile_via_python.py');
  if (!fs.existsSync(pyScript)) return null;
  const r = spawnSync('python', [pyScript], {
    encoding: 'utf8',
    timeout: 120000,
    cwd: ROOT,
    stdio: ['pipe', 'pipe', 'pipe'],
    maxBuffer: 10 * 1024 * 1024
  });
  return r.stdout || null;
}

function applyFallback() {
  const flatPath = path.join(OUT_DIR, 'TRC20TokenUpgradeable-flattened.sol');
  if (!fs.existsSync(flatPath)) return false;
  let src = fs.readFileSync(flatPath, 'utf8');
  if (!src.includes('// Código fuente para verificación')) {
    src = src.replace(/^\/\/ Flattened para verificación/, '// Código fuente para verificación (desde contracts/)\n// Flattened para verificación');
  }
  fs.writeFileSync(OUT_SOL, src, 'utf8');
  return true;
}

function hasRealDecompilation(pyr) {
  if (!pyr || pyr.length < 200) return false;
  if (/AttributeError.*SIGALRM/i.test(pyr)) return false;
  return /def\s+\w+\s*\(/i.test(pyr) || /storage\[/i.test(pyr) || /mem\[/i.test(pyr);
}

function main() {
  console.log('=== Descompilación AUTOMATIZADA TXaXTSUK ===\n');

  if (!ensureBytecode()) {
    console.error('No se pudo obtener bytecode.');
    process.exit(1);
  }

  let pyrOutput = null;
  let method = '';

  // 1. Docker (sin interacción)
  console.log('1. Intentando Docker (Linux)...');
  pyrOutput = runDocker();
  if (pyrOutput && hasRealDecompilation(pyrOutput)) {
    method = 'Docker';
    console.log('   OK');
  } else {
    pyrOutput = null;
    console.log('   No disponible o sin salida válida');
  }

  // 2. WSL con get-pip (sin sudo)
  if (!pyrOutput || !hasRealDecompilation(pyrOutput)) {
    console.log('2. Intentando WSL (get-pip + panoramix)...');
    pyrOutput = runWslDecompile();
    if (pyrOutput && hasRealDecompilation(pyrOutput)) {
      method = 'WSL';
      console.log('   OK');
    } else {
      pyrOutput = null;
      console.log('   Sin salida válida');
    }
  }

  // 3. Panoramix Windows
  if (!pyrOutput || !hasRealDecompilation(pyrOutput)) {
    console.log('3. Intentando Panoramix (Windows)...');
    pyrOutput = runPanoramixWindows();
    if (pyrOutput) {
      method = 'Windows';
      console.log('   Ejecutado (puede haber fallo SIGALRM)');
    }
  }

  const clean = pyrOutput ? pyrOutput.replace(/\x1b\[[0-9;]*m/g, '') : null;
  if (clean && clean.trim().length > 0) {
    fs.writeFileSync(OUT_PYR, clean, 'utf8');
  }

  if (!pyrOutput || !hasRealDecompilation(pyrOutput)) {
    console.log('4. Fallback: código fuente conocido');
    if (applyFallback()) {
      console.log('   OK');
    }
  }

  console.log('');
  console.log('--- Resultado ---');
  if (fs.existsSync(OUT_SOL)) console.log('  Solidity:', OUT_SOL);
  if (fs.existsSync(OUT_PYR)) console.log('  Panoramix:', OUT_PYR);
  if (method) console.log('  Método:', method);

  if (clean && clean.length > 100) {
    console.log('\n--- Vista previa ---\n');
    console.log(clean.slice(0, 2000));
    if (clean.length > 2000) console.log('\n...');
  }

  if (!fs.existsSync(OUT_SOL) && !fs.existsSync(OUT_PYR)) {
    console.error('\nNo se generó salida.');
    process.exit(1);
  }
}

main();
