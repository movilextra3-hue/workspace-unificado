'use strict';
const hre = require('hardhat');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const admin = process.env.OPS_SAFE || deployer.address;
  const pauser = process.env.OPS_SAFE || deployer.address;
  const upgrader = process.env.TECH_SAFE || deployer.address;
  // Temporary minter until Vault is deployed; grant.js will set Vault as minter and revoke deployer
  const tempMinter = deployer.address;

  const BUSDT = await hre.ethers.getContractFactory('BUSDT');
  const impl = await BUSDT.deploy();
  await impl.waitForDeployment();
  const implAddress = await impl.getAddress();

  const initData = BUSDT.interface.encodeFunctionData('initialize', [
    admin,
    tempMinter,
    pauser,
    upgrader,
  ]);

  const Proxy = await hre.ethers.getContractFactory('Proxy');
  const proxy = await Proxy.deploy(implAddress, initData);
  await proxy.waitForDeployment();
  const proxyAddress = await proxy.getAddress();

  const busdt = BUSDT.attach(proxyAddress);
  const name = await busdt.name();
  const symbol = await busdt.symbol();

  console.log('BUSDT implementation:', implAddress);
  console.log('BUSDT proxy (use as BUSDT_ADDR):', proxyAddress);
  console.log('Token:', name, symbol);
  console.log('Admin:', admin, '| Pauser:', pauser, '| Upgrader:', upgrader);
  console.log('Next: deploy Vault, then run grant.js to set Vault as MINTER_ROLE.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
