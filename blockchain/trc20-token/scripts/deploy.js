'use strict';
/**
 * Wrapper para tronbox migrate. Solo mainnet.
 * Uso: node scripts/deploy.js mainnet
 */
const { execSync } = require('child_process');

const network = (process.argv[2] || 'mainnet').toLowerCase();
if (network !== 'mainnet') {
  console.error('Solo mainnet. Uso: node scripts/deploy.js mainnet');
  process.exit(1);
}

console.log(`Ejecutando: tronbox migrate --network ${network}`);
execSync(`npx tronbox migrate --network ${network}`, { stdio: 'inherit' });
