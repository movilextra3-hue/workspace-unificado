'use strict';
/**
 * Despliega solo Implementation + Proxy reutilizando una ProxyAdmin ya existente en mainnet.
 * Usar cuando ya tienes ProxyAdmin desplegada(s) pero Implementation falló (ej. OUT_OF_ENERGY).
 *
 * NO EJECUTAR DIRECTAMENTE con tronbox migrate -f 3. Usar siempre:
 *   npm run migrate-3-safe
 * para que la verificación obligatoria (balance, energía, ProxyAdmin, feeLimit) se ejecute antes.
 * Así no se gasta TRX hasta que todo esté correcto.
 *
 * Requiere: PROXY_ADMIN_ADDRESS en .env (una de las 3 ProxyAdmin en docs).
 */
const fs = require('node:fs');
const path = require('node:path');
const TRC20TokenUpgradeable = artifacts.require('TRC20TokenUpgradeable');
const TransparentUpgradeableProxy = artifacts.require('TransparentUpgradeableProxy');
const ProxyAdmin = artifacts.require('ProxyAdmin');

const MIN_FEE_LIMIT_IMPL_SUN = 250000000; // 250 TRX — evita OUT_OF_ENERGY en "save just created contract code"

function parseEnvDecimals() {
  const raw = process.env.TOKEN_DECIMALS || '18';
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n) || n < 0 || n > 255) throw new Error('TOKEN_DECIMALS debe ser un número entre 0 y 255');
  return n;
}

function parseEnvSupply() {
  const raw = (process.env.TOKEN_SUPPLY || '1000000').trim();
  if (!/^\d+$/.test(raw)) throw new Error('TOKEN_SUPPLY debe ser un entero positivo');
  return Number.parseInt(raw, 10);
}

async function deployReuseAdmin(deployer, network, accounts) {
  // Garantía: en mainnet no gastar TRX sin haber pasado la verificación (solo npm run migrate-3-safe define MIGRATE_3_VERIFIED).
  if (network === 'mainnet' && process.env.MIGRATE_3_VERIFIED !== '1') {
    throw new Error(
      'No ejecutes tronbox migrate -f 3 directo en mainnet (gastas TRX sin verificar). Usa siempre: npm run migrate-3-safe'
    );
  }

  const existingAdminAddress = (process.env.PROXY_ADMIN_ADDRESS || '').trim();
  if (!existingAdminAddress) {
    throw new Error(
      'PROXY_ADMIN_ADDRESS requerido en .env. Obtener de Tronscan desde una tx de creación de ProxyAdmin (campo contract_address).'
    );
  }

  // Garantía: no desplegar en mainnet con feeLimit bajo (evita repetir OUT_OF_ENERGY del despliegue anterior).
  if (network === 'mainnet') {
    let feeLimit = null;
    try {
      const tronboxConfig = require(path.join(__dirname, '..', 'config', 'trc20-networks.js'));
      const mainnetFeeLimit = tronboxConfig?.networks?.mainnet?.feeLimit;
      if (mainnetFeeLimit != null) feeLimit = Number(mainnetFeeLimit);
    } catch (err) {
      // Fallback: si no se puede cargar tronbox, feeLimit queda null y se valida abajo
      if (process.env.DEBUG) console.debug('tronbox config:', err?.message ?? String(err));
    }
    if (feeLimit == null || feeLimit < MIN_FEE_LIMIT_IMPL_SUN) {
      throw new Error(
        'tronbox.js mainnet.feeLimit debe ser >= 250000000 (250 TRX) para evitar OUT_OF_ENERGY en deploy Implementation. ' +
        'Usa npm run migrate-3-safe para verificar antes de desplegar.'
      );
    }
  }

  const name = process.env.TOKEN_NAME || 'Colateral USD';
  const symbol = process.env.TOKEN_SYMBOL || 'USTD';
  const decimals = parseEnvDecimals();
  const initialSupply = parseEnvSupply();
  const initialOwner = accounts[0];

  // 1. Desplegar solo la Implementation (la que falló antes)
  await deployer.deploy(TRC20TokenUpgradeable);
  const impl = await TRC20TokenUpgradeable.deployed();

  // 2. Usar ProxyAdmin existente (no desplegar)
  const admin = await ProxyAdmin.at(existingAdminAddress);

  // 3. Desplegar Proxy apuntando a la nueva Implementation y al admin existente
  await deployer.deploy(
    TransparentUpgradeableProxy,
    impl.address,
    admin.address,
    '0x'
  );

  const proxy = await TransparentUpgradeableProxy.deployed();
  const token = await TRC20TokenUpgradeable.at(proxy.address);
  await token.initialize(name, symbol, decimals, initialSupply, initialOwner);

  console.log('Token (Proxy):', proxy.address);
  console.log('Implementation:', impl.address);
  console.log('ProxyAdmin (reutilizada):', admin.address);

  if (network === 'mainnet') {
    const deployInfo = {
      network,
      tokenAddress: proxy.address,
      implementationAddress: impl.address,
      proxyAdminAddress: admin.address,
      constructorParams: { name, symbol, decimals, initialSupply },
      deployedAt: new Date().toISOString(),
      deployedVia: 'tronbox migrate (reuse ProxyAdmin)'
    };
    const deployInfoPath = path.join(__dirname, '..', 'deploy-info.json');
    fs.writeFileSync(deployInfoPath, JSON.stringify(deployInfo, null, 2));
    console.log('deploy-info.json generado');
  }
}

module.exports = deployReuseAdmin;
