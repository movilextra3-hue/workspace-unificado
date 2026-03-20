#!/usr/bin/env node
'use strict';
/**
 * Despliegue directo con TronWeb (sin TronBox): Implementation + Proxy reutilizando ProxyAdmin.
 *
 * Ventajas frente a tronbox migrate:
 * - No depende del estado del contrato Migrations en la blockchain.
 * - Misma lógica que la migración 3, pero ejecutable siempre.
 * - Un solo proceso Node; salida y errores claros.
 *
 * Requisitos:
 * - .env: PRIVATE_KEY, TRON_PRO_API_KEY, PROXY_ADMIN_ADDRESS, TOKEN_NAME, TOKEN_SYMBOL, etc.
 * - Artefactos compilados: npm run compile (build/contracts/*.json).
 *
 * Uso:
 *   npm run deploy:reuse-admin
 *   npm run deploy:reuse-admin -- --dry-run   (solo valida, no envía tx)
 */
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { assertTronscanCompatibleOrExit } = require('./lib/tronscan-build-requirements');
const { TronWeb } = require('tronweb');
const fs = require('node:fs');

assertTronscanCompatibleOrExit();

const FEE_LIMIT_IMPL = 450000000;   // 450 TRX — evita OUT_OF_ENERGY en "save just created contract code"
const FEE_LIMIT_PROXY = 150000000;  // 150 TRX
const FEE_LIMIT_INIT = 50000000;    // 50 TRX

const DRY_RUN = process.argv.includes('--dry-run') || process.env.DRY_RUN === '1';

function decodeHexError(msg) {
  const str = String(msg || '').trim();
  if (/^[0-9a-fA-F]+$/.test(str)) {
    try {
      return Buffer.from(str, 'hex').toString('utf8') || str;
    } catch (e) {
      return str;
    }
  }
  return str;
}

async function main() {
  const privateKey = (process.env.PRIVATE_KEY || '').replace(/^0x/i, '').trim();
  if (!privateKey || !/^[a-fA-F0-9]{64}$/.test(privateKey)) {
    console.error('Falta o PRIVATE_KEY inválido en .env (64 hex).');
    process.exit(1);
  }

  const apiKey = (process.env.TRON_PRO_API_KEY || '').trim();
  if (!apiKey) {
    console.error('Falta TRON_PRO_API_KEY en .env (https://www.trongrid.io/).');
    process.exit(1);
  }

  const adminAddress = (process.env.PROXY_ADMIN_ADDRESS || '').trim();
  if (!adminAddress) {
    console.error('Falta PROXY_ADMIN_ADDRESS en .env (reutilizar ProxyAdmin existente).');
    process.exit(1);
  }

  const root = path.join(__dirname, '..');
  const buildDir = path.join(root, 'build', 'contracts');

  const loadArtifact = (name) => {
    const p = path.join(buildDir, `${name}.json`);
    if (!fs.existsSync(p)) {
      throw new Error(`Ejecuta antes: npm run compile. Falta ${name}.json`);
    }
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  };

  const implArtifact = loadArtifact('TRC20TokenUpgradeable');
  const proxyArtifact = loadArtifact('TransparentUpgradeableProxy');

  const name = process.env.TOKEN_NAME || 'Mi Token';
  const symbol = process.env.TOKEN_SYMBOL || 'USTD';
  const decimals = Math.max(0, Math.min(255, parseInt(process.env.TOKEN_DECIMALS || '18', 10)));
  const supplyStr = (process.env.TOKEN_SUPPLY || '1000000').trim();
  if (!/^\d+$/.test(supplyStr)) {
    console.error('TOKEN_SUPPLY debe ser entero positivo.');
    process.exit(1);
  }
  const initialSupply = parseInt(supplyStr, 10);

  const tronWeb = new TronWeb({
    fullHost: 'https://api.trongrid.io',
    privateKey,
    headers: { 'TRON-PRO-API-KEY': apiKey }
  });
  const ownerAddr = tronWeb.defaultAddress.base58;

  console.log('');
  console.log('=== Despliegue directo (TronWeb, sin TronBox) ===');
  console.log('  ProxyAdmin (reutilizada):', adminAddress);
  console.log('  Token:', name, '(' + symbol + '), owner:', ownerAddr);
  console.log('');

  if (DRY_RUN) {
    await tronWeb.transactionBuilder.createSmartContract(
      {
        abi: JSON.stringify(implArtifact.abi),
        bytecode: (implArtifact.bytecode || '').replace(/^0x/, ''),
        feeLimit: FEE_LIMIT_IMPL,
        name: 'TRC20TokenUpgradeable'
      },
      ownerAddr
    );
    await tronWeb.transactionBuilder.createSmartContract(
      {
        abi: JSON.stringify(proxyArtifact.abi),
        bytecode: (proxyArtifact.bytecode || '').replace(/^0x/, ''),
        parameters: [adminAddress, adminAddress, '0x'],
        feeLimit: FEE_LIMIT_PROXY,
        name: 'TransparentUpgradeableProxy'
      },
      ownerAddr
    );
    console.log('DRY-RUN OK. Implementation y Proxy se construyen correctamente. No se envió ninguna tx.');
    process.exit(0);
  }

  // 1. Desplegar Implementation
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
    throw new Error(decodeHexError(implResult.message) || 'Deploy Implementation falló');
  }
  const implAddress = tronWeb.address.fromHex(implTx.contract_address);
  console.log('  Implementation:', implAddress);

  // 2. Desplegar Proxy (impl, admin, 0x)
  console.log('Desplegando Proxy...');
  const proxyTx = await tronWeb.transactionBuilder.createSmartContract(
    {
      abi: JSON.stringify(proxyArtifact.abi),
      bytecode: (proxyArtifact.bytecode || '').replace(/^0x/, ''),
      parameters: [implAddress, adminAddress, '0x'],
      feeLimit: FEE_LIMIT_PROXY,
      name: 'TransparentUpgradeableProxy'
    },
    ownerAddr
  );
  const proxySigned = await tronWeb.trx.sign(proxyTx);
  const proxyResult = await tronWeb.trx.sendRawTransaction(proxySigned);
  if (!proxyResult.result) {
    throw new Error(decodeHexError(proxyResult.message) || 'Deploy Proxy falló');
  }
  const proxyAddress = tronWeb.address.fromHex(proxyTx.contract_address);
  console.log('  Proxy (token):', proxyAddress);

  // 3. initialize(name, symbol, decimals, initialSupply, owner)
  console.log('Inicializando token...');
  const tokenContract = await tronWeb.contract(implArtifact.abi, proxyAddress);
  await tokenContract.initialize(name, symbol, decimals, initialSupply, ownerAddr).send({ feeLimit: FEE_LIMIT_INIT });

  const deployInfo = {
    network: 'mainnet',
    tokenAddress: proxyAddress,
    implementationAddress: implAddress,
    proxyAdminAddress: adminAddress,
    constructorParams: { name, symbol, decimals, initialSupply },
    deployedAt: new Date().toISOString(),
    deployedVia: 'scripts/deploy-reuse-admin.js (TronWeb directo)'
  };
  fs.writeFileSync(path.join(root, 'deploy-info.json'), JSON.stringify(deployInfo, null, 2));

  console.log('');
  console.log('=== Despliegue completado ===');
  console.log('  Token (Proxy):', proxyAddress);
  console.log('  Implementation:', implAddress);
  console.log('  deploy-info.json actualizado.');
  console.log('');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
