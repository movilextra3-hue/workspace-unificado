#!/usr/bin/env node
'use strict';
/**
 * Prepara todo lo necesario para que el token se muestre completo en wallets:
 * - Datos on-chain (name, symbol, decimals) — ya en contrato
 * - Token metadata (logo, descripción, web) para Tronscan, Trust Wallet, CoinGecko/CMC
 * - Checklist Tronscan + Trust Wallet Assets
 *
 * Uso: npm run preparar:wallet-display
 *      node scripts/preparar-wallet-display.js
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

function loadJson(p, defaults = null) {
  if (!fs.existsSync(p)) return defaults;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (_) {
    return defaults;
  }
}

function main() {
  console.log('\n=== PREPARAR WALLET DISPLAY — Token completo en wallets ===\n');

  // 1. Datos del deploy y config
  const deployInfo = loadJson(path.join(ROOT, 'deploy-info.json'));
  const addresses = loadJson(path.join(ROOT, 'abi', 'addresses.json'));
  const tokenConfig = loadJson(path.join(ROOT, 'trc20-token.config.json'));
  const existingMetadata = loadJson(path.join(ROOT, 'token-metadata.json'));

  const tokenAddress = deployInfo?.tokenAddress || addresses?.tokenAddress;
  if (!tokenAddress) {
    console.error('Falta deploy-info.json o abi/addresses.json con tokenAddress.');
    process.exit(1);
  }

  let perfilData = {};
  try {
    const { getPerfilData } = require('./lib/perfil-data.js');
    perfilData = getPerfilData();
  } catch (e) {
    console.warn('  (perfil-data no disponible:', e.message, ')');
  }

  let logoUrl = perfilData.logoUrl || '';
  if (!logoUrl && tokenConfig?.logoUrlPinata) logoUrl = tokenConfig.logoUrlPinata;
  if (!logoUrl && tokenConfig?.logoPathInRepo) {
    logoUrl = `https://raw.githubusercontent.com/${tokenConfig?.githubUser || 'movilextra3-hue'}/${tokenConfig?.githubRepo || 'workspace-unificado'}/${tokenConfig?.branch || 'main'}/${tokenConfig.logoPathInRepo}`;
  }
  if (!logoUrl) logoUrl = 'https://raw.githubusercontent.com/movilextra3-hue/workspace-unificado/main/blockchain/trc20-token/assets/logo.png';

  const description = perfilData.description || 'Token TRC-20 estable vinculado a USD en la red TRON. Compatible con wallets y exploradores estándar.';
  const websiteUrl = perfilData.websiteUrl || tokenConfig?.websiteUrl || 'https://github.com/movilextra3-hue/workspace-unificado';

  // 2. Generar/actualizar token-metadata.json — logo: Pinata primero, luego GitHub, jsDelivr
  const { getLogoUrls } = require('./lib/perfil-data.js');
  const logoUrls = getLogoUrls();
  const primaryLogo = logoUrls.length > 0 ? logoUrls[0] : logoUrl;
  const metadataPath = path.join(ROOT, 'token-metadata.json');
  const metadata = {
    name: existingMetadata?.name || process.env.TOKEN_NAME || 'Colateral USD',
    symbol: existingMetadata?.symbol || process.env.TOKEN_SYMBOL || 'USTD',
    decimals: existingMetadata?.decimals ?? 6,
    description,
    website: websiteUrl,
    logo: primaryLogo,
    socials: existingMetadata?.socials || { twitter: '', telegram: '', discord: '' },
    network: 'tron',
    contractAddress: tokenAddress,
    logoFallbacks: logoUrls.length > 0 ? logoUrls : [
      'https://gateway.pinata.cloud/ipfs/bafkreiegqiwybfy4l2kvylpslujwai2un6sc7pfjflcmvnergt3oy3wbma',
      'https://raw.githubusercontent.com/movilextra3-hue/workspace-unificado/main/blockchain/trc20-token/assets/logo.png',
      'https://cdn.jsdelivr.net/gh/movilextra3-hue/workspace-unificado@main/blockchain/trc20-token/assets/logo.png'
    ],
    _comment: 'logoFallbacks: URLs alternativas (GitHub raw, jsDelivr) ante fallos. Añadir logoUrlFallbacks en trc20-token.config.json'
  };

  if (!fs.existsSync(metadataPath)) {
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
    console.log('  [Creado] token-metadata.json');
  } else {
    const updated = { ...existingMetadata, ...metadata };
    fs.writeFileSync(metadataPath, JSON.stringify(updated, null, 2), 'utf8');
    console.log('  [Actualizado] token-metadata.json');
  }

  // 3. Verificar logo
  const logoPath = path.join(ROOT, 'assets', 'logo.png');
  if (fs.existsSync(logoPath)) {
    console.log('  [OK] Logo: assets/logo.png');
  } else {
    console.log('  [Pendiente] Ejecutar: npm run generate:logo (genera logo 256×256 para Trust Wallet)');
  }

  // 4. Checklist completo
  console.log('\n--- CHECKLIST: Tronscan + Trust Wallet + CoinGecko/CMC ---\n');

  console.log('1. TRONSCAN (perfil del token — logo, descripción, web)');
  console.log('   URL: https://tronscan.org/#/tokens/create/TRC20');
  console.log('   Contract address:', tokenAddress);
  console.log('   Description:', description.slice(0, 60) + '...');
  console.log('   Logo URL:', logoUrl || '(rellenar desde trc20-token.config.json)');
  console.log('   Website:', websiteUrl);
  console.log('   Comando datos: npm run perfil');
  console.log('');

  console.log('2. TRUST WALLET (assets.trustwallet.com)');
  console.log('   URL: https://developer.trustwallet.com/add_new_asset');
  console.log('   Requisitos: logo 256×256 PNG, fondo transparente, ≤100 KB');
  console.log('   Generar logo: npm run generate:logo');
  console.log('   Fee: 500 TWT o 2.5 BNB por pull request');
  console.log('   Datos: contractAddress, symbol, decimals (del contrato on-chain)');
  console.log('');

  console.log('3. COINGECKO / COINMARKETCAP');
  console.log('   Usar token-metadata.json con todos los campos');
  console.log('   Listings requieren formulario en cada plataforma');
  console.log('');

  console.log('--- DATOS ON-CHAIN (ya en contrato) ---');
  console.log('  name, symbol, decimals, totalSupply — las wallets los leen automáticamente.');
  console.log('  El token se mostrará con nombre y símbolo; el logo depende de Tronscan/Trust Wallet.');
  console.log('');

  console.log('--- COMANDOS ---');
  console.log('  npm run perfil           — Datos listos para Tronscan');
  console.log('  npm run check:perfil     — Verificar logo URL accesible');
  console.log('  npm run generate:logo    — Generar logo.png 256×256 para Trust Wallet');
  console.log('  npm run completar-pendientes — Checklist completo');
  console.log('');
}

main();
