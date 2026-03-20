#!/usr/bin/env node
'use strict';
/**
 * Flujo único y profesional para completar el token en mainnet.
 *
 * Hace todo en orden, sin depender de TronBox migrate ni del estado de migraciones:
 * 1. Valida .env (PRIVATE_KEY, TRON_PRO_API_KEY, PROXY_ADMIN_ADDRESS, TOKEN_*)
 * 2. Compila con TronBox si faltan artefactos (build/contracts)
 * 3. Comprueba que PROXY_ADMIN_ADDRESS sea un contrato en mainnet
 * 4. Comprueba saldo (mín. 200 TRX) y energía/coste estimado
 * 5. Pide confirmación (o AUTO_CONFIRM=1)
 * 6. Despliega Implementation + Proxy (reutilizando ProxyAdmin) + initialize
 * 7. Escribe deploy-info.json e imprime los siguientes pasos
 *
 * Uso:
 *   npm run deploy:complete
 *   npm run deploy:complete -- --dry-run   (solo comprobaciones, no envía tx)
 *   npm run deploy:complete -- --yes      (omitir confirmación SÍ; útil en CI)
 */
const path = require('node:path');
const fs = require('node:fs');
const https = require('node:https');
const readline = require('node:readline');
const { execSync } = require('node:child_process');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { assertTronscanCompatibleOrExit } = require('./lib/tronscan-build-requirements');
const { TronWeb } = require('tronweb');

assertTronscanCompatibleOrExit();

const ROOT = path.join(__dirname, '..');
const MAINNET_HOST = 'api.trongrid.io';
const MIN_BALANCE_TRX = 200;
const FEE_LIMIT_IMPL = 450000000;   // 450 TRX
const FEE_LIMIT_PROXY = 150000000;
const FEE_LIMIT_INIT = 50000000;
const ENERGY_PER_BYTE = 320;
const ENERGY_INIT = 150000;

const DRY_RUN = process.argv.includes('--dry-run') || process.env.DRY_RUN === '1';
const SKIP_CONFIRM = process.argv.includes('--yes') || process.env.AUTO_CONFIRM === '1' || process.env.AUTO_CONFIRM === 'true';

function request(method, pathname, body, apiKey) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const opts = {
      hostname: MAINNET_HOST,
      path: pathname,
      method,
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    };
    if (apiKey) opts.headers['TRON-PRO-API-KEY'] = apiKey;
    const req = https.request(opts, (res) => {
      let raw = '';
      res.on('data', (c) => { raw += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(raw || '{}')); } catch (e) { resolve({}); }
      });
    });
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function decodeHexError(msg) {
  const str = String(msg || '').trim();
  if (/^[0-9a-fA-F]+$/.test(str)) {
    try { return Buffer.from(str, 'hex').toString('utf8') || str; } catch (e) { return str; }
  }
  return str;
}

function fail(msg) {
  console.error('');
  console.error(msg);
  process.exit(1);
}

function ensureEnv() {
  const privateKey = (process.env.PRIVATE_KEY || '').replace(/^0x/i, '').trim();
  if (!privateKey || !/^[a-fA-F0-9]{64}$/.test(privateKey)) {
    fail('PRIVATE_KEY en .env falta o no es válido (64 caracteres hexadecimales).');
  }
  const apiKey = (process.env.TRON_PRO_API_KEY || '').trim();
  if (!apiKey) {
    fail('TRON_PRO_API_KEY en .env falta. Obtén una en https://www.trongrid.io/');
  }
  const adminAddress = (process.env.PROXY_ADMIN_ADDRESS || '').trim();
  if (!adminAddress) {
    fail('PROXY_ADMIN_ADDRESS en .env falta. Usa una de las 3 recomendadas en ENV_TEMPLATE.txt');
  }
  const decimals = parseInt(process.env.TOKEN_DECIMALS || '18', 10);
  if (Number.isNaN(decimals) || decimals < 0 || decimals > 255) {
    fail('TOKEN_DECIMALS debe ser un número entre 0 y 255.');
  }
  const supplyStr = (process.env.TOKEN_SUPPLY || '1000000').trim();
  if (!/^\d+$/.test(supplyStr)) {
    fail('TOKEN_SUPPLY debe ser un entero positivo.');
  }
  const supply = parseInt(supplyStr, 10);
  return { privateKey, apiKey, adminAddress, decimals, supply };
}

function ensureCompiled() {
  const buildDir = path.join(ROOT, 'build', 'contracts');
  const implPath = path.join(buildDir, 'TRC20TokenUpgradeable.json');
  const proxyPath = path.join(buildDir, 'TransparentUpgradeableProxy.json');
  if (!fs.existsSync(implPath) || !fs.existsSync(proxyPath)) {
    console.log('Compilando contratos (TronBox TVM)...');
    execSync('npm run compile', { stdio: 'inherit', cwd: ROOT });
  }
}

async function verifyProxyAdmin(adminAddress, apiKey) {
  const res = await request('POST', '/wallet/getcontract', { value: adminAddress, visible: true }, apiKey);
  if (!res || res.Error || !res.contract_address) {
    fail('PROXY_ADMIN_ADDRESS no es un contrato en mainnet. Comprueba la dirección en Tronscan.');
  }
}

async function getBalanceAndCost(ownerAddr, ownerHex, apiKey) {
  const [accRes, resourceRes] = await Promise.all([
    request('POST', '/wallet/getaccount', { address: ownerAddr, visible: true }, apiKey),
    request('POST', '/wallet/getaccountresource', { address: ownerHex, visible: false }, apiKey)
  ]);
  const balanceSun = (accRes && !accRes.Error && accRes.balance != null) ? Number(accRes.balance) : 0;
  const balanceTRX = balanceSun / 1e6;
  const energyLimit = Number(resourceRes?.EnergyLimit || 0);
  const energyUsed = Number(resourceRes?.EnergyUsed || 0);
  const energyFree = Math.max(0, energyLimit - energyUsed);

  const buildDir = path.join(ROOT, 'build', 'contracts');
  const implArt = JSON.parse(fs.readFileSync(path.join(buildDir, 'TRC20TokenUpgradeable.json'), 'utf8'));
  const proxyArt = JSON.parse(fs.readFileSync(path.join(buildDir, 'TransparentUpgradeableProxy.json'), 'utf8'));
  const implBytes = ((implArt.bytecode || '').replace(/^0x/, '').length / 2) | 0;
  const proxyBytes = ((proxyArt.bytecode || '').replace(/^0x/, '').length / 2) | 0;
  const totalEnergy = implBytes * ENERGY_PER_BYTE + proxyBytes * ENERGY_PER_BYTE + ENERGY_INIT;

  let energyPriceSun = 280;
  try {
    const prices = await new Promise((resolve, reject) => {
      const opts = { hostname: MAINNET_HOST, path: '/wallet/getenergyprices', method: 'GET', headers: {} };
      if (apiKey) opts.headers['TRON-PRO-API-KEY'] = apiKey;
      https.get(opts, (res) => {
        let raw = '';
        res.on('data', (c) => { raw += c; });
        res.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch (e) { resolve({}); } });
      }).on('error', reject);
    });
    if (prices?.prices && typeof prices.prices === 'string') {
      const parts = prices.prices.split(',').filter(Boolean);
      if (parts.length) {
        const m = (/:\s*(\d+)\s*$/).exec(parts[parts.length - 1]);
        if (m) energyPriceSun = parseInt(m[1], 10);
      }
    }
  } catch (_e) { /* default */ }

  const energyToPay = Math.max(0, totalEnergy - energyFree);
  const costTRX = (energyToPay * energyPriceSun) / 1e6;

  return { balanceTRX, energyFree, totalEnergy, costTRX };
}

function askConfirm(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve((answer || '').trim() === 'SÍ');
    });
  });
}

async function main() {
  console.log('');
  console.log('=== Completar token en mainnet (flujo único, TronWeb) ===');
  console.log('');

  const env = ensureEnv();
  ensureCompiled();

  const tronWeb = new TronWeb({
    fullHost: 'https://' + MAINNET_HOST,
    privateKey: env.privateKey,
    headers: { 'TRON-PRO-API-KEY': env.apiKey }
  });
  const ownerAddr = tronWeb.defaultAddress.base58;
  const ownerHex = tronWeb.address.toHex(ownerAddr);

  await verifyProxyAdmin(env.adminAddress, env.apiKey);
  console.log('  [OK] PROXY_ADMIN_ADDRESS es un contrato en mainnet.');

  const { balanceTRX, energyFree, totalEnergy, costTRX } = await getBalanceAndCost(ownerAddr, ownerHex, env.apiKey);
  console.log('  Dirección wallet:', ownerAddr);
  console.log('  Balance:', balanceTRX.toFixed(2), 'TRX');
  console.log('  Energía libre:', energyFree.toLocaleString());
  console.log('  Energía necesaria (estimada):', totalEnergy.toLocaleString());
  console.log('  Coste estimado (si pagas con TRX):', costTRX.toFixed(2), 'TRX');
  console.log('');

  if (balanceTRX < MIN_BALANCE_TRX) {
    fail('Balance insuficiente. Mínimo recomendado: ' + MIN_BALANCE_TRX + ' TRX. Tienes: ' + balanceTRX.toFixed(2) + ' TRX.');
  }

  const name = process.env.TOKEN_NAME || 'Mi Token';
  const symbol = process.env.TOKEN_SYMBOL || 'USTD';
  console.log('  Token:', name, '(' + symbol + ')');
  console.log('');

  if (DRY_RUN) {
    console.log('--- DRY-RUN: todas las comprobaciones OK. No se envió ninguna transacción.');
    console.log('   Para desplegar de verdad ejecuta: npm run deploy:complete');
    console.log('');
    process.exit(0);
  }

  if (!SKIP_CONFIRM) {
    const ok = await askConfirm('Escribe exactamente SÍ y Enter para desplegar en mainnet (se gastará TRX): ');
    if (!ok) {
      console.log('No confirmado. No se envió ninguna transacción.');
      process.exit(0);
    }
  } else {
    console.log('Confirmación omitida (--yes o AUTO_CONFIRM=1). Desplegando.');
  }
  console.log('');

  const buildDir = path.join(ROOT, 'build', 'contracts');
  const implArtifact = JSON.parse(fs.readFileSync(path.join(buildDir, 'TRC20TokenUpgradeable.json'), 'utf8'));
  const proxyArtifact = JSON.parse(fs.readFileSync(path.join(buildDir, 'TransparentUpgradeableProxy.json'), 'utf8'));
  const initialSupply = env.supply;

  console.log('Desplegando Implementation...');
  const implTx = await tronWeb.transactionBuilder.createSmartContract(
    {
      abi: JSON.stringify(implArtifact.abi),
      bytecode: (implArtifact.bytecode || '').replace(/^0x/, ''),
      feeLimit: FEE_LIMIT_IMPL,
      name: 'TRC20TokenUpgradeable'
    },
    ownerAddr
  );
  const implSigned = await tronWeb.trx.sign(implTx);
  const implResult = await tronWeb.trx.sendRawTransaction(implSigned);
  if (!implResult.result) {
    fail(decodeHexError(implResult.message) || 'Deploy Implementation falló.');
  }
  const implAddress = tronWeb.address.fromHex(implTx.contract_address);
  console.log('  Implementation:', implAddress);

  console.log('Desplegando Proxy...');
  const proxyTx = await tronWeb.transactionBuilder.createSmartContract(
    {
      abi: JSON.stringify(proxyArtifact.abi),
      bytecode: (proxyArtifact.bytecode || '').replace(/^0x/, ''),
      parameters: [implAddress, env.adminAddress, '0x'],
      feeLimit: FEE_LIMIT_PROXY,
      name: 'TransparentUpgradeableProxy'
    },
    ownerAddr
  );
  const proxySigned = await tronWeb.trx.sign(proxyTx);
  const proxyResult = await tronWeb.trx.sendRawTransaction(proxySigned);
  if (!proxyResult.result) {
    fail(decodeHexError(proxyResult.message) || 'Deploy Proxy falló.');
  }
  const proxyAddress = tronWeb.address.fromHex(proxyTx.contract_address);
  console.log('  Proxy (token):', proxyAddress);

  // Esperar a que el Proxy esté confirmado en cadena antes de llamar initialize
  const txid = proxyResult.txid || proxyResult.transaction?.txID;
  if (txid) {
    console.log('  Esperando confirmación del Proxy (hasta ~60 s)...');
    let confirmed = false;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      try {
        const info = await tronWeb.trx.getTransactionInfo(txid);
        const ok = info && (info.receipt?.result === 'SUCCESS' || info.result === 'SUCCESS');
        if (ok) { confirmed = true; break; }
        if (info && (info.receipt?.result === 'FAILED' || info.result === 'FAILED')) {
          fail('La tx del Proxy falló en cadena.');
        }
      } catch (_e) { /* sigue esperando */ }
    }
    if (!confirmed) console.log('  Aviso: no se detectó confirmación en 60 s; intentando initialize igualmente.');
  } else {
    await new Promise((r) => setTimeout(r, 10000));
  }

  console.log('Inicializando token...');
  const tokenContract = await tronWeb.contract(implArtifact.abi, proxyAddress);
  await tokenContract.initialize(name, symbol, env.decimals, initialSupply, ownerAddr).send({ feeLimit: FEE_LIMIT_INIT });

  const deployInfo = {
    network: 'mainnet',
    tokenAddress: proxyAddress,
    implementationAddress: implAddress,
    proxyAdminAddress: env.adminAddress,
    constructorParams: { name, symbol, decimals: env.decimals, initialSupply },
    deployedAt: new Date().toISOString(),
    deployedVia: 'scripts/deploy-complete-token.js'
  };
  fs.writeFileSync(path.join(ROOT, 'deploy-info.json'), JSON.stringify(deployInfo, null, 2));

  console.log('');
  console.log('=== Despliegue completado con éxito ===');
  console.log('');
  console.log('  Token (dirección permanente):', proxyAddress);
  console.log('  Implementation:', implAddress);
  console.log('  deploy-info.json actualizado.');
  console.log('');
  console.log('  Siguientes pasos:');
  console.log('    1. Verificación en Tronscan: npm run prepare:verification');
  console.log('    2. Perfil del token (logo, web): npm run post-deploy:perfil');
  console.log('');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
