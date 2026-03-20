#!/usr/bin/env node
'use strict';
/**
 * Prepara todo para redespliegue (upgrade) de Implementation.
 * Crea deploy-info.json desde addresses.json si no existe.
 * Verifica: .env, compilación, artifacts.
 *
 * Uso: node scripts/preparar-redespliegue.js (solo mainnet)
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const NETWORK = 'mainnet';

function main() {
  const network = NETWORK;
  if (process.argv[2] && process.argv[2].toLowerCase() !== 'mainnet') {
    console.error('Solo mainnet. Uso: node scripts/preparar-redespliegue.js');
    process.exit(1);
  }

  console.log('\n=== PREPARACIÓN REDESPLIEGUE ===\n');
  console.log('Red:', network);
  const errores = [];

  // 1. PRIVATE_KEY (solo aviso; se exige al ejecutar upgrade)
  const pk = (process.env.PRIVATE_KEY || '').replace(/^0x/, '').trim();
  if (!pk || !/^[a-fA-F0-9]{64}$/.test(pk)) {
    console.log('  [AVISO] PRIVATE_KEY no configurado o inválido — necesario para upgrade');
  } else {
    console.log('  [OK] PRIVATE_KEY configurado');
  }

  // 2. addresses.json (carga única)
  const addrPath = path.join(ROOT, 'abi', 'addresses.json');
  let addrs = null;
  if (!fs.existsSync(addrPath)) {
    errores.push('Falta abi/addresses.json');
  } else {
    try {
      addrs = JSON.parse(fs.readFileSync(addrPath, 'utf8'));
    } catch (e) {
      errores.push('abi/addresses.json inválido: ' + e.message);
    }
    if (addrs) {
      const { tokenAddress, proxyAdminAddress } = addrs;
      if (!tokenAddress || !proxyAdminAddress) {
        errores.push('addresses.json debe tener tokenAddress y proxyAdminAddress');
      } else {
        console.log('  [OK] addresses.json: Proxy', tokenAddress, '| Admin', proxyAdminAddress);
      }
    }
  }

  // 3. deploy-info.json (crear desde addresses si no existe; sobrescribir si red distinta)
  const deployPath = path.join(ROOT, 'deploy-info.json');
  if (!fs.existsSync(deployPath)) {
    if (addrs && addrs.tokenAddress && addrs.proxyAdminAddress) {
      const deployInfo = {
        network,
        tokenAddress: addrs.tokenAddress,
        proxyAdminAddress: addrs.proxyAdminAddress,
        implementationAddress: addrs.implementationAddress || '',
        preparadoDesde: 'addresses.json',
        preparadoAt: new Date().toISOString()
      };
      fs.writeFileSync(deployPath, JSON.stringify(deployInfo, null, 2));
      console.log('  [OK] deploy-info.json creado desde addresses.json');
    } else {
      errores.push('No se puede crear deploy-info.json: addresses.json incompleto');
    }
  } else {
    const di = JSON.parse(fs.readFileSync(deployPath, 'utf8'));
    if (di.network !== network) {
      if (addrs && addrs.tokenAddress && addrs.proxyAdminAddress) {
        const deployInfo = {
          network,
          tokenAddress: addrs.tokenAddress,
          proxyAdminAddress: addrs.proxyAdminAddress,
          implementationAddress: addrs.implementationAddress || di.implementationAddress || '',
          preparadoDesde: 'addresses.json (red cambiada)',
          preparadoAt: new Date().toISOString()
        };
        fs.writeFileSync(deployPath, JSON.stringify(deployInfo, null, 2));
        console.log('  [OK] deploy-info.json actualizado desde addresses.json (red cambiada a ' + network + ')');
      } else {
        errores.push('deploy-info.json es de red "' + di.network + '"; addresses.json incompleto para sobrescribir');
      }
    } else {
      console.log('  [OK] deploy-info.json existe y coincide con red');
    }
    // Asegurar que deploy-info tiene network (p. ej. si fue creado sin él)
    const diFinal = JSON.parse(fs.readFileSync(deployPath, 'utf8'));
    if (!diFinal.network) {
      diFinal.network = network;
      fs.writeFileSync(deployPath, JSON.stringify(diFinal, null, 2));
      console.log('  [OK] deploy-info.json: añadido network="' + network + '"');
    }
  }

  // 4. Compilación
  const buildDir = path.join(ROOT, 'build', 'contracts');
  const implPath = path.join(buildDir, 'TRC20TokenUpgradeable.json');
  const adminPath = path.join(buildDir, 'ProxyAdmin.json');

  if (!fs.existsSync(implPath) || !fs.existsSync(adminPath)) {
    errores.push('Falta build. Ejecutar: npm run compile');
  } else {
    console.log('  [OK] build/contracts: TRC20TokenUpgradeable, ProxyAdmin');
  }

  // 5. Paquete verificación post-upgrade (para Tronscan)
  const guardarScript = path.join(ROOT, 'scripts', 'guardar-paquete-verificacion.js');
  if (fs.existsSync(guardarScript)) {
    const guardarResult = spawnSync('node', [guardarScript], { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
    if (guardarResult.status !== 0) {
      errores.push('Paquete verificación falló: ' + (guardarResult.stderr || guardarResult.stdout || 'exit ' + guardarResult.status));
    } else {
      console.log('  [OK] Paquete verificación guardado en verification/PAQUETE-VERIFICACION-POST-UPGRADE/');
    }
  }

  // 6. Resumen
  console.log('');
  if (errores.length) {
    console.log('--- ERRORES ---');
    errores.forEach(e => console.log('  -', e));
    console.log('\nCorrija los errores y vuelva a ejecutar.');
    process.exit(1);
  }

  console.log('=== LISTO PARA REDESPLIEGUE ===\n');
  console.log('Pasos:');
  console.log('  1. npm run verificar:completo   (verificación exhaustiva sin omisiones)');
  console.log('  2. npm run verify:pre-upgrade   (wallet = ProxyAdmin.owner)');
  console.log('  3. npm run upgrade:' + network);
  console.log('');
  console.log('El upgrade desplegará nueva Implementation y actualizará el Proxy.');
  console.log('La dirección del TOKEN (Proxy) NO cambia.');
  console.log('');
}

main();
