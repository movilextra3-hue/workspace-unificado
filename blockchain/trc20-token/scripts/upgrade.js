/**
 * Actualiza el proxy a una nueva implementación.
 * Usa deploy-info.json para obtener proxy y ProxyAdmin.
 * Despliega la implementación actual (build) y ejecuta ProxyAdmin.upgrade.
 * Uso: node scripts/upgrade.js mainnet (solo mainnet)
 */
'use strict';
require('dotenv').config();
const TronWeb = require('tronweb');
const path = require('node:path');
const fs = require('node:fs');

const MAINNET = { fullHost: 'https://api.trongrid.io' };

async function upgrade() {
  const networkName = (process.argv[2] || 'mainnet').toLowerCase();
  if (networkName !== 'mainnet') {
    console.error('Solo mainnet. Uso: node scripts/upgrade.js mainnet');
    process.exit(1);
  }
  const net = MAINNET;

  const privateKey = (process.env.PRIVATE_KEY || '').replace(/^0x/, '').trim();
  if (!privateKey || !/^[a-fA-F0-9]{64}$/.test(privateKey)) {
    console.error('Falta o PRIVATE_KEY inválido en .env (64 caracteres hex, sin 0x)');
    process.exit(1);
  }

  const tronWebConfig = {
    fullHost: net.fullHost,
    privateKey,
    timeout: 60000 // 60s para deploy/broadcast (TronGrid puede tardar con payload grande)
  };
  if (process.env.TRON_PRO_API_KEY) {
    tronWebConfig.headers = { 'TRON-PRO-API-KEY': process.env.TRON_PRO_API_KEY };
  }

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
  if (deployInfo.network !== networkName) {
    console.error(`deploy-info.json es de red "${deployInfo.network}", no "${networkName}"`);
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
  const bc = (implArtifact.bytecode || '').replace(/^0x/, '');
  if (!bc || bc.length < 100) {
    console.error('Implementation sin bytecode válido. Ejecutar: npm run compile');
    process.exit(1);
  }
  if (!implArtifact.abi || !Array.isArray(implArtifact.abi) || implArtifact.abi.length === 0) {
    console.error('Implementation sin ABI. Ejecutar: npm run compile');
    process.exit(1);
  }
  if (!adminArtifact.abi || !Array.isArray(adminArtifact.abi)) {
    console.error('ProxyAdmin sin ABI. Ejecutar: npm run compile');
    process.exit(1);
  }

  const ownerAddr = tronWeb.defaultAddress.base58;

  console.log(`Upgrade en ${networkName}: Proxy ${proxyAddr}`);
  console.log('Desplegando nueva implementación...');

  // feeLimit: ~800 TRX para Implementation (~12KB). Sin energy se quema TRX (280 sun/energy).
  // Contrato grande: 12KB*200 energy/byte = 2.4M energy. 800 TRX evita fallo por límite bajo.
  const implTx = await tronWeb.transactionBuilder.createSmartContract(
    {
      abi: JSON.stringify(implArtifact.abi),
      bytecode: (implArtifact.bytecode || '').replace(/^0x/, ''),
      feeLimit: 800 * 1e6,
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
  // feeLimit: 200 TRX suficiente para upgrade (tx simple).
  await proxyAdmin.upgrade(proxyAddr, newImplAddress).send({ feeLimit: 200 * 1e6 });
  console.log('Upgrade completado.');

  deployInfo.implementationAddress = newImplAddress;
  deployInfo.lastUpgrade = new Date().toISOString();
  fs.writeFileSync(deployInfoPath, JSON.stringify(deployInfo, null, 2));
  console.log('deploy-info.json actualizado.');

  // Sincronizar abi/addresses.json para que revisar-contratos, set-symbol, check-alignment usen la impl correcta
  const addrPath = path.join(__dirname, '..', 'abi', 'addresses.json');
  const abiDir = path.join(__dirname, '..', 'abi');
  try {
    let addrs = {};
    if (fs.existsSync(addrPath)) {
      addrs = JSON.parse(fs.readFileSync(addrPath, 'utf8'));
    }
    addrs.tokenAddress = deployInfo.tokenAddress;
    addrs.implementationAddress = newImplAddress;
    addrs.proxyAdminAddress = deployInfo.proxyAdminAddress;
    addrs.updatedAt = new Date().toISOString();
    if (!fs.existsSync(abiDir)) fs.mkdirSync(abiDir, { recursive: true });
    fs.writeFileSync(addrPath, JSON.stringify(addrs, null, 2));
    console.log('abi/addresses.json actualizado.');
  } catch (e) {
    console.warn('No se pudo actualizar abi/addresses.json:', e.message);
  }

  console.log('');
  console.log('Siguiente: verificar nueva Implementation en Tronscan');
  console.log('  - Carpeta: verification/PAQUETE-VERIFICACION-POST-UPGRADE/');
  console.log('  - Dirección a verificar:', newImplAddress);
  console.log('  - Parámetros: PARAMETROS-TRONSCAN.txt');
  console.log('  Opcional: node scripts/initialize-v2.js mainnet 2 max (si se necesita version/cap)');
  console.log('');
}

upgrade().catch(err => {
  console.error(err);
  process.exit(1);
});
