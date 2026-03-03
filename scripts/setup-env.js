#!/usr/bin/env node
'use strict';
/**
 * Crea .env desde ENV_TEMPLATE.txt si no existe.
 * El usuario solo tiene que abrir .env y rellenar PRIVATE_KEY y TRON_PRO_API_KEY.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const envPath = path.join(root, '.env');
const templatePath = path.join(root, 'ENV_TEMPLATE.txt');

if (!fs.existsSync(templatePath)) {
  console.error('No existe ENV_TEMPLATE.txt en la raíz del proyecto.');
  process.exit(1);
}

if (fs.existsSync(envPath)) {
  console.log('El archivo .env ya existe. No se sobrescribe.');
  console.log('Abre .env y asegúrate de tener rellenados PRIVATE_KEY y TRON_PRO_API_KEY.');
  process.exit(0);
}

const template = fs.readFileSync(templatePath, 'utf8');
fs.writeFileSync(envPath, template, 'utf8');
console.log('Creado .env desde ENV_TEMPLATE.txt.');
console.log('');
console.log('Siguiente paso: abre el archivo .env y rellena (obligatorio para mainnet):');
console.log('  - PRIVATE_KEY=       (clave privada de la wallet, 64 hex, sin 0x)');
console.log('  - TRON_PRO_API_KEY=  (API key de https://www.trongrid.io/)');
console.log('');
console.log('Ver instrucciones: CLAVES_PEGAR.md');
