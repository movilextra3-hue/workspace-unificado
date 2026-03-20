#!/usr/bin/env node
'use strict';
/**
 * Simulación del flujo upgrade + verificación SIN enviar transacciones.
 * Valida: deploy-info, build, bytecode, paquete verificación, alineación config.
 * Objetivo: detectar errores antes de gastar TRX.
 * Uso: node scripts/simular-upgrade-verificacion.js
 *      npm run simular:upgrade
 */
require('dotenv').config();
const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.join(__dirname, '..');

function loadJson(p, def = null) {
  try {
    if (!fs.existsSync(p)) return def;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch { return def; }
}

function main() {
  console.log('\n========================================');
  console.log('  SIMULACIÓN UPGRADE + VERIFICACIÓN');
  console.log('  (sin enviar transacciones)');
  console.log('========================================\n');

  const errores = [];
  const avisos = [];
  const ok = [];

  // --- 1. PRIVATE_KEY ---
  const pk = (process.env.PRIVATE_KEY || '').replace(/^0x/, '').trim();
  const pkOk = pk && /^[a-fA-F0-9]{64}$/.test(pk);
  if (pkOk) {
    ok.push('PRIVATE_KEY configurada (64 hex)');
  } else {
    avisos.push('PRIVATE_KEY no configurada — upgrade real fallaría en primer paso');
  }

  // --- 2. deploy-info.json ---
  const deployPath = path.join(ROOT, 'deploy-info.json');
  if (!fs.existsSync(deployPath)) {
    errores.push('Falta deploy-info.json');
  } else {
    const deploy = loadJson(deployPath);
    if (!deploy) {
      errores.push('deploy-info.json inválido o corrupto');
    } else {
      const hasToken = !!deploy.tokenAddress;
      const hasAdmin = !!deploy.proxyAdminAddress;
      const networkOk = deploy.network === 'mainnet';
      const tokenFormat = hasToken && (/^T[A-HJ-NP-Za-km-z1-9]{33}$/.test(deploy.tokenAddress) || /^41[a-fA-F0-9]{40}$/.test(deploy.tokenAddress));
      const adminFormat = hasAdmin && (/^T[A-HJ-NP-Za-km-z1-9]{33}$/.test(deploy.proxyAdminAddress) || /^41[a-fA-F0-9]{40}$/.test(deploy.proxyAdminAddress));

      if (hasToken && hasAdmin && networkOk && tokenFormat && adminFormat) {
        ok.push(`deploy-info.json: tokenAddress ${deploy.tokenAddress}, proxyAdminAddress ${deploy.proxyAdminAddress}, network mainnet`);
      } else {
        if (!hasToken) errores.push('deploy-info.json sin tokenAddress');
        if (!hasAdmin) errores.push('deploy-info.json sin proxyAdminAddress');
        if (!networkOk) errores.push(`deploy-info.json network="${deploy.network}" (debe ser mainnet)`);
        if (!tokenFormat) errores.push('tokenAddress formato TRON inválido');
        if (!adminFormat) errores.push('proxyAdminAddress formato TRON inválido');
      }
    }
  }

  // --- 3. Build artifacts ---
  const implPath = path.join(ROOT, 'build', 'contracts', 'TRC20TokenUpgradeable.json');
  const adminPath = path.join(ROOT, 'build', 'contracts', 'ProxyAdmin.json');
  if (!fs.existsSync(implPath)) {
    errores.push('Falta build/contracts/TRC20TokenUpgradeable.json — ejecutar npm run compile');
  } else {
    const impl = loadJson(implPath);
    const bc = (impl?.bytecode || '').replace(/^0x/, '');
    const abiOk = impl?.abi && Array.isArray(impl.abi) && impl.abi.length > 0;
    if (!bc || bc.length < 100) {
      errores.push('Implementation sin bytecode válido en build');
    } else {
      const sizeKb = (bc.length / 2 / 1024).toFixed(2);
      ok.push(`Implementation: bytecode ${bc.length / 2} bytes (~${sizeKb} KB), ABI ${abiOk ? 'OK' : 'FALTA'}`);
      if (!abiOk) errores.push('Implementation sin ABI válido');
    }
  }
  if (!fs.existsSync(adminPath)) {
    errores.push('Falta build/contracts/ProxyAdmin.json — ejecutar npm run compile');
  } else {
    const admin = loadJson(adminPath);
    const adminAbiOk = admin?.abi && Array.isArray(admin.abi);
    ok.push(`ProxyAdmin: ABI ${adminAbiOk ? 'OK' : 'FALTA'}`);
    if (!adminAbiOk) errores.push('ProxyAdmin sin ABI válido');
  }

  // --- 4. Config compilador (debe coincidir con Tronscan) ---
  let config;
  try {
    config = require(path.join(ROOT, 'config', 'trc20-networks.js'));
  } catch (e) {
    avisos.push('No se pudo cargar config/trc20-networks.js: ' + e.message);
  }
  if (config?.compilers?.solc) {
    const comp = config.compilers.solc;
    const ver = comp.version || '0.8.25';
    const runs = comp.settings?.optimizer?.runs ?? 200;
    const evm = comp.settings?.evmVersion || 'shanghai';
    ok.push(`Config compilador: ${ver}, runs ${runs}, evm ${evm}`);
  }

  // --- 5. Paquete verificación ---
  const pkgDir = path.join(ROOT, 'verification', 'PAQUETE-VERIFICACION-POST-UPGRADE');
  const solPath = path.join(pkgDir, 'TRC20TokenUpgradeable.sol');
  const paramsPath = path.join(pkgDir, 'PARAMETROS-TRONSCAN.txt');
  if (!fs.existsSync(solPath)) {
    errores.push('Falta verification/PAQUETE-VERIFICACION-POST-UPGRADE/TRC20TokenUpgradeable.sol — ejecutar npm run guardar:verificacion');
  } else {
    ok.push('Paquete verificación: TRC20TokenUpgradeable.sol presente');
  }
  if (!fs.existsSync(paramsPath)) {
    avisos.push('Falta PARAMETROS-TRONSCAN.txt — ejecutar npm run guardar:verificacion');
  } else {
    const paramsTxt = fs.readFileSync(paramsPath, 'utf8');
    const has025 = paramsTxt.includes('0.8.25');
    const has200 = paramsTxt.includes('200');
    const hasShanghai = paramsTxt.toLowerCase().includes('shanghai');
    if (has025 && has200 && hasShanghai) {
      ok.push('PARAMETROS-TRONSCAN.txt: 0.8.25, 200 runs, shanghai — alineado con config');
    } else {
      avisos.push('PARAMETROS-TRONSCAN.txt puede no coincidir con config (comprobar manualmente)');
    }
  }

  // --- 6. Alineación source vs build ---
  const sourcePath = path.join(ROOT, 'contracts', 'TRC20TokenUpgradeable.sol');
  if (fs.existsSync(sourcePath)) {
    const src = fs.readFileSync(sourcePath, 'utf8');
    const hasInitializable = src.includes('abstract contract Initializable') || src.includes('contract Initializable');
    const hasNoImports = !src.match(/^\s*import\s+/m);
    if (hasInitializable && hasNoImports) {
      ok.push('Source: autocontenido (Initializable inline, sin imports)');
    } else {
      avisos.push('Source puede tener imports — verificar que guardar:verificacion genere archivo único');
    }
  }

  // --- 7. Estimación costes ---
  const feeImpl = 800;
  const feeUpgrade = 200;
  const totalMax = feeImpl + feeUpgrade;
  ok.push(`feeLimit estimado: Deploy Impl ${feeImpl} TRX, upgrade ${feeUpgrade} TRX (total máx. ~${totalMax} TRX)`);
  avisos.push('Coste real depende de ENERGY disponible; sin energy suficiente se quema más TRX');

  // --- 8. Resumen ---
  console.log('--- OK ---');
  ok.forEach(x => console.log('  ✓', x));
  if (avisos.length) {
    console.log('\n--- AVISOS ---');
    avisos.forEach(x => console.log('  ⚠', x));
  }
  if (errores.length) {
    console.log('\n--- ERRORES (corregir antes de upgrade) ---');
    errores.forEach(x => console.log('  ✗', x));
    console.log('\nSimulación: FALLO — no ejecutar upgrade hasta corregir.');
    process.exit(1);
  }

  console.log('\n========================================');
  console.log('  SIMULACIÓN OK — flujo listo para upgrade');
  console.log('========================================');
  // Invocar check:saldo para completar verificación (Regla #1: no delegar)
  try {
    const { spawnSync } = require('node:child_process');
    const r = spawnSync('node', ['scripts/check-saldo-upgrade.js'], {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf8',
      stdio: 'pipe'
    });
    if (r.stdout) process.stdout.write(r.stdout);
    if (r.stderr) process.stderr.write(r.stderr);
    // No salir con error; saldo es aviso, no bloquea simulación
  } catch (_) { /* ignorar */ }

  console.log('\nOrden recomendado:');
  console.log('  1. npm run verify:pre-upgrade  (verifica wallet=owner on-chain)');
  console.log('  2. npm run upgrade:mainnet     (despliega nueva Implementation + upgrade)');
  console.log('  3. Tronscan: verificar nueva implementationAddress con PARAMETROS-TRONSCAN.txt');
  console.log('');
}

main();
