#!/usr/bin/env node
'use strict';
/**
 * Upgrade de la Implementation SIN usar TronBox.
 * Compila con solc 0.8.25 + Shanghai (mismo que Tronscan) y despliega con TronWeb.
 * Incluye todas las comprobaciones; --dry-run valida sin enviar transacciones.
 *
 * Uso:
 *   node scripts/upgrade-with-solc.js
 *   node scripts/upgrade-with-solc.js --dry-run
 */
const path = require('node:path');
const fs = require('node:fs');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const TRONSCAN_COMPILER = '0.8.25';
const TRONSCAN_EVM = 'shanghai';
const OPTIMIZER_RUNS = 200;
const SOLC_VERSION_TAG = 'v0.8.25+commit.b61c2a91';

const DRY_RUN = process.argv.includes('--dry-run');

const ROOT = path.join(__dirname, '..');
const CONTRACTS_DIR = path.join(ROOT, 'contracts');
const VERIFICATION_DIR = path.join(ROOT, 'verification');
const FLATTENED_SOURCE_PATH = path.join(VERIFICATION_DIR, 'TRC20TokenUpgradeable.sol');
const DEPLOY_INFO_PATH = path.join(ROOT, 'deploy-info.json');

function fail(msg, code = 1) {
  console.error('');
  console.error(msg);
  process.exit(code);
}

function findImports(importPath) {
  const fullPath = path.join(CONTRACTS_DIR, importPath.replace(/^\.\//, ''));
  if (!fs.existsSync(fullPath)) return { error: 'File not found: ' + importPath };
  try {
    return { contents: fs.readFileSync(fullPath, 'utf8') };
  } catch (e) {
    return { error: e.message || 'File not found' };
  }
}

function loadSolc025() {
  return new Promise((resolve, reject) => {
    const solc = require('solc');
    if (typeof solc.loadRemoteVersion !== 'function') {
      return reject(new Error('solc.loadRemoteVersion no disponible. Usa npm install solc y vuelve a intentar.'));
    }
    solc.loadRemoteVersion(SOLC_VERSION_TAG, (err, snapshot) => {
      if (err) return reject(err);
      resolve(snapshot);
    });
  });
}

/**
 * Compila el archivo aplanado verification/TRC20TokenUpgradeable.sol (el mismo que se sube a Tronscan).
 * Así el bytecode desplegado coincide exactamente con lo que Tronscan compila al verificar.
 */
function compileFlattenedForDeploy(solcSnapshot) {
  if (!fs.existsSync(FLATTENED_SOURCE_PATH)) {
    throw new Error(
      'Falta verification/TRC20TokenUpgradeable.sol. Ejecuta antes: npm run prepare:verification'
    );
  }
  const flattenedContent = fs.readFileSync(FLATTENED_SOURCE_PATH, 'utf8');
  // IMPORTANTE: NO usar metadata.bytecodeHash: 'none'. Tronscan compila con metadata por defecto.
  // TNduz3 (verificado) y compile-with-solc usan metadata estándar; bytecodeHash:none rompe verificación.
  const input = {
    language: 'Solidity',
    sources: { 'TRC20TokenUpgradeable.sol': { content: flattenedContent } },
    settings: {
      optimizer: { enabled: true, runs: OPTIMIZER_RUNS },
      evmVersion: TRONSCAN_EVM,
      outputSelection: {
        '*': { '*': ['abi', 'evm.bytecode'] }
      }
    }
  };
  const output = JSON.parse(solcSnapshot.compile(JSON.stringify(input)));
  if (output.errors) {
    const errs = output.errors.filter((e) => e.severity === 'error');
    if (errs.length) {
      const msgs = errs.map((e) => e.formattedMessage || e.message).join('\n');
      throw new Error('Compilación del archivo aplanado fallida:\n' + msgs);
    }
  }
  const implContract = output.contracts['TRC20TokenUpgradeable.sol']?.TRC20TokenUpgradeable;
  if (!implContract?.evm?.bytecode?.object) {
    throw new Error('No se generó bytecode de TRC20TokenUpgradeable en el archivo aplanado.');
  }
  return { abi: implContract.abi, bytecode: implContract.evm.bytecode.object };
}

/** Compila solo ProxyAdmin.sol para obtener ABI (misma versión 0.8.25). */
function compileProxyAdminAbi(solcSnapshot) {
  const adminPath = path.join(CONTRACTS_DIR, 'ProxyAdmin.sol');
  if (!fs.existsSync(adminPath)) throw new Error('Falta contracts/ProxyAdmin.sol');
  const sources = { 'ProxyAdmin.sol': { content: fs.readFileSync(adminPath, 'utf8') } };
  const input = {
    language: 'Solidity',
    sources,
    settings: {
      optimizer: { enabled: true, runs: OPTIMIZER_RUNS },
      evmVersion: TRONSCAN_EVM,
      outputSelection: { '*': { '*': ['abi'] } }
    }
  };
  const output = JSON.parse(solcSnapshot.compile(JSON.stringify(input), { import: findImports }));
  const admin = output.contracts['ProxyAdmin.sol']?.ProxyAdmin;
  if (!admin?.abi) throw new Error('No se generó ABI de ProxyAdmin');
  return admin.abi;
}

function compileWithSolc(solcSnapshot) {
  const impl = compileFlattenedForDeploy(solcSnapshot);
  const adminAbi = compileProxyAdminAbi(solcSnapshot);
  return {
    impl: { abi: impl.abi, bytecode: impl.bytecode },
    admin: { abi: adminAbi }
  };
}

async function main() {
  console.log('=== Upgrade sin TronBox (solc ' + TRONSCAN_COMPILER + ' + ' + TRONSCAN_EVM + ') ===\n');

  // 1. Comprobar .env
  const privateKey = (process.env.PRIVATE_KEY || '').replace(/^0x/, '').trim();
  if (!privateKey || !/^[a-fA-F0-9]{64}$/.test(privateKey)) {
    fail('Falta o PRIVATE_KEY inválido en .env (64 caracteres hex, sin 0x)');
  }
  const apiKey = (process.env.TRON_PRO_API_KEY || '').trim();
  if (!apiKey) {
    fail('TRON_PRO_API_KEY obligatoria en .env para mainnet');
  }

  // 2. Comprobar deploy-info.json
  if (!fs.existsSync(DEPLOY_INFO_PATH)) {
    fail('Falta deploy-info.json. Ejecutar un deploy completo primero.');
  }
  let deployInfo;
  try {
    deployInfo = JSON.parse(fs.readFileSync(DEPLOY_INFO_PATH, 'utf8'));
  } catch (e) {
    fail('deploy-info.json inválido: ' + e.message);
  }
  if (deployInfo.network && deployInfo.network !== 'mainnet') {
    fail('Este proyecto está configurado solo para mainnet.');
  }
  const proxyAddress = deployInfo.tokenAddress;
  const proxyAdminAddress = deployInfo.proxyAdminAddress;
  if (!proxyAddress || !proxyAdminAddress) {
    fail('deploy-info.json debe tener tokenAddress y proxyAdminAddress');
  }
  const validBase58 = (s) => /^T[A-HJ-NP-Za-km-z1-9]{33}$/.test(s);
  const validHex = (s) => /^41[a-fA-F0-9]{40}$/.test((s || '').replace(/^0x/, ''));
  if (!validBase58(proxyAddress) && !validHex(proxyAddress)) {
    fail('deploy-info.json: tokenAddress no es una dirección TRON válida');
  }
  if (!validBase58(proxyAdminAddress) && !validHex(proxyAdminAddress)) {
    fail('deploy-info.json: proxyAdminAddress no es una dirección TRON válida');
  }

  // 3. Cargar solc 0.8.25 y compilar
  console.log('Cargando compilador ' + SOLC_VERSION_TAG + '...');
  let solcSnapshot;
  try {
    solcSnapshot = await loadSolc025();
  } catch (e) {
    fail('No se pudo cargar solc 0.8.25 (¿red disponible?): ' + e.message);
  }
  console.log('Compilando verification/TRC20TokenUpgradeable.sol (mismo archivo que Tronscan) con ' + TRONSCAN_COMPILER + ', EVM ' + TRONSCAN_EVM + ', runs ' + OPTIMIZER_RUNS + '...');
  let compiled;
  try {
    compiled = compileWithSolc(solcSnapshot);
  } catch (e) {
    fail(e.message);
  }
  console.log('Compilación OK. Bytecode listo para desplegar y verificar en Tronscan.\n');

  if (DRY_RUN) {
    console.log('[DRY-RUN] Se desplegaría la nueva Implementation y se llamaría ProxyAdmin.upgrade(' + proxyAddress + ', <nueva_impl>).');
    console.log('[DRY-RUN] No se ha enviado ninguna transacción.');
    process.exit(0);
  }

  // 4. Conectar
  const { TronWeb } = require('tronweb');
  const { runPreflight, waitForConfirmation } = require('./lib/upgrade-preflight');
  const tronWeb = new TronWeb({
    fullHost: 'https://api.trongrid.io',
    privateKey,
    headers: { 'TRON-PRO-API-KEY': apiKey }
  });
  const toBase58 = (addr) => (validHex(addr) ? tronWeb.address.fromHex((addr || '').replace(/^0x/, '')) : addr);
  const proxyAddr = toBase58(proxyAddress);
  const adminAddr = toBase58(proxyAdminAddress);
  const ownerAddr = tronWeb.defaultAddress.base58;
  const ownerHex = tronWeb.address.toHex(ownerAddr);

  const bytecode = (compiled.impl.bytecode || '').replace(/^0x/, '');
  const bytecodeLen = bytecode.length;

  // 5. Preflight: balance y energía (no gasta TRX)
  console.log('\n--- Preflight (sin gastar TRX) ---');
  const preflight = await runPreflight(ownerAddr, ownerHex, bytecodeLen, apiKey);
  console.log('  Saldo:      ', preflight.balanceTRX.toFixed(2), 'TRX');
  console.log('  Energía libre:', preflight.energyFree);
  console.log('  Energía necesaria (estimada):', preflight.energyNeeded);
  console.log('  Coste estimado (si falta energía):', preflight.costTRX.toFixed(2), 'TRX');
  if (!preflight.ok) {
    fail(preflight.error || 'Saldo insuficiente. No se enviará ninguna transacción.');
  }
  console.log('  OK — saldo suficiente.');

  // Comprobar que somos owner del ProxyAdmin (evita gastar TRX en deploy y fallar en upgrade)
  const proxyAdminCheck = await tronWeb.contract(compiled.admin.abi, adminAddr);
  let currentOwner = null;
  try {
    currentOwner = await proxyAdminCheck.owner().call();
  } catch (e) {
    fail('No se pudo leer ProxyAdmin.owner() (¿contrato existe en mainnet?): ' + (e.message || e));
  }
  const norm = (a) => (typeof a !== 'string' ? '' : a.trim());
  const cur = norm(currentOwner);
  const ownerMatch =
    cur === ownerAddr ||
    cur === ownerHex ||
    (cur.length === 42 && cur.toLowerCase() === ownerHex.toLowerCase()) ||
    (cur.length === 34 && cur === ownerAddr);
  if (!ownerMatch) {
    fail(
      'Tu dirección (' +
        ownerAddr +
        ') no es el owner del ProxyAdmin. Solo el owner puede hacer upgrade. No se enviará ninguna transacción.'
    );
  }
  console.log('  ProxyAdmin.owner(): OK (eres el owner).\n');

  console.log('Proxy:', proxyAddr);
  console.log('ProxyAdmin:', adminAddr);
  console.log('');

  // 6. Transacción 1: Desplegar Implementation
  console.log('[1/2] Desplegando nueva Implementation...');
  const implTx = await tronWeb.transactionBuilder.createSmartContract(
    {
      abi: JSON.stringify(compiled.impl.abi),
      bytecode,
      feeLimit: 1000 * 1e6,
      name: 'TRC20TokenUpgradeable'
    },
    ownerAddr
  );
  const implSigned = await tronWeb.trx.sign(implTx);
  const implResult = await tronWeb.trx.sendRawTransaction(implSigned);

  if (!implResult.result) {
    const msg = implResult.message || implResult.code || JSON.stringify(implResult);
    fail('Envío de tx de deploy fallido (no se ha actualizado el proxy): ' + msg);
  }
  const deployTxid = implResult.txid || implResult.transaction?.txID || implSigned.txID;
  if (!deployTxid) {
    fail('No se obtuvo txid del deploy. Revisa la respuesta en Tronscan.');
  }
  console.log('  TxID:', deployTxid);
  console.log('  Tronscan: https://tronscan.org/#/transaction/' + deployTxid);
  console.log('  Esperando confirmación...');

  const deployConfirmed = await waitForConfirmation(deployTxid, tronWeb, apiKey);
  if (!deployConfirmed.confirmed) {
    fail('Timeout o error al confirmar el deploy: ' + (deployConfirmed.error || ''));
  }
  if (deployConfirmed.failed) {
    const msg = deployConfirmed.error || 'Transacción revertida';
    fail('Deploy falló en chain (la tx se confirmó pero revertió). No se ha actualizado el proxy. ' + msg);
  }
  let newImplAddress = null;
  if (deployConfirmed.contractAddress) {
    const raw = deployConfirmed.contractAddress;
    newImplAddress = raw.startsWith('41') || raw.startsWith('0x') ? tronWeb.address.fromHex(raw.replace(/^0x/, '')) : raw;
  }
  if (!newImplAddress && implTx.contract_address) {
    newImplAddress = tronWeb.address.fromHex(implTx.contract_address);
  }
  if (!newImplAddress) {
    fail('No se pudo obtener la dirección del contrato desplegado desde el receipt. TxID: ' + deployTxid);
  }
  console.log('  Confirmado en bloque', deployConfirmed.blockNumber);
  console.log('  Nueva Implementation:', newImplAddress);
  console.log('');

  // 7. Transacción 2: ProxyAdmin.upgrade
  console.log('[2/2] Llamando ProxyAdmin.upgrade...');
  const proxyAdmin = await tronWeb.contract(compiled.admin.abi, adminAddr);
  let upgradeResult;
  try {
    upgradeResult = await proxyAdmin.upgrade(proxyAddr, newImplAddress).send({ feeLimit: 500 * 1e6 });
  } catch (e) {
    fail('Envío de tx upgrade falló (la Implementation ya está desplegada; puedes apuntar el proxy manualmente si hace falta): ' + (e.message || e));
  }
  const upgradeTxid =
    upgradeResult?.transaction?.txID || upgradeResult?.txID || upgradeResult?.txid || upgradeResult?.transactionId;
  if (upgradeTxid) {
    console.log('  TxID:', upgradeTxid);
    console.log('  Tronscan: https://tronscan.org/#/transaction/' + upgradeTxid);
    console.log('  Esperando confirmación...');
    const upgradeConfirmed = await waitForConfirmation(upgradeTxid, tronWeb, apiKey);
    if (!upgradeConfirmed.confirmed) {
      fail('Timeout al confirmar upgrade. Comprueba en Tronscan si la tx se aplicó: ' + upgradeTxid);
    }
    if (upgradeConfirmed.failed) {
      fail('Upgrade falló en chain: ' + (upgradeConfirmed.error || 'Revertido') + '. TxID: ' + upgradeTxid);
    }
    console.log('  Confirmado en bloque', upgradeConfirmed.blockNumber);
  }
  console.log('');

  deployInfo.implementationAddress = newImplAddress;
  deployInfo.lastUpgrade = new Date().toISOString();
  fs.writeFileSync(DEPLOY_INFO_PATH, JSON.stringify(deployInfo, null, 2));
  console.log('deploy-info.json actualizado.');

  const addressesPath = path.join(ROOT, 'abi', 'addresses.json');
  if (fs.existsSync(addressesPath)) {
    try {
      const addresses = JSON.parse(fs.readFileSync(addressesPath, 'utf8'));
      addresses.implementationAddress = newImplAddress;
      addresses.updatedAt = new Date().toISOString();
      fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
      console.log('abi/addresses.json actualizado.');
    } catch (e) {
      console.warn('No se pudo actualizar abi/addresses.json:', e.message);
    }
  }

  console.log('\n=== Upgrade completado con éxito ===');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
