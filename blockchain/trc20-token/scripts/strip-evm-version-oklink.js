#!/usr/bin/env node
'use strict';
/**
 * Lee standard-input-TFeLLtutbo.json y escribe una copia SIN settings.evmVersion
 * para evitar "Invalid EVM version requested" en OKLink.
 * Uso: node scripts/strip-evm-version-oklink.js
 * Salida: verification/PAQUETE-VERIFICACION-POST-UPGRADE/standard-input-TFeLLtutbo-oklink.json
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const PKG = path.join(ROOT, 'verification', 'PAQUETE-VERIFICACION-POST-UPGRADE');
const IN_FILE = path.join(PKG, 'standard-input-TFeLLtutbo.json');
const OUT_FILE = path.join(PKG, 'standard-input-TFeLLtutbo-oklink.json');

function main() {
  if (!fs.existsSync(IN_FILE)) {
    console.error('Ejecutar antes: npm run generate:standard-input');
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(IN_FILE, 'utf8'));
  if (data.settings) {
    delete data.settings.evmVersion;
  }
  fs.writeFileSync(OUT_FILE, JSON.stringify(data, null, 2), 'utf8');
  const writtenOklink = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'));
  if (writtenOklink.settings && Object.hasOwn(writtenOklink.settings, 'evmVersion')) {
    console.error('ERROR interno: OUT_FILE aún contiene evmVersion.');
    process.exit(1);
  }
  console.log('Generado (sin evmVersion):', OUT_FILE);
  console.log('Usar este archivo en OKLink si aparece "Invalid EVM version requested".');

  // Variante con evmVersion: "" por si OKLink rechaza la ausencia de la clave pero acepta vacío
  const dataEmpty = JSON.parse(fs.readFileSync(IN_FILE, 'utf8'));
  if (dataEmpty.settings) {
    dataEmpty.settings.evmVersion = '';
  }
  const outEmpty = path.join(PKG, 'standard-input-TFeLLtutbo-oklink-evm-empty.json');
  fs.writeFileSync(outEmpty, JSON.stringify(dataEmpty, null, 2), 'utf8');
  const writtenEmpty = JSON.parse(fs.readFileSync(outEmpty, 'utf8'));
  if (!writtenEmpty.settings || writtenEmpty.settings.evmVersion !== '') {
    console.error('ERROR interno: variante evm-empty debe tener evmVersion "".');
    process.exit(1);
  }
  console.log('Variante (evmVersion: ""):', outEmpty);
  console.log('Si el primero sigue dando error, probar pegando este en OKLink.');
  console.log('');
  console.log('NO subas a OKLink standard-input-TFeLLtutbo.json si ves JSONError "Invalid EVM version"');
  console.log('(ese archivo incluye evmVersion: shanghai). Usa solo *-oklink*.json.');
}

main();
