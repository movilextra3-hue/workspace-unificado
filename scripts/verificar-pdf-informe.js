#!/usr/bin/env node
'use strict';

const path = require('node:path');
const fs = require('node:fs');

const pdfPath = path.resolve(__dirname, '../docs/vitacora/INFORME_ZIP_EMISION_300M_COMPLETO.pdf');

if (!fs.existsSync(pdfPath)) {
  console.error('PDF no encontrado:', pdfPath);
  process.exit(1);
}

const buf = fs.readFileSync(pdfPath);

async function run() {
  let text = '';
  let numPages = 0;
  try {
    const pdf = require('pdf-parse');
    const data = typeof pdf === 'function' ? await pdf(buf) : await pdf.default(buf);
    text = data.text || '';
    numPages = data.numpages || data.numinages || 0;
  } catch (e) {
    console.warn('API pdf-parse v1 falló, intentando v2:', e.message);
    try {
      const { PDFParse } = require('pdf-parse');
      const parser = new PDFParse({ data: buf });
      const result = await parser.getText();
      text = result.text || '';
      numPages = result.numpages || 0;
    } catch (error_) {
      throw new Error('pdf-parse no disponible: ' + error_.message);
    }
  }

  const badPatterns = [
    /file:\/\/\/[^\s]+/i,
    /https?:\/\/[^\s]+\s+\d{1,2}\/\d{1,2}\/\d{4}/,
    /Página\s+\d+\s+de\s+\d+/i,
    /Page\s+\d+\s+of\s+\d+/i,
    /^\d+\s+\d+\s+\d+$/m,
  ];

  let foundBad = false;
  for (const re of badPatterns) {
    if (re.test(text)) {
      console.error('ADVERTENCIA: posible cabecera/pie detectada:', re.source);
      foundBad = true;
    }
  }

  const expected = [
    'Informe completo',
    'Análisis ZIP emisión 300M',
    '0x38d4',
    'blockchain',
    'advance-fee',
  ];

  let missing = 0;
  for (const s of expected) {
    if (!text.includes(s)) {
      console.error('Falta contenido esperado:', s);
      missing++;
    }
  }

  console.log('--- Resumen verificación PDF ---');
  console.log('Páginas:', numPages);
  console.log('Caracteres extraídos:', text.length);
  console.log('Cabeceras/pies sospechosas:', foundBad ? 'SÍ' : 'NO (limpio)');
  console.log('Contenido esperado faltante:', missing === 0 ? 'NINGUNO' : missing);
  process.exit(foundBad || missing > 0 ? 1 : 0);
}

// sonar-disable-next-line sonarjs/prefer-top-level-await -- CJS; top-level await requiere type:module
(async () => { // NOSONAR - top-level await requiere ESM; CJS por compatibilidad
  try {
    await run();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})(); // NOSONAR
