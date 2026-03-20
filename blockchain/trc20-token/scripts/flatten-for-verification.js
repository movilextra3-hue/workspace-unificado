#!/usr/bin/env node
'use strict';
/**
 * Genera el archivo aplanado con TronBox (mismo método que usa el despliegue)
 * y lo deja listo para Tronscan: un solo SPDX, líneas \n.
 * Uso: node scripts/flatten-for-verification.js
 */
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const VERIFICATION_DIR = path.join(ROOT, 'verification');
const CONTRACT = path.join(ROOT, 'contracts', 'TRC20TokenUpgradeable.sol');
const OUT_FILE = path.join(VERIFICATION_DIR, 'TRC20TokenUpgradeable-tronbox-flatten.sol');

function toUnixLines(s) {
  return s.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/** Quitar SPDX duplicados: dejar solo el primero. */
function removeDuplicateSPDX(content) {
  const lines = content.split('\n');
  let seenSPDX = false;
  const out = [];
  for (const line of lines) {
    if (/^\s*\/\/\s*SPDX-License-Identifier:/i.test(line)) {
      if (!seenSPDX) {
        out.push(line);
        seenSPDX = true;
      }
      continue;
    }
    out.push(line);
  }
  return out.join('\n');
}

function main() {
  if (!fs.existsSync(CONTRACT)) {
    console.error('No existe:', CONTRACT);
    process.exit(1);
  }
  if (!fs.existsSync(VERIFICATION_DIR)) {
    fs.mkdirSync(VERIFICATION_DIR, { recursive: true });
  }

  console.log('Ejecutando tronbox flatten (puede tardar si descarga compilador)...');
  const result = spawnSync('npx', ['tronbox', 'flatten', 'contracts/TRC20TokenUpgradeable.sol'], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
    timeout: 120000
  });
  let raw = (result.stdout || '') + (result.stderr || '');
  const tronboxOk = result.status === 0 && raw && raw.trim().length > 0;

  if (!tronboxOk) {
    if (result.status != null && result.status !== 0) {
      console.warn('tronbox flatten falló, status:', result.status, '(usando fallback)');
    } else if (!raw || raw.trim().length === 0) {
      console.warn('tronbox flatten no devolvió salida (usando fallback)');
    }
    // Fallback: prepare-verification genera verification/TRC20TokenUpgradeable.sol (Tronscan)
    const fallbackPath = path.join(VERIFICATION_DIR, 'TRC20TokenUpgradeable.sol');
    if (fs.existsSync(fallbackPath)) {
      raw = fs.readFileSync(fallbackPath, 'utf8');
      console.log('Fallback: usando verification/TRC20TokenUpgradeable.sol de prepare:verification');
    } else {
      console.log('Ejecutando prepare:verification para generar fallback...');
      require('./prepare-verification.js');
      if (fs.existsSync(fallbackPath)) {
        raw = fs.readFileSync(fallbackPath, 'utf8');
      } else {
        console.error('No se pudo generar archivo. Ejecuta antes: npm run prepare:verification');
        process.exit(1);
      }
    }
  }

  let content = toUnixLines(raw);
  content = removeDuplicateSPDX(content);
  fs.writeFileSync(OUT_FILE, content, 'utf8');
  console.log('Escrito:', OUT_FILE);
  console.log('Usar en Tronscan con: Contract Name TRC20TokenUpgradeable, Compiler 0.8.25 (o 0.8.30/0.8.34 si hay).');
}

main();
