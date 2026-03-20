#!/usr/bin/env node
'use strict';
/**
 * Llama a initialize() en un Proxy ya desplegado (cuando el deploy falló justo después de desplegar Proxy).
 * Uso: node scripts/initialize-proxy-once.js <proxyAddress>
 * Ejemplo: node scripts/initialize-proxy-once.js TDUPqTHo1mCTMUxajReCrmEF9eS86ymNVh
 */
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { TronWeb } = require('tronweb');
const fs = require('node:fs');

const ROOT = path.join(__dirname, '..');
function getProxyAddress() {
  if (process.argv[2] && process.argv[2].startsWith('T')) return process.argv[2];
  if (process.env.PROXY_ADDRESS && process.env.PROXY_ADDRESS.startsWith('T')) return process.env.PROXY_ADDRESS;
  try {
    const addrPath = path.join(ROOT, 'abi', 'addresses.json');
    if (fs.existsSync(addrPath)) {
      const j = JSON.parse(fs.readFileSync(addrPath, 'utf8'));
      if (j.tokenAddress && j.tokenAddress.startsWith('T')) return j.tokenAddress;
    }
    const deployPath = path.join(ROOT, 'deploy-info.json');
    if (fs.existsSync(deployPath)) {
      const j = JSON.parse(fs.readFileSync(deployPath, 'utf8'));
      if (j.tokenAddress && j.tokenAddress.startsWith('T')) return j.tokenAddress;
    }
  } catch (_e) { /* ignore */ }
  return null;
}
const proxyAddress = getProxyAddress();
if (!proxyAddress) {
  console.error('Uso: node scripts/initialize-proxy-once.js [proxyAddress]');
  console.error('  O definir PROXY_ADDRESS en .env, o tener abi/addresses.json / deploy-info.json con tokenAddress.');
  console.error('Ejemplo: node scripts/initialize-proxy-once.js TV4P3sVfSQULNnsCPyzLnofCbK6cwkHeDm');
  process.exit(1);
}

const privateKey = (process.env.PRIVATE_KEY || '').replace(/^0x/i, '').trim();
const apiKey = (process.env.TRON_PRO_API_KEY || '').trim();
if (!privateKey || !apiKey) {
  console.error('Faltan PRIVATE_KEY o TRON_PRO_API_KEY en .env');
  process.exit(1);
}

const buildDir = path.join(ROOT, 'build', 'contracts');
const implArtifact = JSON.parse(fs.readFileSync(path.join(buildDir, 'TRC20TokenUpgradeable.json'), 'utf8'));
const name = process.env.TOKEN_NAME || 'Mi Token';
const symbol = process.env.TOKEN_SYMBOL || 'USTD';
const decimals = Math.max(0, Math.min(255, parseInt(process.env.TOKEN_DECIMALS || '18', 10)));
const supplyStr = (process.env.TOKEN_SUPPLY || '1000000').trim();
if (!/^\d+$/.test(supplyStr)) {
  console.error('TOKEN_SUPPLY debe ser entero positivo.');
  process.exit(1);
}
const initialSupply = parseInt(supplyStr, 10);

async function main() {
  const tronWeb = new TronWeb({
    fullHost: 'https://api.trongrid.io',
    privateKey,
    headers: { 'TRON-PRO-API-KEY': apiKey }
  });
  const ownerAddr = tronWeb.defaultAddress.base58;

  console.log('Inicializando token en Proxy:', proxyAddress);
  const tokenContract = await tronWeb.contract(implArtifact.abi, proxyAddress);
  await tokenContract.initialize(name, symbol, decimals, initialSupply, ownerAddr).send({ feeLimit: 50000000 });
  console.log('initialize() ejecutado correctamente.');

  const implAddress = process.env.IMPL_ADDRESS || '';
  const adminAddress = (process.env.PROXY_ADMIN_ADDRESS || '').trim();
  const deployInfo = {
    network: 'mainnet',
    tokenAddress: proxyAddress,
    implementationAddress: implAddress || '(consultar en Tronscan)',
    proxyAdminAddress: adminAddress,
    constructorParams: { name, symbol, decimals, initialSupply },
    deployedAt: new Date().toISOString(),
    deployedVia: 'scripts/initialize-proxy-once.js (post-initialize)'
  };
  fs.writeFileSync(path.join(ROOT, 'deploy-info.json'), JSON.stringify(deployInfo, null, 2));
  console.log('deploy-info.json actualizado. Token (Proxy):', proxyAddress);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
