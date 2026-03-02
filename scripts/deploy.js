'use strict';
/**
 * Wrapper para tronbox migrate.
 * Uso: node scripts/deploy.js nile|shasta|mainnet
 */
const { execSync } = require('child_process');

const network = process.argv[2] || 'nile';
const valid = ['nile', 'shasta', 'mainnet'];
if (!valid.includes(network)) {
  console.error('Red no válida. Usar: nile, shasta, mainnet');
  process.exit(1);
}

console.log(`Ejecutando: tronbox migrate --network ${network}`);
execSync(`npx tronbox migrate --network ${network}`, { stdio: 'inherit' });
