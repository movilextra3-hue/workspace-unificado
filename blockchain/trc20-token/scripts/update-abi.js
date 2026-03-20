#!/usr/bin/env node
'use strict';
/**
 * Actualiza/exporta el ABI del token y contratos para frontends y documentación.
 * Lee build/contracts/*.json y deploy-info.json (si existe) y escribe en abi/:
 *   - token-abi.json: ABI de TRC20TokenUpgradeable + tokenAddress (Proxy) para DApps
 *   - TRC20TokenUpgradeable-abi.json: solo ABI del token
 *   - ProxyAdmin-abi.json: solo ABI del ProxyAdmin
 *   - TransparentUpgradeableProxy-abi.json: solo ABI del Proxy
 *
 * Requisito: npm run compile (build/contracts debe existir).
 * Uso: node scripts/update-abi.js   o   npm run update:abi
 */
const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.join(__dirname, '..');
const BUILD_DIR = path.join(ROOT, 'build', 'contracts');
const ABI_DIR = path.join(ROOT, 'abi');
const DEPLOY_INFO_PATH = path.join(ROOT, 'deploy-info.json');

function loadArtifact(name) {
  const p = path.join(BUILD_DIR, `${name}.json`);
  if (!fs.existsSync(p)) {
    throw new Error(`Falta ${name}.json. Ejecuta: npm run compile`);
  }
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function main() {
  if (!fs.existsSync(BUILD_DIR)) {
    console.error('No existe build/contracts. Ejecuta: npm run compile');
    process.exit(1);
  }

  const impl = loadArtifact('TRC20TokenUpgradeable');
  const proxy = loadArtifact('TransparentUpgradeableProxy');
  const admin = loadArtifact('ProxyAdmin');

  let tokenAddress = '';
  let implementationAddress = '';
  let proxyAdminAddress = '';
  if (fs.existsSync(DEPLOY_INFO_PATH)) {
    try {
      const info = JSON.parse(fs.readFileSync(DEPLOY_INFO_PATH, 'utf8'));
      tokenAddress = info.tokenAddress || '';
      implementationAddress = info.implementationAddress || '';
      proxyAdminAddress = info.proxyAdminAddress || '';
    } catch (e) {
      console.warn('deploy-info.json no leído:', e.message);
    }
  }

  if (!fs.existsSync(ABI_DIR)) {
    fs.mkdirSync(ABI_DIR, { recursive: true });
  }

  // Para DApps: ABI del token + dirección del Proxy (la que usan los usuarios)
  const tokenAbiWithAddress = {
    contractName: 'TRC20TokenUpgradeable',
    address: tokenAddress,
    abi: impl.abi,
    note: 'Usar esta dirección (Proxy) para transfer, balanceOf, approve, etc.'
  };
  fs.writeFileSync(
    path.join(ABI_DIR, 'token-abi.json'),
    JSON.stringify(tokenAbiWithAddress, null, 2)
  );

  fs.writeFileSync(
    path.join(ABI_DIR, 'TRC20TokenUpgradeable-abi.json'),
    JSON.stringify(impl.abi, null, 2)
  );
  fs.writeFileSync(
    path.join(ABI_DIR, 'ProxyAdmin-abi.json'),
    JSON.stringify(admin.abi, null, 2)
  );
  fs.writeFileSync(
    path.join(ABI_DIR, 'TransparentUpgradeableProxy-abi.json'),
    JSON.stringify(proxy.abi, null, 2)
  );

  const addresses = {
    tokenAddress,
    implementationAddress,
    proxyAdminAddress,
    updatedAt: new Date().toISOString()
  };
  fs.writeFileSync(
    path.join(ABI_DIR, 'addresses.json'),
    JSON.stringify(addresses, null, 2)
  );

  // ABI + direcciones + metadata del token (nombre, símbolo, decimales) para DApps/frontends
  let tokenName = 'Colateral USD';
  let tokenSymbol = 'USTD';
  let tokenDecimals = 6;
  const configPath = path.join(ROOT, 'trc20-token.config.json');
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.tokenName != null) tokenName = config.tokenName;
      if (config.tokenSymbol != null) tokenSymbol = config.tokenSymbol;
      if (config.tokenDecimals != null) tokenDecimals = config.tokenDecimals;
    } catch (e) { /* defaults */ }
  }
  const tokenInfo = {
    contractName: 'TRC20TokenUpgradeable',
    address: tokenAddress,
    abi: impl.abi,
    name: tokenName,
    symbol: tokenSymbol,
    decimals: tokenDecimals,
    network: 'tron-mainnet',
    updatedAt: new Date().toISOString()
  };
  fs.writeFileSync(
    path.join(ABI_DIR, 'token-info.json'),
    JSON.stringify(tokenInfo, null, 2)
  );

  console.log('ABI actualizado en abi/');
  console.log('  - token-abi.json (ABI + tokenAddress para DApps)');
  console.log('  - token-info.json (ABI + address + name, symbol, decimals)');
  console.log('  - TRC20TokenUpgradeable-abi.json');
  console.log('  - ProxyAdmin-abi.json');
  console.log('  - TransparentUpgradeableProxy-abi.json');
  console.log('  - addresses.json');
  if (tokenAddress) {
    console.log('');
    console.log('Token (Proxy) para frontends:', tokenAddress);
  }
}

main();
