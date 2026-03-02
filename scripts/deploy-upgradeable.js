'use strict';
/**
 * Despliegue upgradeable: Proxy + Implementation + ProxyAdmin.
 * La dirección del TOKEN es la del Proxy (permanente).
 * Uso: node scripts/deploy-upgradeable.js nile|shasta|mainnet
 */
require('dotenv').config();
const TronWeb = require('tronweb');
const path = require('path');
const fs = require('fs');

const networks = {
  nile: { fullHost: 'https://nile.trongrid.io' },
  shasta: { fullHost: 'https://api.shasta.trongrid.io' },
  mainnet: { fullHost: 'https://api.trongrid.io' }
};

async function deploy() {
  const networkName = process.argv[2] || 'nile';
  const net = networks[networkName];
  if (!net) {
    console.error('Red no válida. Usar: nile, shasta, mainnet');
    process.exit(1);
  }

  const privateKey = (process.env.PRIVATE_KEY || '').replace(/^0x/, '').trim();
  if (!privateKey || !/^[a-fA-F0-9]{64}$/.test(privateKey)) {
    console.error('Falta o PRIVATE_KEY inválido en .env (64 caracteres hex, sin 0x)');
    process.exit(1);
  }

  const tronWebConfig = {
    fullHost: net.fullHost,
    privateKey
  };
  if (process.env.TRON_PRO_API_KEY) {
    tronWebConfig.headers = { 'TRON-PRO-API-KEY': process.env.TRON_PRO_API_KEY };
  }
  const tronWeb = new TronWeb(tronWebConfig);

  const buildDir = path.join(__dirname, '..', 'build', 'contracts');
  const loadArtifact = (name) => {
    const p = path.join(buildDir, `${name}.json`);
    if (!fs.existsSync(p)) throw new Error(`Ejecutar npm run compile. Falta ${name}.json`);
    try {
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch (e) {
      throw new Error(`${name}.json inválido o corrupto: ${e.message}`);
    }
  };

  const implArtifact = loadArtifact('TRC20TokenUpgradeable');
  const proxyArtifact = loadArtifact('TransparentUpgradeableProxy');
  const adminArtifact = loadArtifact('ProxyAdmin');

  const name = process.env.TOKEN_NAME || 'Mi Token';
  const symbol = process.env.TOKEN_SYMBOL || 'MTK';
  const decimals = parseInt(process.env.TOKEN_DECIMALS || '18', 10);
  if (isNaN(decimals) || decimals < 0 || decimals > 255) {
    console.error('TOKEN_DECIMALS debe ser un número entre 0 y 255');
    process.exit(1);
  }
  const initialSupplyStr = (process.env.TOKEN_SUPPLY || '1000000').trim();
  if (!/^\d+$/.test(initialSupplyStr)) {
    console.error('TOKEN_SUPPLY debe ser entero positivo');
    process.exit(1);
  }
  const initialSupply = initialSupplyStr;
  const ownerAddr = tronWeb.defaultAddress.base58;

  console.log(`Desplegando upgradeable en ${networkName}...`);
  console.log(`Token: ${name} (${symbol}), owner: ${ownerAddr}`);

  // 1. Deploy Implementation
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
  const implAddress = tronWeb.address.fromHex(implTx.contract_address);
  console.log('Implementation:', implAddress);

  // 2. Deploy ProxyAdmin
  const adminTx = await tronWeb.transactionBuilder.createSmartContract(
    {
      abi: JSON.stringify(adminArtifact.abi),
      bytecode: (adminArtifact.bytecode || '').replace(/^0x/, ''),
      feeLimit: 500 * 1e6,
      name: 'ProxyAdmin'
    },
    ownerAddr
  );
  const adminSigned = await tronWeb.trx.sign(adminTx);
  const adminResult = await tronWeb.trx.sendRawTransaction(adminSigned);
  if (!adminResult.result) throw new Error(adminResult.message || 'Deploy ProxyAdmin failed');
  const adminAddress = tronWeb.address.fromHex(adminTx.contract_address);
  console.log('ProxyAdmin:', adminAddress);

  // 3. Deploy Proxy (logic, admin, _data=0x - inicializamos después)
  const proxyParams = tronWeb.utils.abi.encodeParams(
    ['address', 'address', 'bytes'],
    [implAddress, adminAddress, '0x']
  );

  const proxyTx = await tronWeb.transactionBuilder.createSmartContract(
    {
      abi: JSON.stringify(proxyArtifact.abi),
      bytecode: (proxyArtifact.bytecode || '').replace(/^0x/, ''),
      parameters: proxyParams.replace(/^0x/, ''),
      feeLimit: 1500 * 1e6,
      name: 'TransparentUpgradeableProxy'
    },
    ownerAddr
  );

  const proxySigned = await tronWeb.trx.sign(proxyTx);
  const proxyResult = await tronWeb.trx.sendRawTransaction(proxySigned);
  if (!proxyResult.result) throw new Error(proxyResult.message || 'Deploy Proxy failed');
  const proxyAddress = tronWeb.address.fromHex(proxyTx.contract_address);

  // 4. Llamar initialize en el proxy (delega a implementation)
  const tokenContract = await tronWeb.contract(implArtifact.abi, proxyAddress);
  await tokenContract.initialize(name, symbol, decimals, initialSupply, ownerAddr).send({ feeLimit: 500 * 1e6 });

  console.log('\n=== TOKEN ADDRESS (permanente) ===');
  console.log(proxyAddress);
  console.log('\nPara actualizar en el futuro: ProxyAdmin.upgrade(proxy, nuevaImplementation)');

  const deployInfo = {
    network: networkName,
    tokenAddress: proxyAddress,
    implementationAddress: implAddress,
    proxyAdminAddress: adminAddress,
    constructorParams: { name, symbol, decimals, initialSupply },
    deployedAt: new Date().toISOString()
  };
  fs.writeFileSync(path.join(__dirname, '..', 'deploy-info.json'), JSON.stringify(deployInfo, null, 2));
  console.log('\nInfo guardada en deploy-info.json');
  console.log('\nPerfil Tronscan (logo, descripción, web): ejecuta');
  console.log('  node scripts/post-deploy-perfil.js');
  console.log('y pega los datos en Tronscan. Ver docs/TRONSCAN_DATOS_PEGAR.md');
}

deploy().catch(err => {
  console.error(err);
  process.exit(1);
});
