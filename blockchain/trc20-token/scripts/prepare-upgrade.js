#!/usr/bin/env node
'use strict';
/**
 * Prepara el upgrade on-chain (cambio de Implementation del proxy).
 * Verifica: .env, deploy-info.json, TOKEN_SYMBOL=USDT (mainnet), tronbox config, compilación.
 * No gasta TRX. Uso: npm run prepare:upgrade
 */
const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(ROOT, '.env') });

const EXPECTED_SYMBOL = 'USDT';
const CHECK_ONLY = process.argv.includes('--check-only');

function fail(msg, code = 1) {
  console.error('\n' + msg);
  process.exit(code);
}

function main() {
  console.log('=== Preparación para upgrade (cambio de Implementation) ===\n');
  if (CHECK_ONLY) {
    console.log('Modo --check-only: verifica config y USDT sin .env\n');
  }

  // 1. .env (omitido en --check-only)
  if (!CHECK_ONLY) {
    const privateKey = (process.env.PRIVATE_KEY || '').replace(/^0x/, '').trim();
    if (!privateKey || !/^[a-fA-F0-9]{64}$/.test(privateKey)) {
      fail('Falta o PRIVATE_KEY inválido en .env (64 caracteres hex, sin 0x)');
    }
    console.log('  ✓ PRIVATE_KEY definido');

    const apiKey = (process.env.TRON_PRO_API_KEY || '').trim();
    if (!apiKey) {
      fail('TRON_PRO_API_KEY obligatoria en .env para mainnet');
    }
    console.log('  ✓ TRON_PRO_API_KEY definido');
  }

  const tokenSymbol = (process.env.TOKEN_SYMBOL || '').trim();
  if (tokenSymbol !== EXPECTED_SYMBOL) {
    console.warn('  ⚠ TOKEN_SYMBOL en .env = "' + (tokenSymbol || '(vacío)') + '". Se recomienda USDT (mainnet).');
    console.warn('    Tras el upgrade, ejecuta: npm run set:symbol');
  } else {
    console.log('  ✓ TOKEN_SYMBOL=USDT');
  }

  // 2. deploy-info.json (o .example en --check-only)
  const deployPath = path.join(ROOT, 'deploy-info.json');
  const deployExamplePath = path.join(ROOT, 'deploy-info.json.example');
  let deployFilePath = deployPath;
  if (!fs.existsSync(deployPath)) {
    if (CHECK_ONLY && fs.existsSync(deployExamplePath)) {
      deployFilePath = deployExamplePath;
      console.log('  (usando deploy-info.json.example para verificación)');
    } else {
      fail('Falta deploy-info.json. Ejecutar un deploy completo primero.');
    }
  }
  let deployInfo;
  try {
    deployInfo = JSON.parse(fs.readFileSync(deployFilePath, 'utf8'));
  } catch (e) {
    fail('deploy-info.json inválido: ' + e.message);
  }
  const proxyAddr = deployInfo.tokenAddress;
  const adminAddr = deployInfo.proxyAdminAddress;
  if (!proxyAddr || !adminAddr) {
    fail('deploy-info.json debe tener tokenAddress y proxyAdminAddress');
  }
  const validBase58 = (s) => /^T[A-HJ-NP-Za-km-z1-9]{33}$/.test(s);
  if (!validBase58(proxyAddr) && !/^41[a-fA-F0-9]{40}$/.test((proxyAddr || '').replace(/^0x/, ''))) {
    fail('deploy-info.json: tokenAddress no es una dirección TRON válida');
  }
  if (!validBase58(adminAddr) && !/^41[a-fA-F0-9]{40}$/.test((adminAddr || '').replace(/^0x/, ''))) {
    fail('deploy-info.json: proxyAdminAddress no es una dirección TRON válida');
  }
  console.log('  ✓ deploy-info.json: Proxy', proxyAddr);
  console.log('  ✓ deploy-info.json: ProxyAdmin', adminAddr);

  const cp = deployInfo.constructorParams || {};
  if (cp.symbol && cp.symbol !== EXPECTED_SYMBOL) {
    console.warn('  ⚠ constructorParams.symbol en deploy-info = "' + cp.symbol + '". Se recomienda USDT.');
  } else if (cp.symbol === EXPECTED_SYMBOL) {
    console.log('  ✓ constructorParams.symbol = USDT');
  }

  // 3. trc20-token.config.json
  const configPath = path.join(ROOT, 'trc20-token.config.json');
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.tokenSymbol && config.tokenSymbol !== EXPECTED_SYMBOL) {
        console.warn('  ⚠ trc20-token.config.json tokenSymbol = "' + config.tokenSymbol + '". Se recomienda USDT.');
      } else if (config.tokenSymbol === EXPECTED_SYMBOL) {
        console.log('  ✓ trc20-token.config.json tokenSymbol = USDT');
      }
    } catch { /* config opcional */ }
  }

  // 4. tronbox config (Tronscan-compatible)
  const {
    assertTronscanCompatibleOrExit,
    TRONSCAN_COMPILER,
    TRONSCAN_EVM_VERSION,
    TRONSCAN_OPTIMIZER_RUNS
  } = require('./lib/tronscan-build-requirements');
  assertTronscanCompatibleOrExit();
  console.log(
    '  ✓ tronbox.js: ' +
      TRONSCAN_COMPILER +
      ' + ' +
      TRONSCAN_EVM_VERSION +
      ' + runs ' +
      TRONSCAN_OPTIMIZER_RUNS +
      ' (verificable en Tronscan)'
  );

  // 5. Compilar
  console.log('\nCompilando...');
  const { execSync } = require('node:child_process');
  try {
    execSync('node scripts/compile-with-solc.js', {
      cwd: ROOT,
      stdio: 'inherit'
    });
  } catch (e) {
    fail('Compilación falló. Corrige los errores antes del upgrade.');
  }
  console.log('  ✓ build/contracts/ generado');

  const implPath = path.join(ROOT, 'build', 'contracts', 'TRC20TokenUpgradeable.json');
  if (!fs.existsSync(implPath)) {
    fail('Falta build/contracts/TRC20TokenUpgradeable.json tras compilar');
  }

  console.log('\n=== Todo listo para el upgrade ===');
  console.log('');
  console.log('Opciones de upgrade:');
  console.log('  A) npm run upgrade          — usa build/ (compile-with-solc)');
  console.log('  B) npm run upgrade:solc     — usa verification/ (prepare:verification primero)');
  console.log('');
  console.log('Tras el upgrade, si el símbolo on-chain no es USDT:');
  console.log('  npm run set:symbol          — llama setSymbol("USDT") en el proxy');
  console.log('');
  console.log('Verificación en Tronscan:');
  console.log('  npm run prepare:verification && npm run verify:before:tronscan -- <nueva_impl>');
  console.log('');
}

main();
