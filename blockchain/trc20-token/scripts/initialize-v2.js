'use strict';
/**
 * Llama a initializeV2(version, cap) en el token (vía proxy).
 * Usar tras un upgrade cuando la nueva implementación expone initializeV2.
 * Uso: node scripts/initialize-v2.js mainnet [version] [cap]
 * - version: número de versión (default 2)
 * - cap: supply máximo en unidades mínimas; "max" = type(uint256).max (default "max")
 */
require('dotenv').config();
const TronWeb = require('tronweb');
const path = require('path');
const fs = require('fs');

const MAINNET = { fullHost: 'https://api.trongrid.io' };

async function main() {
  const networkName = (process.argv[2] || 'mainnet').toLowerCase();
  if (networkName !== 'mainnet') {
    console.error('Solo mainnet. Uso: node scripts/initialize-v2.js mainnet [version] [cap]');
    process.exit(1);
  }
  const net = MAINNET;
  const versionArg = process.argv[3] || '2';
  const capArg = (process.argv[4] || 'max').toLowerCase();

  const privateKey = (process.env.PRIVATE_KEY || '').replace(/^0x/, '').trim();
  if (!privateKey || !/^[a-fA-F0-9]{64}$/.test(privateKey)) {
    console.error('Falta o PRIVATE_KEY inválido en .env');
    process.exit(1);
  }

  const tronWebConfig = { fullHost: net.fullHost || MAINNET.fullHost, privateKey };
  if (process.env.TRON_PRO_API_KEY) {
    tronWebConfig.headers = { 'TRON-PRO-API-KEY': process.env.TRON_PRO_API_KEY };
  }
  const tronWeb = new TronWeb(tronWebConfig);

  const deployInfoPath = path.join(__dirname, '..', 'deploy-info.json');
  if (!fs.existsSync(deployInfoPath)) {
    console.error('Falta deploy-info.json. Ejecutar deploy primero.');
    process.exit(1);
  }
  let deployInfo;
  try {
    deployInfo = JSON.parse(fs.readFileSync(deployInfoPath, 'utf8'));
  } catch (e) {
    console.error('deploy-info.json inválido:', e.message);
    process.exit(1);
  }

  if (deployInfo.network !== networkName) {
    console.error(`deploy-info.json es de red "${deployInfo.network}", no "${networkName}"`);
    process.exit(1);
  }

  const proxyAddress = deployInfo.tokenAddress;
  if (!proxyAddress) {
    console.error('deploy-info.json debe tener tokenAddress');
    process.exit(1);
  }

  const version = parseInt(versionArg, 10);
  if (isNaN(version) || version < 2) {
    console.error('version debe ser un número >= 2');
    process.exit(1);
  }

  let cap;
  if (capArg === 'max') {
    cap = '115792089237316195423570985008687907853269984665640564039457584007913129639935';
  } else {
    const capNum = BigInt(capArg);
    if (capNum < 0n) {
      console.error('cap debe ser positivo o "max"');
      process.exit(1);
    }
    cap = capNum.toString();
  }

  const buildDir = path.join(__dirname, '..', 'build', 'contracts');
  const implPath = path.join(buildDir, 'TRC20TokenUpgradeable.json');
  if (!fs.existsSync(implPath)) {
    console.error('Ejecutar npm run compile primero.');
    process.exit(1);
  }
  const implArtifact = JSON.parse(fs.readFileSync(implPath, 'utf8'));

  const token = await tronWeb.contract(implArtifact.abi, proxyAddress);
  const capDecimal = capArg === 'max' ? 'type(uint256).max' : capArg;
  console.log(`Llamando initializeV2(${version}, ${capDecimal}) en ${proxyAddress}...`);

  await token.initializeV2(version, cap).send({ feeLimit: 500 * 1e6 });

  console.log('initializeV2 ejecutado correctamente.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
