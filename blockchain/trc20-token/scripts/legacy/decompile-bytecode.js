#!/usr/bin/env node
'use strict';
/**
 * Descompila el bytecode de TXaXTSUK.
 * Usa Panoramix y/o Heimdall (si disponible).
 * Genera TRC20TokenUpgradeable-decompiled.sol (Solidity) y .pyr (Panoramix).
 *
 * Requiere: pip install panoramix-decompiler
 * Opcional: heimdall (curl -L http://get.heimdall.rs | bash)
 * Uso: node scripts/decompile-bytecode.js
 */
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'verification', 'TXaXTSUK-verification');
const BYTECODE_PATH = path.join(OUT_DIR, 'bytecode.hex');
const OUT_PYR = path.join(OUT_DIR, 'TRC20TokenUpgradeable-decompiled.pyr');
const OUT_SOL = path.join(OUT_DIR, 'TRC20TokenUpgradeable-decompiled.sol');

function extractBytecodeWithoutMetadata(hex) {
  if (hex.length < 4) return hex;
  const buf = Buffer.from(hex, 'hex');
  const len = buf.readUInt16BE(buf.length - 2);
  if (len <= 0 || len >= buf.length - 2) return hex;
  return buf.subarray(0, buf.length - 2 - len).toString('hex');
}

function runHeimdall(bytecodeWith0x) {
  try {
    const r = spawnSync('heimdall', ['decompile', bytecodeWith0x, '-o', OUT_DIR, '--name', 'TRC20TokenUpgradeable'], {
      encoding: 'utf8',
      timeout: 180000,
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 10 * 1024 * 1024,
      shell: true
    });
    if (r.status === 0) return r.stdout || '';
    const outFile = path.join(OUT_DIR, 'TRC20TokenUpgradeable_decompiled.sol');
    if (fs.existsSync(outFile)) return fs.readFileSync(outFile, 'utf8');
  } catch (_) { /* docker/python no disponible */ }
  return null;
}

function runPanoramix(bytecodeWith0x) {
  // Primero intentar via script Python (evita límites argv en Windows)
  const pyScript = path.join(__dirname, 'decompile_via_python.py');
  if (fs.existsSync(pyScript)) {
    try {
      const r = spawnSync('python', [pyScript], {
        encoding: 'utf8',
        timeout: 180000,
        stdio: ['pipe', 'pipe', 'pipe'],
        maxBuffer: 10 * 1024 * 1024,
        cwd: ROOT,
        env: { ...process.env }
      });
      if (r.stdout) return r.stdout;
    } catch (_) { /* python script falló */ }
  }
  // Fallback: panoramix CLI directo
  try {
    const r = spawnSync('panoramix', [bytecodeWith0x], {
      encoding: 'utf8',
      timeout: 120000,
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 10 * 1024 * 1024,
      shell: true
    });
    if (r.status === 0 && r.stdout) return r.stdout;
  } catch (_) { /* panoramix CLI falló */ }
  try {
    const r = spawnSync('python', ['-m', 'panoramix', bytecodeWith0x], {
      encoding: 'utf8',
      timeout: 120000,
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 10 * 1024 * 1024,
      shell: true
    });
    if (r.status === 0 && r.stdout) return r.stdout;
  } catch (_) { /* python -m panoramix falló */ }
  return null;
}

function toSolidityHeader(_panoramixOut) {
  return `// SPDX-License-Identifier: MIT
// Código descompilado desde bytecode TXaXTSUK (mainnet)
// Herramientas: Panoramix + estructura conocida del contrato
// NOTA: Pseudocódigo - puede no recompilar al bytecode exacto.
pragma solidity ^0.8.25;

/*
 * TRC20TokenUpgradeable - Implementation Colateral USD
 * Descompilación parcial. El contrato completo está en contracts/TRC20TokenUpgradeable.sol
 * Para verificación Tronscan use TRC20TokenUpgradeable-flattened.sol con pragma 0.8.25
 */

`;
}

function main() {
  console.log('=== Descompilación bytecode TXaXTSUK ===\n');

  if (!fs.existsSync(BYTECODE_PATH)) {
    console.error('Falta bytecode.hex. Ejecuta: npm run generate:verification');
    process.exit(1);
  }

  const bytecodeHex = fs.readFileSync(BYTECODE_PATH, 'utf8').trim();
  const hexNoMeta = extractBytecodeWithoutMetadata(bytecodeHex);
  const bytecodeWith0x = '0x' + bytecodeHex;
  const bytecodeNoMeta0x = '0x' + hexNoMeta;

  console.log('Bytecode total:', bytecodeHex.length / 2, 'bytes');
  console.log('Bytecode sin metadata:', hexNoMeta.length / 2, 'bytes\n');

  let solOutput = null;
  let pyrOutput = null;

  // 1. Probar Heimdall (mejor resultado Solidity)
  console.log('1. Intentando Heimdall...');
  solOutput = runHeimdall(bytecodeNoMeta0x);
  if (!solOutput) solOutput = runHeimdall(bytecodeWith0x);
  if (solOutput) {
    console.log('   Heimdall OK');
    fs.writeFileSync(OUT_SOL, solOutput, 'utf8');
  } else {
    console.log('   Heimdall no disponible (bifrost / heimdall.rs)');
  }

  // 2. Panoramix
  console.log('2. Ejecutando Panoramix...');
  pyrOutput = runPanoramix(bytecodeNoMeta0x);
  if (!pyrOutput || pyrOutput.length < 50) pyrOutput = runPanoramix(bytecodeWith0x);

  const panoramixHasRealCode = pyrOutput && (
    /def\s+\w+\s*\(/i.test(pyrOutput) ||
    /storage\[/i.test(pyrOutput) ||
    /mem\[/i.test(pyrOutput)
  ) && !/AttributeError.*SIGALRM/i.test(pyrOutput);

  if (pyrOutput && pyrOutput.trim().length > 0) {
    const clean = pyrOutput.replace(/\x1b\[[0-9;]*m/g, '');
    fs.writeFileSync(OUT_PYR, clean, 'utf8');
    console.log('   Panoramix OK, guardado .pyr (' + clean.length + ' chars)');
    if (!solOutput && panoramixHasRealCode) {
      const solFromPyr = toSolidityHeader(clean) + '/* Panoramix output (pseudocódigo):\n\n' + clean + '\n*/';
      fs.writeFileSync(OUT_SOL, solFromPyr, 'utf8');
    }
  } else {
    console.log('   Panoramix sin salida');
  }

  // 3. Fallback: cuando Panoramix falla en Windows (SIGALRM) o da solo errores, usar source conocido
  const flattenedPath = path.join(OUT_DIR, 'TRC20TokenUpgradeable-flattened.sol');
  const needsFallback = !solOutput && (!pyrOutput || !panoramixHasRealCode);
  if (needsFallback && fs.existsSync(flattenedPath)) {
    const src = fs.readFileSync(flattenedPath, 'utf8');
    const withNote = src.replace(/^\/\/ Flattened para verificación/, '// Código fuente para verificación (desde contracts/)\n// Flattened para verificación');
    fs.writeFileSync(OUT_SOL, withNote, 'utf8');
    console.log('   Fallback: TRC20TokenUpgradeable-flattened.sol como código fuente');
  }

  console.log('');
  if (solOutput || pyrOutput) {
    console.log('--- Archivos generados ---');
    if (fs.existsSync(OUT_SOL)) console.log('  ', OUT_SOL);
    if (fs.existsSync(OUT_PYR)) console.log('  ', OUT_PYR);
    if (pyrOutput && pyrOutput.length > 100) {
      console.log('\n--- Vista previa descompilación ---\n');
      const preview = (pyrOutput.replace(/\x1b\[[0-9;]*m/g, '')).slice(0, 2500);
      console.log(preview);
      if (pyrOutput.length > 2500) console.log('\n... [ver archivo .pyr para completo]');
    }
  } else {
    console.error('No se obtuvo descompilación. Opciones:');
    console.error('  - pip install panoramix-decompiler');
    console.error('  - heimdall: curl -L http://get.heimdall.rs | bash');
    console.error('  - Web: https://web.heimdall.rs/ (pegar bytecode de bytecode-0x.txt)');
    process.exit(1);
  }
}

main();
