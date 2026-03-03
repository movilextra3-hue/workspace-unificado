/**
 * Actualiza el proxy a una nueva implementación en MAINNET.
 * Usa deploy-info.json para obtener proxy y ProxyAdmin.
 * Uso: node scripts/upgrade.js
 */
'use strict';
require('dotenv').config();
const TronWeb = require('tronweb');
const path = require('path');
const fs = require('fs');

const MAINNET = { fullHost: 'https://api.trongrid.io' };

async function upgrade() {
  const networkName = 'mainnet';
  const net = MAINNET;

  const privateKey = (process.env.PRIVATE_KEY || '').replace(/^0x/, '').trim();
  if (!privateKey || !/^[a-fA-F0-9]{64}$/.test(privateKey)) {
    console.error('Falta o PRIVATE_KEY inválido en .env (64 caracteres hex, sin 0x)');
    process.exit(1);
  }

  const apiKey = (process.env.TRON_PRO_API_KEY || '').trim();
  if (!apiKey) {
    console.error('TRON_PRO_API_KEY obligatoria en .env para mainnet (https://www.trongrid.io/)');
    process.exit(1);
  }

  const tronWebConfig = {
    fullHost: net.fullHost,
    privateKey,
    headers: { 'TRON-PRO-API-KEY': apiKey }
  };

  const deployInfoPath = path.join(__dirname, '..', 'deploy-info.json');
  if (!fs.existsSync(deployInfoPath)) {
    console.error('Falta deploy-info.json. Ejecutar deploy primero.');
    process.exit(1);
  }
  let deployInfo;
  try {
    deployInfo = JSON.parse(fs.readFileSync(deployInfoPath, 'utf8'));
  } catch (e) {
    console.error('deploy-info.json inválido o corrupto:', e.message);
    process.exit(1);
  }
  if (deployInfo.network && deployInfo.network !== 'mainnet') {
    console.error('Este proyecto está configurado solo para mainnet. deploy-info.json debe ser de mainnet.');
    process.exit(1);
  }

  const { tokenAddress: proxyAddress, proxyAdminAddress } = deployInfo;
  if (!proxyAddress || !proxyAdminAddress) {
    console.error('deploy-info.json debe tener tokenAddress y proxyAdminAddress');
    process.exit(1);
  }
  if (!/^T[A-HJ-NP-Za-km-z1-9]{33}$/.test(proxyAddress) && !/^41[a-fA-F0-9]{40}$/.test(proxyAddress)) {
    console.error('deploy-info.json: tokenAddress no es una dirección TRON válida');
    process.exit(1);
  }
  if (!/^T[A-HJ-NP-Za-km-z1-9]{33}$/.test(proxyAdminAddress) && !/^41[a-fA-F0-9]{40}$/.test(proxyAdminAddress)) {
    console.error('deploy-info.json: proxyAdminAddress no es una dirección TRON válida');
    process.exit(1);
  }

  const tronWeb = new TronWeb(tronWebConfig);

  // Normalizar direcciones a base58 para TronWeb (acepta hex en deploy-info.json)
  const toBase58 = (addr) => (/^41[a-fA-F0-9]{40}$/.test(addr) ? tronWeb.address.fromHex(addr) : addr);
  const proxyAddr = toBase58(proxyAddress);
  const adminAddr = toBase58(proxyAdminAddress);

  const buildDir = path.join(__dirname, '..', 'build', 'contracts');
  const implPath = path.join(buildDir, 'TRC20TokenUpgradeable.json');
  if (!fs.existsSync(implPath)) {
    console.error('Ejecutar npm run compile primero.');
    process.exit(1);
  }
  let implArtifact, adminArtifact;
  try {
    implArtifact = JSON.parse(fs.readFileSync(implPath, 'utf8'));
    adminArtifact = JSON.parse(fs.readFileSync(path.join(buildDir, 'ProxyAdmin.json'), 'utf8'));
  } catch (e) {
    console.error('Error leyendo artifacts de build:', e.message);
    process.exit(1);
  }

  const ownerAddr = tronWeb.defaultAddress.base58;

  console.log(`Upgrade en ${networkName}: Proxy ${proxyAddr}`);
  console.log('Desplegando nueva implementación...');

  const implTx = await tronWeb.transactionBuilder.createSmartContract(
    {
      abi: JSON.stringify(implArtifact.abi),
      bytecode: (implArtifact.bytecode || '').replace(/^0x/, ''),
      feeLimit: 1000 * 1e6,
      name: 'TRC20TokenUpgradeable'
    },
    ownerAddr
  );
  const implSigned = await tronWeb.trx.sign(implTx);
  const implResult = await tronWeb.trx.sendRawTransaction(implSigned);
  if (!implResult.result) throw new Error(implResult.message || 'Deploy Implementation failed');
  const newImplAddress = tronWeb.address.fromHex(implTx.contract_address);
  console.log('Nueva Implementation:', newImplAddress);

  const proxyAdmin = await tronWeb.contract(adminArtifact.abi, adminAddr);
  await proxyAdmin.upgrade(proxyAddr, newImplAddress).send({ feeLimit: 500 * 1e6 });
  console.log('Upgrade completado.');

  deployInfo.implementationAddress = newImplAddress;
  deployInfo.lastUpgrade = new Date().toISOString();
  fs.writeFileSync(deployInfoPath, JSON.stringify(deployInfo, null, 2));
  console.log('deploy-info.json actualizado.');
}

upgrade().catch(err => {
  console.error(err);
  process.exit(1);
});
