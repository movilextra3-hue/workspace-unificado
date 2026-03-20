#!/usr/bin/env node
'use strict';
/**
 * Tras el despliegue: lee deploy-info.json o abi/addresses.json e imprime todo lo necesario para
 * completar el perfil en Tronscan. Usa getPerfilData (lib) o .env / trc20-token.config.json.
 */
let tokenAddress, description, websiteUrl, logoUrl;
try {
  const { getPerfilData } = require('./lib/perfil-data.js');
  const data = getPerfilData();
  tokenAddress = data.tokenAddress;
  description = data.description;
  websiteUrl = data.websiteUrl;
  logoUrl = data.logoUrl;
} catch (e) {
  console.error('Error:', e.message);
  process.exit(1);
}

const tronscanUrl = 'https://tronscan.org/#/tokens/create/TRC20';

console.log('');
console.log('========== PERFIL TRONSCAN — DATOS LISTOS PARA PEGAR ==========');
console.log('');
console.log('1. Dirección del contrato (tokenAddress / Proxy):');
console.log('   ' + tokenAddress);
console.log('');
console.log('2. Abre esta URL y conecta tu wallet (owner):');
console.log('   ' + tronscanUrl);
console.log('');
console.log('3. En "Contract address" pega:');
console.log('   ' + tokenAddress);
console.log('');
console.log('4. Description (copia y pega en Tronscan):');
console.log('   ---');
console.log('   ' + description);
console.log('   ---');
console.log('');
console.log('5. Logo (URL para pegar en Tronscan):');
if (logoUrl) {
  console.log('   ' + logoUrl);
} else {
  console.log('   Rellena trc20-token.config.json (githubUser, githubRepo, branch) y sube el repo a GitHub.');
  console.log('   Ejemplo: https://raw.githubusercontent.com/TU_USUARIO/TU_REPO/main/blockchain/trc20-token/assets/logo.png');
}
console.log('');
console.log('6. Project website:');
console.log('   ' + websiteUrl);
console.log('');
console.log('Ver todos los textos y pasos: docs/TRONSCAN_DATOS_PEGAR.md');
console.log('');
