#!/usr/bin/env node
'use strict';
/**
 * Normaliza ABI con formato Tronscan (entrys, type "Error"/"Function") a formato estándar.
 * Uso: node scripts/normalize-abi-from-tronscan.js < abi-tronscan.json
 *   o: node scripts/normalize-abi-from-tronscan.js abi-tronscan.json
 */
const fs = require('node:fs');
const path = require('node:path');

let input;
if (process.argv[2]) {
  input = fs.readFileSync(path.resolve(process.argv[2]), 'utf8');
} else {
  input = fs.readFileSync(0, 'utf8');
}
const data = JSON.parse(input);
const entrys = data.entrys || data.abi || data;
const normalized = entrys.map((e) => {
  const out = { ...e };
  if (out.type === 'Constructor') out.type = 'constructor';
  if (out.type === 'Error') out.type = 'error';
  if (out.type === 'Event') out.type = 'event';
  if (out.type === 'Function') out.type = 'function';
  if (out.stateMutability) out.stateMutability = out.stateMutability.toLowerCase();
  return out;
});
const outPath = path.join(__dirname, '..', 'abi', 'TRC20TokenUpgradeable-abi.json');
fs.writeFileSync(outPath, JSON.stringify(normalized, null, 2));
console.log('ABI normalizado guardado en', outPath, '(' + normalized.length, 'entradas).');
console.log('Ejecuta npm run update:abi para refrescar token-abi.json con las direcciones.');
