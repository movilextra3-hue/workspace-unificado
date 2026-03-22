#!/usr/bin/env node
'use strict';
/**
 * Llama setSymbol en el proxy (token). Requiere implementation con setSymbol (tras upgrade).
 * Uso: node scripts/set-symbol.js [SYMBOL]
 * Por defecto: USDT (mainnet)
 */
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { TronWeb } = require('tronweb');
const fs = require('node:fs');

const DEFAULT_SYMBOL = 'USDT';
const MAINNET = { fullHost: 'https://api.trongrid.io' };

async function main() {
  const symbol = (process.argv[2] || process.env.TOKEN_SYMBOL || DEFAULT_SYMBOL).trim();
  if (!symbol || symbol.length > 32) {
    console.error('Símbolo inválido. Uso: node scripts/set-symbol.js USDT');
    process.exit(1);
  }

  const privateKey = (process.env.PRIVATE_KEY || '').replace(/^0x/, '').trim();
  if (!privateKey || !/^[a-fA-F0-9]{64}$/.test(privateKey)) {
    console.error('Falta o PRIVATE_KEY inválido en .env');
    process.exit(1);
  }

  const apiKey = (process.env.TRON_PRO_API_KEY || '').trim();
  if (!apiKey) {
    console.error('TRON_PRO_API_KEY obligatoria en .env para mainnet');
    process.exit(1);
  }

  const deployInfoPath = path.join(__dirname, '..', 'deploy-info.json');
  const addressesPath = path.join(__dirname, '..', 'abi', 'addresses.json');
  let proxyAddr = null;

  if (fs.existsSync(deployInfoPath)) {
    const deployInfo = JSON.parse(fs.readFileSync(deployInfoPath, 'utf8'));
    proxyAddr = deployInfo.tokenAddress;
  }
  if (!proxyAddr && fs.existsSync(addressesPath)) {
    const addrs = JSON.parse(fs.readFileSync(addressesPath, 'utf8'));
    proxyAddr = addrs.tokenAddress;
  }
  if (!proxyAddr) {
    console.error('Falta deploy-info.json o abi/addresses.json con tokenAddress');
    process.exit(1);
  }

  const implPath = path.join(__dirname, '..', 'build', 'contracts', 'TRC20TokenUpgradeable.json');
  if (!fs.existsSync(implPath)) {
    console.error('Ejecutar npm run compile primero');
    process.exit(1);
  }
  const implArtifact = JSON.parse(fs.readFileSync(implPath, 'utf8'));

  const tronWeb = new TronWeb({
    fullHost: MAINNET.fullHost,
    privateKey,
    headers: { 'TRON-PRO-API-KEY': apiKey }
  });

  const token = await tronWeb.contract(implArtifact.abi, proxyAddr);
  console.log('Llamando setSymbol("' + symbol + '") en proxy', proxyAddr);
  await token.setSymbol(symbol).send({ feeLimit: 300_000 });
  console.log('Symbol actualizado a', symbol);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
