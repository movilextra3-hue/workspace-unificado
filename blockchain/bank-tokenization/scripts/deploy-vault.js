'use strict';
const hre = require('hardhat');

async function main() {
  const busdtAddr = process.env.BUSDT_ADDR;
  const usdtAddr = process.env.USDT_MAINNET || '0xdAC17F958D2ee523a2206206994597C13D831ec7';
  const treasury = process.env.TREASURY;
  const oracle = process.env.ORACLE;

  if (!busdtAddr) {
    throw new Error('Set BUSDT_ADDR (from deploy-busdt output)');
  }
  if (!treasury || !oracle) {
    throw new Error('Set TREASURY and ORACLE in config/.env (or .env)');
  }

  const BUSDTVault = await hre.ethers.getContractFactory('BUSDTVault');
  const vault = await BUSDTVault.deploy(busdtAddr, usdtAddr, treasury, oracle);
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();

  console.log('BUSDTVault deployed:', vaultAddress);
  console.log('bUSDT:', busdtAddr, '| USDT:', usdtAddr, '| Treasury:', treasury, '| Oracle:', oracle);
  console.log('Next: set VAULT_ADDR and run grant.js to grant MINTER_ROLE to Vault.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
