#!/usr/bin/env node
'use strict';
/**
 * Prepara el entorno y ejecuta el despliegue para completar el token (Implementation + Proxy reutilizando ProxyAdmin).
 * - Comprueba que tronbox use 0.8.25 + Shanghai (Tronscan) para no gastar TRX en bytecode no verificable.
 * - Crea .env desde plantilla si no existe (ya trae PROXY_ADMIN_ADDRESS).
 * - Si .env existe pero PROXY_ADMIN_ADDRESS está vacío, lo rellena con la primera ProxyAdmin recomendada.
 * - Compila con TronBox (TVM), verifica (sin gastar TRX) y, si pasa, ejecuta migrate -f 3.
 * Solo necesitas tener en .env PRIVATE_KEY y TRON_PRO_API_KEY; este script pone PROXY_ADMIN_ADDRESS si falta.
 */
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
const { assertTronscanCompatibleOrExit } = require('./lib/tronscan-build-requirements');

assertTronscanCompatibleOrExit();

const root = path.join(__dirname, '..');
const envPath = path.join(root, '.env');
const templatePath = path.join(root, 'ENV_TEMPLATE.txt');

const PROXY_ADMIN_RECOMENDADA = 'TVeVPZGiMc9GWQ8sQHvUwhfg19EDZt3UjZ';

function ensureEnvExists() {
  if (fs.existsSync(envPath)) return;
  if (!fs.existsSync(templatePath)) {
    console.error('No existe ENV_TEMPLATE.txt.');
    process.exit(1);
  }
  const template = fs.readFileSync(templatePath, 'utf8');
  fs.writeFileSync(envPath, template, 'utf8');
  console.log('Creado .env desde plantilla.');
}

function ensureProxyAdminInEnv() {
  let content = fs.readFileSync(envPath, 'utf8');
  const line = /^\s*PROXY_ADMIN_ADDRESS\s*=\s*(\S*)\s*$/m;
  const match = line.exec(content);
  if (match && match[1].length > 0) return; // ya tiene valor
  if (match) {
    content = content.replace(line, 'PROXY_ADMIN_ADDRESS=' + PROXY_ADMIN_RECOMENDADA + '\n');
  } else {
    content = content.trimEnd() + '\nPROXY_ADMIN_ADDRESS=' + PROXY_ADMIN_RECOMENDADA + '\n';
  }
  fs.writeFileSync(envPath, content, 'utf8');
  console.log('PROXY_ADMIN_ADDRESS rellenada en .env:', PROXY_ADMIN_RECOMENDADA);
}

ensureEnvExists();
ensureProxyAdminInEnv();

// Cargar .env para el proceso actual (verify y migrate lo cargan también, pero por si se llama a execSync sin heredar)
require('dotenv').config({ path: envPath });

// Fallo rápido: no ejecutar compile si faltan claves (evita esperar compilación para luego fallar en verify)
const privateKey = (process.env.PRIVATE_KEY || '').replace(/^0x/, '').trim();
const apiKey = (process.env.TRON_PRO_API_KEY || '').trim();
if (!privateKey || !/^[a-fA-F0-9]{64}$/.test(privateKey)) {
  console.error('');
  console.error('Falta o PRIVATE_KEY inválido en .env (64 caracteres hex, sin 0x). Rellena .env antes de ejecutar migrate-3-safe.');
  process.exit(1);
}
if (!apiKey) {
  console.error('');
  console.error('Falta TRON_PRO_API_KEY en .env (obtenerla en https://www.trongrid.io/). Rellena .env antes de ejecutar migrate-3-safe.');
  process.exit(1);
}

console.log('');
execSync('npm run compile', { stdio: 'inherit', cwd: root });
execSync('node scripts/verify-before-migrate-3.js', { stdio: 'inherit', cwd: root, env: { ...process.env } });
// Pasar MIGRATE_3_VERIFIED y .env al proceso tronbox (en Windows el env debe ir explícito)
const migrateEnv = { ...process.env, MIGRATE_3_VERIFIED: '1' };
console.log('');
console.log('Ejecutando: tronbox migrate -f 3 --network mainnet (esto enviará tx y gastará TRX)...');
console.log('');

// Capturar salida de tronbox para diagnóstico (evitar perder el mensaje real si falla o salta la migración)
const migrateLogPath = path.join(root, 'migrate-output.log');
let migrateOut = '';
let migrateErr = '';
let migrateFailed = false;
try {
  migrateOut = execSync('npx tronbox migrate -f 3 --network mainnet', {
    encoding: 'utf8',
    cwd: root,
    env: migrateEnv,
    shell: true,
    maxBuffer: 10 * 1024 * 1024
  });
} catch (e) {
  migrateFailed = true;
  migrateErr = (e.stderr || e.stdout || e.message || '').toString();
  migrateOut = (e.stdout || '').toString();
}
const fullLog = [migrateOut, migrateErr].filter(Boolean).join('\n--- stderr ---\n');
if (fullLog) {
  try { fs.writeFileSync(migrateLogPath, fullLog, 'utf8'); } catch (writeErr) {
    console.warn('No se pudo escribir migrate-output.log:', writeErr.message);
  }
  console.log(fullLog);
  console.log('');
}
if (migrateFailed) {
  console.error('tronbox migrate terminó con error. Revisa la salida arriba y migrate-output.log');
  process.exit(1);
}

// Comprobar que deploy-info.json se generó con direcciones reales (no placeholder)
const deployInfoPath = path.join(root, 'deploy-info.json');
if (!fs.existsSync(deployInfoPath)) {
  console.error('');
  console.error('AVISO: deploy-info.json no existe tras migrate. Revisa la salida de tronbox migrate arriba.');
  process.exit(1);
}
const info = JSON.parse(fs.readFileSync(deployInfoPath, 'utf8'));
const hasPlaceholder =
  !info.tokenAddress ||
  info.tokenAddress.length < 30 ||
  info.tokenAddress.includes('XXXX') ||
  /^TX+$/.test(info.tokenAddress);
if (hasPlaceholder) {
  console.error('');
  console.error('AVISO: deploy-info.json tiene direcciones placeholder (TXXX...). La migración puede no haberse ejecutado. Comprueba en Tronscan si hay contratos nuevos o ejecuta de nuevo: npm run migrate-3-safe');
  process.exit(1);
}
console.log('');
console.log('Despliegue completado. Token (Proxy):', info.tokenAddress);
