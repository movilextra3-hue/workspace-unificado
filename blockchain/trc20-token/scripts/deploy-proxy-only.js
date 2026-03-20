#!/usr/bin/env node
'use strict';
/**
 * Despliega SOLO el Proxy reutilizando Implementation y ProxyAdmin ya existentes en mainnet.
 * Útil cuando la Implementation y el ProxyAdmin están OK pero la creación del Proxy falló (tx FAIL).
 *
 * Requisitos en .env:
 *   PRIVATE_KEY, TRON_PRO_API_KEY
 *   PROXY_ADMIN_ADDRESS (ProxyAdmin existente)
 *   IMPL_ADDRESS (Implementation existente, p. ej. TYqRvxioNWBqVa2nJGog8RkYQrXQdPJwR3)
 *   TOKEN_NAME, TOKEN_SYMBOL, TOKEN_DECIMALS, TOKEN_SUPPLY
 *
 * Uso:
 *   node scripts/deploy-proxy-only.js
 *   npm run deploy:proxy-only
 */
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { TronWeb } = require('tronweb');
const fs = require('node:fs');

const FEE_LIMIT_PROXY = 150000000;  // 150 TRX
const FEE_LIMIT_INIT = 50000000;    // 50 TRX
const ROOT = path.join(__dirname, '..');

function decodeHexError(msg) {
  const str = String(msg || '').trim();
  if (/^[0-9a-fA-F]+$/.test(str)) {
    try { return Buffer.from(str, 'hex').toString('utf8') || str; } catch (e) { return str; }
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
    console.error('Falta TRON_PRO_API_KEY en .env.');
    process.exit(1);
  }
  const adminAddress = (process.env.PROXY_ADMIN_ADDRESS || '').trim();
  const implAddress = (process.env.IMPL_ADDRESS || '').trim();
  if (!adminAddress || !implAddress) {
    console.error('Faltan PROXY_ADMIN_ADDRESS e IMPL_ADDRESS en .env (contratos existentes en mainnet).');
    process.exit(1);
  }

  const buildDir = path.join(ROOT, 'build', 'contracts');
  const implArtifact = JSON.parse(fs.readFileSync(path.join(buildDir, 'TRC20TokenUpgradeable.json'), 'utf8'));
  const proxyArtifact = JSON.parse(fs.readFileSync(path.join(buildDir, 'TransparentUpgradeableProxy.json'), 'utf8'));

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
  console.log('=== Desplegar solo Proxy (reutilizar Impl + ProxyAdmin) ===');
  console.log('  Implementation (existente):', implAddress);
  console.log('  ProxyAdmin (existente):    ', adminAddress);
  console.log('  Token:', name, '(' + symbol + '), owner:', ownerAddr);
  console.log('');

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
    console.error(decodeHexError(proxyResult.message) || 'Deploy Proxy falló.');
    process.exit(1);
  }
  const proxyAddress = tronWeb.address.fromHex(proxyTx.contract_address);
  console.log('  Proxy (token):', proxyAddress);

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
          console.error('La tx del Proxy falló en cadena.');
          process.exit(1);
        }
      } catch (_e) { /* sigue esperando */ }
    }
    if (!confirmed) console.log('  Aviso: no se detectó confirmación en 60 s; intentando initialize.');
  } else {
    await new Promise((r) => setTimeout(r, 10000));
  }

  console.log('Inicializando token en el Proxy...');
  const tokenContract = await tronWeb.contract(implArtifact.abi, proxyAddress);
  await tokenContract.initialize(name, symbol, decimals, initialSupply, ownerAddr).send({ feeLimit: FEE_LIMIT_INIT });
  console.log('  initialize() OK.');

  const deployInfo = {
    network: 'mainnet',
    tokenAddress: proxyAddress,
    implementationAddress: implAddress,
    proxyAdminAddress: adminAddress,
    constructorParams: { name, symbol, decimals, initialSupply },
    deployedAt: new Date().toISOString(),
    deployedVia: 'scripts/deploy-proxy-only.js (solo Proxy, Impl+Admin reutilizados)'
  };
  fs.writeFileSync(path.join(ROOT, 'deploy-info.json'), JSON.stringify(deployInfo, null, 2));

  console.log('');
  console.log('=== Completado ===');
  console.log('  Token (Proxy):     ', proxyAddress);
  console.log('  Implementation:    ', implAddress);
  console.log('  deploy-info.json actualizado.');
  console.log('');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
