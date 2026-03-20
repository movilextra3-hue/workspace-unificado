#!/usr/bin/env node
'use strict';

const path = require('node:path');
const fs = require('node:fs');

const htmlPath = path.resolve(__dirname, '../docs/vitacora/INFORME_ZIP_EMISION_300M_COMPLETO.html');
const pdfPath = path.resolve(__dirname, '../docs/vitacora/INFORME_ZIP_EMISION_300M_COMPLETO.pdf');

if (!fs.existsSync(htmlPath)) {
  console.error('HTML no encontrado:', htmlPath);
  process.exit(1);
}

(async () => {
  let puppeteer;
  try {
    puppeteer = require('puppeteer');
  } catch (e) {
    console.error('Puppeteer no instalado. Ejecuta: npm install puppeteer');
    process.exit(1);
  }

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  await page.goto('file:///' + htmlPath.replace(/\\/g, '/'), {
    waitUntil: 'networkidle0',
    timeout: 15000
  });

  await page.pdf({
    path: pdfPath,
    format: 'A4',
    margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' },
    printBackground: true,
    displayHeaderFooter: false
  });

  await browser.close();
  console.log('PDF generado (sin headers/footers):', pdfPath);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
