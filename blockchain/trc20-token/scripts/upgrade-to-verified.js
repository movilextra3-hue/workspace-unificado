#!/usr/bin/env node
'use strict';
/**
 * [ADVERTENCIA - NO EJECUTAR SIN VERIFICAR]
 * Actualiza el proxy para que apunte a TNduz3 (Implementation v3 verificada).
 *
 * RIESGO: TNduz3 puede NO ser compatible con este proxy (TV4P3sVf).
 * La vitácora documenta TYqRvxio como Implementation oficial del token.
 * No hay evidencia verificada de que TNduz3 tenga storage layout compatible.
 * Upgrade a Implementation incompatible = CORRUPCIÓN de balances/token.
 *
 * Reglas: Verificar antes de actuar; evidencia sobre conjetura.
 * Antes de usar: 1) Consultar vitacora. 2) Comprobar relación TNduz3↔proxy.
 * 3) Verificar layout de storage. Uso: node scripts/upgrade-to-verified.js mainnet
 */
require('dotenv').config();
const TronWeb = require('tronweb');
const path = require('path');
const fs = require('fs');

const VERIFIED_IMPL = 'TNduz3PrYRDDN9HmEWXFn3nEsXKCaJt9er';

// Proyecto mainnet-only. No testnets.
const MAINNET = { fullHost: 'https://api.trongrid.io' };

async function main() {
  const networkName = (process.argv[2] || 'mainnet').toLowerCase();
  if (networkName !== 'mainnet') {
    console.error('Este proyecto es mainnet-only. Uso: node scripts/upgrade-to-verified.js mainnet');
    process.exit(1);
  }
  const net = MAINNET;

  const pk = (process.env.PRIVATE_KEY || '').replace(/^0x/, '').trim();
  if (!pk || !/^[a-fA-F0-9]{64}$/.test(pk)) {
    console.error('PRIVATE_KEY inválido o faltante en .env');
    process.exit(1);
  }

  const deployPath = path.join(__dirname, '..', 'deploy-info.json');
  if (!fs.existsSync(deployPath)) {
    console.error('Falta deploy-info.json');
    process.exit(1);
  }
  const deployInfo = JSON.parse(fs.readFileSync(deployPath, 'utf8'));
  const { tokenAddress: proxyAddr, proxyAdminAddress: adminAddr } = deployInfo;
  if (!proxyAddr || !adminAddr) {
    console.error('deploy-info.json: faltan tokenAddress o proxyAdminAddress');
    process.exit(1);
  }

  const tronWeb = new TronWeb({
    fullHost: net.fullHost,
    privateKey: pk,
    headers: process.env.TRON_PRO_API_KEY ? { 'TRON-PRO-API-KEY': process.env.TRON_PRO_API_KEY } : {}
  });

  const buildDir = path.join(__dirname, '..', 'build', 'contracts');
  const adminArtifact = JSON.parse(fs.readFileSync(path.join(buildDir, 'ProxyAdmin.json'), 'utf8'));
  const proxyAdmin = await tronWeb.contract(adminArtifact.abi, adminAddr);

  console.log('=== Upgrade a Implementation verificado (TNduz3) ===');
  console.log('Red:', networkName);
  console.log('Proxy:', proxyAddr);
  console.log('ProxyAdmin:', adminAddr);
  console.log('Nueva Implementation (verificada):', VERIFIED_IMPL);
  console.log('');

  const tx = await proxyAdmin.upgrade(proxyAddr, VERIFIED_IMPL).send({ feeLimit: 500 * 1e6 });
  console.log('TX:', tx);
  console.log('Upgrade completado.');

  deployInfo.implementationAddress = VERIFIED_IMPL;
  deployInfo.lastUpgrade = new Date().toISOString();
  fs.writeFileSync(deployPath, JSON.stringify(deployInfo, null, 2));
  console.log('deploy-info.json actualizado.');
  console.log('');
  console.log('Siguiente: npm run perfil:tronscan:open (completar perfil del token).');
}

main().catch(e => {
  console.error(e.message || e);
  process.exit(1);
});
