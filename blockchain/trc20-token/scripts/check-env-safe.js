#!/usr/bin/env node
'use strict';
/**
 * Comprueba que .env tenga las variables necesarias para el despliegue.
 * NO imprime ni registra ningún valor sensible (PRIVATE_KEY, TRON_PRO_API_KEY, etc.).
 * Solo reporta: presente/ausente, y para claves formato válido/inválido (sin mostrar contenido).
 */
const path = require('node:path');
const fs = require('node:fs');

const root = path.join(__dirname, '..');
const envPath = path.join(root, '.env');

// Cargar .env manualmente para no depender de dotenv en este chequeo
function loadEnvKeys(path) {
  const out = {};
  if (!fs.existsSync(path)) return out;
  const raw = fs.readFileSync(path, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const m = (/^\s*([A-Za-z_]\w*)\s*=\s*(.*)$/).exec(line);
    if (m) out[m[1]] = m[2].replaceAll(/^["']|["']$/g, '').trim();
  }
  return out;
}

const env = loadEnvKeys(envPath);
const errors = [];
const report = [];

// PRIVATE_KEY: debe existir y ser 64 hex (con o sin 0x al inicio)
const rawPk = env.PRIVATE_KEY || '';
const pk = rawPk.replace(/^0x/i, '').trim();
if (pk === '') {
  errors.push('PRIVATE_KEY');
  report.push('PRIVATE_KEY: ausente');
} else if (!/^[a-fA-F0-9]{64}$/.test(pk)) {
  errors.push('PRIVATE_KEY');
  report.push('PRIVATE_KEY: formato inválido (debe ser 64 caracteres hexadecimales; 0x al inicio es opcional)');
} else {
  const has0x = /^0x/i.test(rawPk.trim());
  report.push('PRIVATE_KEY: presente, longitud correcta' + (has0x ? ' (0x al inicio se ignora)' : ''));
}

// TRON_PRO_API_KEY: debe existir y no estar vacío
const apiKey = (env.TRON_PRO_API_KEY || '').trim();
if (apiKey === '') {
  errors.push('TRON_PRO_API_KEY');
  report.push('TRON_PRO_API_KEY: ausente');
} else {
  report.push('TRON_PRO_API_KEY: presente');
}

// PROXY_ADMIN_ADDRESS: obligatorio para migrate-3-safe
const admin = (env.PROXY_ADMIN_ADDRESS || '').trim();
if (admin === '') {
  errors.push('PROXY_ADMIN_ADDRESS');
  report.push('PROXY_ADMIN_ADDRESS: ausente');
} else {
  report.push('PROXY_ADMIN_ADDRESS: presente');
}

// TOKEN_NAME, TOKEN_SYMBOL, TOKEN_DECIMALS, TOKEN_SUPPLY (opcionales con valor por defecto)
const hasTokenName = (env.TOKEN_NAME || '').trim().length > 0;
const hasTokenSymbol = (env.TOKEN_SYMBOL || '').trim().length > 0;
report.push(
  'TOKEN_NAME: ' + (hasTokenName ? 'definido' : 'usa por defecto'),
  'TOKEN_SYMBOL: ' + (hasTokenSymbol ? 'definido' : 'usa por defecto')
);
const decimals = env.TOKEN_DECIMALS !== undefined && env.TOKEN_DECIMALS !== '' ? String(env.TOKEN_DECIMALS).trim() : '';
const supply = (env.TOKEN_SUPPLY || '').trim();
report.push(
  'TOKEN_DECIMALS: ' + (decimals === '' ? 'usa por defecto' : 'definido'),
  'TOKEN_SUPPLY: ' + (supply === '' ? 'usa por defecto' : 'definido')
);

console.log('');
console.log('=== Comprobación de .env (sin mostrar valores sensibles) ===');
console.log('');
if (!fs.existsSync(envPath)) {
  console.log('  .env: archivo no encontrado. Copia ENV_TEMPLATE.txt a .env y rellena PRIVATE_KEY y TRON_PRO_API_KEY.');
  process.exit(1);
}
report.forEach((r) => console.log('  ' + r));
console.log('');
if (errors.length !== 0) {
  console.log('  Faltan o son inválidas:', errors.join(', '));
  console.log('  No se expone ningún valor. Rellena .env según ENV_TEMPLATE.txt.');
  console.log('');
  process.exit(1);
}
console.log('  Todo correcto para despliegue (variables necesarias presentes y con formato válido).');
console.log('');
process.exit(0);
