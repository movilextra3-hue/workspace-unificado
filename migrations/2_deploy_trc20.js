'use strict';
/**
 * Despliegue upgradeable: Proxy + Implementation + ProxyAdmin.
 * La dirección del token es la del Proxy (permanente).
 * Genera deploy-info.json para compatibilidad con scripts/upgrade.js.
 */
const fs = require('fs');
const path = require('path');
const TRC20TokenUpgradeable = artifacts.require('TRC20TokenUpgradeable');
const TransparentUpgradeableProxy = artifacts.require('TransparentUpgradeableProxy');
const ProxyAdmin = artifacts.require('ProxyAdmin');

module.exports = async function (deployer, network, accounts) {
  const name = process.env.TOKEN_NAME || 'Mi Token';
  const symbol = process.env.TOKEN_SYMBOL || 'MTK';
  const decimals = parseInt(process.env.TOKEN_DECIMALS || '18', 10);
  const initialSupply = process.env.TOKEN_SUPPLY || '1000000';
  const initialOwner = accounts[0];

  await deployer.deploy(TRC20TokenUpgradeable);
  const impl = await TRC20TokenUpgradeable.deployed();

  await deployer.deploy(ProxyAdmin);
  const admin = await ProxyAdmin.deployed();

  await deployer.deploy(
    TransparentUpgradeableProxy,
    impl.address,
    admin.address,
    '0x'
  );

  const proxy = await TransparentUpgradeableProxy.deployed();
  const token = await TRC20TokenUpgradeable.at(proxy.address);
  await token.initialize(name, symbol, decimals, initialSupply, initialOwner);

  console.log('Token (Proxy):', proxy.address);
  console.log('Implementation:', impl.address);
  console.log('ProxyAdmin:', admin.address);

  if (['nile', 'shasta', 'mainnet'].includes(network)) {
    const deployInfo = {
      network,
      tokenAddress: proxy.address,
      implementationAddress: impl.address,
      proxyAdminAddress: admin.address,
      constructorParams: { name, symbol, decimals, initialSupply },
      deployedAt: new Date().toISOString(),
      deployedVia: 'tronbox migrate'
    };
    const deployInfoPath = path.join(__dirname, '..', 'deploy-info.json');
    fs.writeFileSync(deployInfoPath, JSON.stringify(deployInfo, null, 2));
    console.log('deploy-info.json generado (compatible con npm run upgrade)');
  }
};
