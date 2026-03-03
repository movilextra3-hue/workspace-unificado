#!/usr/bin/env node
'use strict';
/**
 * Estima en tiempo real el coste de desplegar el token en mainnet.
 * Consulta: recursos de tu cuenta (energía/ancho de banda) y precio de energía en la red.
 * Uso: node scripts/estimate-deploy-cost.js
 * Requiere: npm run compile (para leer bytecode) y .env con PRIVATE_KEY y TRON_PRO_API_KEY.
 */
require('dotenv').config();
const TronWeb = require('tronweb');
const path = require('path');
const fs = require('fs');
const https = require('https');

const MAINNET_HOST = 'api.trongrid.io';

function request(method, pathname, body, apiKey) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const opts = {
      hostname: MAINNET_HOST,
      path: pathname,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    if (apiKey) opts.headers['TRON-PRO-API-KEY'] = apiKey;

    const req = https.request(opts, (res) => {
      let raw = '';
      res.on('data', (ch) => { raw += ch; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(raw || '{}'));
        } catch (e) {
          resolve({});
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function get(pathname, apiKey) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: MAINNET_HOST,
      path: pathname,
      method: 'GET',
      headers: {}
    };
    if (apiKey) opts.headers['TRON-PRO-API-KEY'] = apiKey;

    https.get(opts, (res) => {
      let raw = '';
      res.on('data', (ch) => { raw += ch; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(raw || '{}'));
        } catch (e) {
          resolve({});
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  const privateKey = (process.env.PRIVATE_KEY || '').replace(/^0x/, '').trim();
  const apiKey = (process.env.TRON_PRO_API_KEY || '').trim();

  if (!privateKey || !/^[a-fA-F0-9]{64}$/.test(privateKey)) {
    console.error('Falta o PRIVATE_KEY inválido en .env. No se puede obtener la dirección.');
    process.exit(1);
  }

  const tronWeb = new TronWeb({
    fullHost: 'https://' + MAINNET_HOST,
    privateKey,
    headers: apiKey ? { 'TRON-PRO-API-KEY': apiKey } : {}
  });
  const ownerAddr = tronWeb.defaultAddress.base58;
  const ownerHex = tronWeb.address.toHex(ownerAddr);

  const buildDir = path.join(__dirname, '..', 'build', 'contracts');
  const loadBytecodeSize = (name) => {
    const p = path.join(buildDir, `${name}.json`);
    if (!fs.existsSync(p)) return 0;
    try {
      const art = JSON.parse(fs.readFileSync(p, 'utf8'));
      const bc = (art.bytecode || '').replace(/^0x/, '');
      return bc.length / 2;
    } catch (e) {
      return 0;
    }
  };

  const implBytes = loadBytecodeSize('TRC20TokenUpgradeable');
  const adminBytes = loadBytecodeSize('ProxyAdmin');
  const proxyBytes = loadBytecodeSize('TransparentUpgradeableProxy');

  if (implBytes === 0 || adminBytes === 0 || proxyBytes === 0) {
    console.error('Ejecuta antes: npm run compile');
    process.exit(1);
  }

  console.log('');
  console.log('=== ESTIMACIÓN DE COSTE DE DESPLIEGUE (mainnet, en tiempo real) ===');
  console.log('Dirección:', ownerAddr);
  console.log('');

  let resources = {};
  let energyPriceSun = 100;
  let balanceSun = 0;

  try {
    resources = await request('POST', '/wallet/getaccountresource', { address: ownerHex, visible: false }, apiKey);
  } catch (e) {
    console.warn('No se pudo obtener recursos de la cuenta:', e.message);
  }

  try {
    const prices = await get('/wallet/getenergyprices', apiKey);
    if (prices.prices && typeof prices.prices === 'string') {
      const parts = prices.prices.split(',').filter(Boolean);
      if (parts.length > 0) {
        const last = parts[parts.length - 1];
        const match = last.match(/:\s*(\d+)\s*$/);
        if (match) energyPriceSun = parseInt(match[1], 10);
      }
    }
  } catch (e) {
    console.warn('Usando precio de energía por defecto (100 sun).');
  }

  try {
    const acc = await request('POST', '/wallet/getaccount', { address: ownerHex, visible: false }, apiKey);
    balanceSun = Number(acc.balance || 0);
  } catch (e) {
    console.warn('No se pudo obtener balance.');
  }

  const energyLimit = Number(resources.EnergyLimit || 0);
  const energyUsed = Number(resources.EnergyUsed || 0);
  const energyFree = Math.max(0, energyLimit - energyUsed);
  const netLimit = Number(resources.NetLimit || 0);
  const netUsed = Number(resources.NetUsed || 0);
  const netFree = Math.max(0, netLimit - netUsed);

  // Heurística TRON: creación de contrato ~ 320 energía por byte de bytecode (orden de magnitud).
  // initialize() ~ 100k-200k energía.
  const ENERGY_PER_BYTE = 320;
  const energyImpl = implBytes * ENERGY_PER_BYTE;
  const energyAdmin = adminBytes * ENERGY_PER_BYTE;
  const energyProxy = proxyBytes * ENERGY_PER_BYTE;
  const energyInit = 150000;
  const totalEnergy = energyImpl + energyAdmin + energyProxy + energyInit;

  const energyToPay = Math.max(0, totalEnergy - energyFree);
  const costSun = energyToPay * energyPriceSun;
  const costTRX = costSun / 1e6;
  const balanceTRX = balanceSun / 1e6;

  // Límite actual en el script (100 TRX por tx × 4)
  const feeLimitPerTx = 1e8;
  const maxPossibleSun = 4 * feeLimitPerTx;
  const maxPossibleTRX = maxPossibleSun / 1e6;

  console.log('--- Recursos de tu cuenta (mainnet) ---');
  console.log('  Energía disponible:  ', energyFree.toLocaleString(), '(de', energyLimit.toLocaleString(), 'máx.)');
  console.log('  Ancho de banda libre:', netFree.toLocaleString());
  console.log('  Balance:             ', balanceTRX.toFixed(2), 'TRX');
  console.log('');
  console.log('--- Precio en red ---');
  console.log('  Precio energía:     ', energyPriceSun, 'sun/unidad');
  console.log('');
  console.log('--- Estimación para este despliegue ---');
  console.log('  Bytecode Implementation:', implBytes, 'bytes → ~', (energyImpl / 1000).toFixed(0), 'k energía');
  console.log('  Bytecode ProxyAdmin:    ', adminBytes, 'bytes → ~', (energyAdmin / 1000).toFixed(0), 'k energía');
  console.log('  Bytecode Proxy:         ', proxyBytes, 'bytes → ~', (energyProxy / 1000).toFixed(0), 'k energía');
  console.log('  Llamada initialize():   ~', (energyInit / 1000).toFixed(0), 'k energía');
  console.log('  Total energía estimada: ', totalEnergy.toLocaleString());
  console.log('');
  console.log('  Si no tienes energía suficiente, coste estimado en TRX:', costTRX.toFixed(2), 'TRX');
  console.log('  Límite máximo configurado (4 tx × 100 TRX):', maxPossibleTRX, 'TRX');
  console.log('');
  if (energyFree >= totalEnergy) {
    console.log('  → Tienes suficiente energía; el coste en TRX será bajo (solo ancho de banda).');
  } else {
    console.log('  → Recomendado tener al menos', Math.ceil(costTRX + 20), 'TRX en la wallet.');
  }
  if (balanceTRX < costTRX && energyFree < totalEnergy) {
    console.log('  ⚠ Balance insuficiente para cubrir la estimación. Añade TRX o energía.');
  }
  console.log('');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
