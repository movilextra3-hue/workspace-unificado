#!/usr/bin/env node
'use strict';
/**
 * Muestra los pasos seguros para verificar TFeLLtutbo en Tronscan/OKLink.
 * Uso: node scripts/pasos-verificar-TFeLLtutbo.js [--open]
 *      npm run pasos:verificar
 *      npm run pasos:verificar:open
 * --open: abre https://tronscan.org/#/contracts/verify en el navegador.
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const PKG = path.join(ROOT, 'verification', 'PAQUETE-VERIFICACION-POST-UPGRADE');
const PASOS = path.join(PKG, 'PASOS-SEGUROS-VERIFICAR.txt');
const TRONSCAN_URL = 'https://tronscan.org/#/contracts/verify';

function main() {
  if (!fs.existsSync(PASOS)) {
    console.error('Ejecuta primero: npm run guardar:verificacion');
    process.exit(1);
  }
  console.log(fs.readFileSync(PASOS, 'utf8'));

  if (process.argv.includes('--open')) {
    const { execSync } = require('node:child_process');
    try {
      if (process.platform === 'win32') {
        execSync(`start "" "${TRONSCAN_URL}"`, { stdio: 'ignore' });
      } else if (process.platform === 'darwin') {
        execSync(`open "${TRONSCAN_URL}"`, { stdio: 'ignore' });
      } else {
        execSync(`xdg-open "${TRONSCAN_URL}"`, { stdio: 'ignore' });
      }
      console.log('\nTronscan abierto en el navegador.');
    } catch (_) {
      console.log('\nAbrir manualmente:', TRONSCAN_URL);
    }
  }
}

main();
