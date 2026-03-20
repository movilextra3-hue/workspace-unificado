#!/usr/bin/env node
'use strict';
/**
 * Genera todos los formatos y tamaños del logo desde colateral-logo.png.
 * Fuente única: assets/colateral-logo.png
 *
 * Salidas (fondo oscuro → transparente):
 * - logo.png      256×256 PNG — Tronscan, Trust Wallet, Pinata (≤100 KB)
 * - logo-200.png  200×200 PNG — CoinGecko, CoinMarketCap
 * - logo-128.png  128×128 PNG — iconos pequeños
 * - logo.webp     256×256 WebP — web/CDN (opcional, menor peso)
 *
 * Uso: npm run generate:logo
 */
const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.join(__dirname, '..');
const ASSETS = path.join(ROOT, 'assets');
const SOURCE = path.join(ASSETS, 'colateral-logo.png');
const TRUST_WALLET_MAX_KB = 100;
const DARK_THRESHOLD = 100;

const OUTPUTS = [
  { file: 'logo.png', size: 256, fmt: 'png', platforms: 'Tronscan, Trust Wallet, Pinata' },
  { file: 'logo-200.png', size: 200, fmt: 'png', platforms: 'CoinGecko, CoinMarketCap' },
  { file: 'logo-128.png', size: 128, fmt: 'png', platforms: 'iconos pequeños' },
  { file: 'logo.webp', size: 256, fmt: 'webp', platforms: 'web, CDN' }
];

async function main() {
  if (!fs.existsSync(SOURCE)) {
    console.error('Falta colateral-logo.png en assets/. Colócalo y ejecuta de nuevo.');
    process.exit(1);
  }

  let sharp;
  try {
    sharp = require('sharp');
  } catch (e) {
    console.error('Instala sharp: npm install sharp --save-dev');
    process.exit(1);
  }

  if (!fs.existsSync(ASSETS)) fs.mkdirSync(ASSETS, { recursive: true });

  // Fondo oscuro (negro/gris) → transparente
  const { data, info } = await sharp(SOURCE)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r < DARK_THRESHOLD && g < DARK_THRESHOLD && b < DARK_THRESHOLD) {
      data[i + 3] = 0;
    }
  }

  const withTransparency = sharp(Buffer.from(data), { raw: info });

  console.log('\n=== LOGO — colateral-logo.png → formatos requeridos ===\n');
  for (const out of OUTPUTS) {
    const destPath = path.join(ASSETS, out.file);
    if (out.fmt === 'png') {
      await withTransparency
        .clone()
        .resize(out.size, out.size)
        .png({ compressionLevel: 9, palette: out.size <= 256 })
        .toFile(destPath);
    } else {
      await withTransparency
        .clone()
        .resize(out.size, out.size)
        .webp({ quality: 90 })
        .toFile(destPath);
    }
    const stat = fs.statSync(destPath);
    const kb = (stat.size / 1024).toFixed(1);
    const warn = out.file === 'logo.png' && stat.size > TRUST_WALLET_MAX_KB * 1024 ? ' ⚠ >100 KB' : '';
    console.log('  %s %d×%d %s (%s KB)%s — %s', out.file, out.size, out.size, out.fmt.toUpperCase(), kb, warn, out.platforms);
  }
  console.log('\nFuente: colateral-logo.png. Principal: logo.png (256×256).');
  console.log('');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
