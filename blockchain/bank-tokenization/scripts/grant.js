'use strict';
const hre = require('hardhat');

async function main() {
  const busdtAddr = process.env.BUSDT_ADDR;
  const vaultAddr = process.env.VAULT_ADDR;

  if (!busdtAddr || !vaultAddr) {
    throw new Error('Set BUSDT_ADDR and VAULT_ADDR');
  }

  const busdt = await hre.ethers.getContractAt('BUSDT', busdtAddr);
  const MINTER_ROLE = await busdt.MINTER_ROLE();

  const [deployer] = await hre.ethers.getSigners();
  const hadMinter = await busdt.hasRole(MINTER_ROLE, deployer.address);
  if (hadMinter) {
    const txRevoke = await busdt.revokeRole(MINTER_ROLE, deployer.address);
    await txRevoke.wait();
    console.log('Revoked MINTER_ROLE from deployer');
  }

  const txGrant = await busdt.grantRole(MINTER_ROLE, vaultAddr);
  await txGrant.wait();
  console.log('Granted MINTER_ROLE to Vault:', vaultAddr);

  const isMinter = await busdt.hasRole(MINTER_ROLE, vaultAddr);
  if (!isMinter) throw new Error('Vault should have MINTER_ROLE');
  console.log('Done. Vault is the only minter for bUSDT.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
