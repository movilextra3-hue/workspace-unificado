'use strict';
/**
 * Reconciliation: bUSDT totalSupply() must equal USDT.balanceOf(Vault).
 * Usage: node reconciliation/reconciliation.js <BUSDT_ADDR> <USDT_ADDR> <VAULT_ADDR> [RPC_URL]
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', 'config', '.env') });
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { ethers } = require('ethers');

const busdtAddr = process.argv[2] || process.env.BUSDT_ADDR;
const usdtAddr = process.argv[3] || process.env.USDT_MAINNET || '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const vaultAddr = process.argv[4] || process.env.VAULT_ADDR;
const rpc = process.argv[5] || process.env.RPC_MAINNET || process.env.MAINNET_RPC || 'https://eth.llamarpc.com';

if (!busdtAddr || !vaultAddr) {
  console.error('Usage: node reconciliation.js <BUSDT_ADDR> <USDT_ADDR> <VAULT_ADDR> [RPC_URL]');
  console.error('Or set BUSDT_ADDR, USDT_MAINNET, VAULT_ADDR, RPC_MAINNET in .env');
  process.exit(1);
}

const abi = {
  busdt: ['function totalSupply() view returns (uint256)'],
  erc20: ['function balanceOf(address) view returns (uint256)'],
};

async function main() {
  const provider = new ethers.JsonRpcProvider(rpc);
  const busdt = new ethers.Contract(busdtAddr, abi.busdt, provider);
  const usdt = new ethers.Contract(usdtAddr, abi.erc20, provider);

  const supply = await busdt.totalSupply();
  const balance = await usdt.balanceOf(vaultAddr);

  const decimals = 6;
  const supplyFormatted = ethers.formatUnits(supply, decimals);
  const balanceFormatted = ethers.formatUnits(balance, decimals);

  console.log('bUSDT totalSupply():', supplyFormatted, 'USDT');
  console.log('USDT in Vault:      ', balanceFormatted, 'USDT');
  console.log('1:1 match:', supply === balance ? 'YES' : 'NO');
  if (supply !== balance) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
