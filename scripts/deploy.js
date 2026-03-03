'use strict';
/**
 * Wrapper para tronbox migrate — solo mainnet.
 * Uso: node scripts/deploy.js
 */
const { execSync } = require('child_process');

console.log('Ejecutando: tronbox migrate --network mainnet');
execSync('npx tronbox migrate --network mainnet', { stdio: 'inherit' });
