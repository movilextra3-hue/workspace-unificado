#!/usr/bin/env node
'use strict';
/**
 * Verifica requisitos antes de ejecutar upgrade (evita errores y gastos en vano).
 * Ejecutar: npm run verify:pre-upgrade
 * Solo mainnet. No envía transacciones; solo comprueba que todo está listo.
 */
require('dotenv').config();
const TronWeb = require('tronweb');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const NETWORK = 'mainnet';
const fullHost = 'https://api.trongrid.io';

function main() {
  return (async () => {
    const networkName = NETWORK;
    if (process.argv[2] && process.argv[2].toLowerCase() !== 'mainnet') {
      console.error('Solo mainnet. Uso: npm run verify:pre-upgrade');
      process.exit(1);
    }

    console.log('\n=== VERIFICACIÓN PRE-UPGRADE ===\n');
    console.log('Red:', networkName);
    const errores = [];

    // 1. PRIVATE_KEY (aviso; no bloquea verificación básica)
    const pk = (process.env.PRIVATE_KEY || '').replace(/^0x/, '').trim();
    const pkOk = pk && /^[a-fA-F0-9]{64}$/.test(pk);
    if (!pkOk) {
      console.log('  [AVISO] PRIVATE_KEY no configurado — verificación on-chain (wallet=owner) se omitirá');
    }

    // 2. deploy-info.json
    const deployPath = path.join(ROOT, 'deploy-info.json');
    if (!fs.existsSync(deployPath)) {
      errores.push('Falta deploy-info.json. Ejecutar: npm run preparar:redespliegue ' + networkName);
      console.log('\n--- ERRORES ---');
      errores.forEach(e => console.log('  -', e));
      process.exit(1);
    }
    let deployInfo;
    try {
      deployInfo = JSON.parse(fs.readFileSync(deployPath, 'utf8'));
    } catch (e) {
      errores.push('deploy-info.json inválido: ' + e.message);
    }
    if (deployInfo && (!deployInfo.tokenAddress || !deployInfo.proxyAdminAddress)) {
      errores.push('deploy-info.json debe tener tokenAddress y proxyAdminAddress');
    }
    if (deployInfo && deployInfo.network && deployInfo.network !== networkName) {
      errores.push('deploy-info.json es de red "' + deployInfo.network + '", no "' + networkName + '"');
    }

    // 3. build
    const implPath = path.join(ROOT, 'build', 'contracts', 'TRC20TokenUpgradeable.json');
    const adminPath = path.join(ROOT, 'build', 'contracts', 'ProxyAdmin.json');
    if (!fs.existsSync(implPath) || !fs.existsSync(adminPath)) {
      errores.push('Falta build. Ejecutar: npm run compile');
    }

    if (errores.length) {
      console.log('\n--- ERRORES ---');
      errores.forEach(e => console.log('  -', e));
      process.exit(1);
    }

    if (!pk) {
      console.log('\n[AVISO] PRIVATE_KEY no configurado — no se puede verificar wallet=owner on-chain.');
      console.log('Configura .env y vuelve a ejecutar para verificación completa.');
      console.log('\n=== VERIFICACIÓN BÁSICA OK ===');
      return;
    }

    // 4. Verificar on-chain: wallet = ProxyAdmin.owner
    const tronWebConfig = { fullHost, privateKey: pk, timeout: 20000 };
    if (process.env.TRON_PRO_API_KEY) {
      tronWebConfig.headers = { 'TRON-PRO-API-KEY': process.env.TRON_PRO_API_KEY };
    }
    const tronWeb = new TronWeb(tronWebConfig);

    const ownerAddr = tronWeb.defaultAddress.base58;
    const adminAddr = deployInfo.proxyAdminAddress;

    let adminArtifact;
    try {
      adminArtifact = JSON.parse(fs.readFileSync(adminPath, 'utf8'));
    } catch (e) {
      errores.push('Error leyendo ProxyAdmin.json');
    }
    if (adminArtifact) {
      try {
        const adminContract = await tronWeb.contract(adminArtifact.abi, adminAddr);
        const ownerResult = await adminContract.owner().call();
        const ownerOnChain = (typeof ownerResult === 'string' && ownerResult.startsWith('T'))
          ? ownerResult
          : (ownerResult ? tronWeb.address.fromHex(ownerResult) : null);

        if (!ownerOnChain) {
          console.log('  [AVISO] No se pudo leer ProxyAdmin.owner() (¿red/conexión?)');
        } else if (ownerOnChain !== ownerAddr) {
          console.error('\n  ERROR: Tu wallet (' + ownerAddr + ') NO es el owner del ProxyAdmin.');
          console.error('  Owner actual: ' + ownerOnChain);
          console.error('  Solo el owner puede ejecutar upgrade. Abortar.');
          process.exit(1);
        } else {
          console.log('  [OK] Wallet es owner del ProxyAdmin');
        }
      } catch (e) {
        console.log('  [AVISO] No se pudo verificar ProxyAdmin.owner:', e.message);
      }
    }

    // 5. Resumen costes (alineado con upgrade.js: 800 impl ~12KB, 200 upgrade)
    const feeImpl = networkName === 'mainnet' ? 800 : 1000;
    const feeUpgrade = networkName === 'mainnet' ? 200 : 500;
    console.log('\n  feeLimit estimado: Deploy Impl ' + feeImpl + ' TRX, upgrade ' + feeUpgrade + ' TRX');
    console.log('  (Coste real depende de ENERGY disponible; sin energy se quema TRX)');
    console.log('\n=== TODO LISTO PARA UPGRADE ===');
    console.log('\n  npm run upgrade:' + networkName);
    console.log('');
  })();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
