#!/usr/bin/env node
'use strict';
/**
 * Sube el logo del token a Pinata (IPFS) y devuelve la URL pública.
 * No requiere que el logo esté en GitHub — resuelve el 404.
 *
 * REQUISITOS LOGO (Tronscan + Trust Wallet + Pinata):
 * - Formato: PNG recomendado (Tronscan/Trust Wallet piden .png)
 * - Tamaño: 256×256 px
 * - Fondo: transparente recomendado
 * - Peso: ≤100 KB (Trust Wallet). Pinata: hasta ~100 MB sin problemas
 *
 * Origen preferido: npm run generate:logo (crea assets/logo.png correcto)
 *
 * Requisitos ejecución:
 * - PINATA_JWT en .env (https://app.pinata.cloud/developers/keys)
 *
 * Uso: npm run upload:logo:pinata
 */
const path = require('node:path');
const fs = require('node:fs');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const ROOT = path.join(__dirname, '..');
const JWT = (process.env.PINATA_JWT || '').trim();
const TRUST_WALLET_MAX_KB = 100;

// logo.png primero (generate:logo), logo.webp, colateral-logo.png (fuente)
const LOGO_CANDIDATES = [
  path.join(ROOT, 'assets', 'logo.png'),
  path.join(ROOT, 'assets', 'logo.webp'),
  path.join(ROOT, 'assets', 'colateral-logo.png')
];

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/png';
}

async function uploadToPinata(filePath) {
  const buffer = fs.readFileSync(filePath);
  const mime = getMimeType(filePath);
  const blob = new Blob([buffer], { type: mime });
  const fileName = path.basename(filePath);
  const formData = new FormData();
  formData.append('file', blob, fileName);
  formData.append('network', 'public');

  const res = await fetch('https://uploads.pinata.cloud/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${JWT}` },
    body: formData
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Pinata API: ${res.status} ${err}`);
  }
  const json = await res.json();
  // Pinata v3: { data: { cid, name, ... } }; v2: { IpfsHash, cid }
  const data = json.data || json;
  const cid = data.cid || data.IpfsHash || json.IpfsHash;
  if (!cid) {
    console.error('Respuesta Pinata:', JSON.stringify(json, null, 2).slice(0, 500));
    throw new Error('Pinata no devolvió CID');
  }
  return `https://gateway.pinata.cloud/ipfs/${cid}`;
}

async function main() {
  console.log('\n=== SUBIR LOGO A PINATA (IPFS) ===\n');

  if (!JWT) {
    console.error('Falta PINATA_JWT en .env');
    console.log('Obtener JWT en https://app.pinata.cloud/developers/keys');
    process.exit(1);
  }

  let logoPath = '';
  for (const p of LOGO_CANDIDATES) {
    if (fs.existsSync(p)) {
      logoPath = p;
      break;
    }
  }
  if (!logoPath) {
    console.error('No se encontró logo. Ejecutar: npm run generate:logo');
    process.exit(1);
  }

  const stat = fs.statSync(logoPath);
  const kb = (stat.size / 1024).toFixed(1);
  if (stat.size > TRUST_WALLET_MAX_KB * 1024) {
    console.warn('  ⚠ Trust Wallet recomienda ≤100 KB. Actual: ' + kb + ' KB.');
  } else {
    console.log('  Tamaño: ' + kb + ' KB (Trust Wallet ≤100 KB).');
  }

  console.log('Subiendo:', path.relative(ROOT, logoPath));
  const url = await uploadToPinata(logoPath);
  console.log('\nLogo subido. URL (copiar a trc20-token.config.json logoUrlPinata):');
  console.log('  ' + url);
  console.log('\nAñadir a trc20-token.config.json:');
  console.log('  "logoUrlPinata": "' + url + '"');
  console.log('\nO añadir a logoUrlFallbacks: ["' + url + '"]');
  console.log('');
}

main().catch((e) => {
  console.error('Error:', e.message);
  process.exit(2);
});
