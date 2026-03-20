#!/usr/bin/env node
'use strict';
/**
 * Compuerta obligatoria antes de upgrade:mainnet.
 * Comprueba PRIVATE_KEY y saldo/energy; sale con código 1 si falta algo.
 * Evita gastar TRX/energy en vano al bloquear el upgrade hasta que todo esté listo.
 * Uso: node scripts/upgrade-gate.js (llamado automáticamente por upgrade:mainnet)
 */
require('dotenv').config();
const path = require('node:path');
const fs = require('node:fs');
const https = require('node:https');

const ROOT = path.join(__dirname, '..');
const DEPLOYER = 'TWYhXqeMMtEePYnk2WdhoyyvHWxA1ay9Gz';
const API_KEY = (process.env.TRON_PRO_API_KEY || '').trim();
const API_TIMEOUT_MS = 25000; // TronGrid: evita colgar si API lenta o inaccesible
const ENERGY_PER_BYTE = 200;
const SUN_PER_ENERGY = 280;
const BYTECODE_BYTES = 19163;

function post(pathName, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body || {});
    const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) };
    if (API_KEY) headers['TRON-PRO-API-KEY'] = API_KEY;
    const opts = {
      hostname: 'api.trongrid.io',
      path: pathName.startsWith('/') ? pathName : '/' + pathName,
      method: 'POST',
      headers
    };
    const req = https.request(opts, (res) => {
      let buf = '';
      res.on('data', c => { buf += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(buf)); } catch { resolve({}); }
      });
    });
    req.on('error', reject);
    req.setTimeout(API_TIMEOUT_MS, () => {
      req.destroy();
      reject(new Error('TronGrid API timeout ' + API_TIMEOUT_MS / 1000 + 's'));
    });
    req.write(data);
    req.end();
  });
}

async function main() {
  const errores = [];

  // 1. PRIVATE_KEY obligatoria
  const pk = (process.env.PRIVATE_KEY || '').replace(/^0x/, '').trim();
  if (!pk || !/^[a-fA-F0-9]{64}$/.test(pk)) {
    errores.push('PRIVATE_KEY no configurada o inválida en .env (64 caracteres hex, sin 0x). Sin ella el upgrade fallará.');
  }

  // 2. deploy-info.json
  const deployPath = path.join(ROOT, 'deploy-info.json');
  if (!fs.existsSync(deployPath)) {
    errores.push('Falta deploy-info.json. Ejecutar deploy primero.');
  } else {
    let ownerAddr = DEPLOYER;
    try {
      const deploy = JSON.parse(fs.readFileSync(deployPath, 'utf8'));
      if (deploy.ownerAddress) ownerAddr = deploy.ownerAddress;

      // 3. Saldo/energy on-chain
      let balanceSun = 0;
      let energyLimit = 0;
      let energyUsed = 0;
      const acc = await post('wallet/getaccount', { address: ownerAddr, visible: true });
      if (acc && !acc.Error && acc.balance != null) balanceSun = Number(acc.balance) || 0;
      const res = await post('wallet/getaccountresource', { address: ownerAddr, visible: true });
      if (res && !res.Error) {
        energyLimit = Number(res.EnergyLimit) || 0;
        energyUsed = Number(res.EnergyUsed) || 0;
      }
      const energyFree = Math.max(0, energyLimit - energyUsed);
      const balanceTRX = balanceSun / 1e6;
      const energyDeploy = BYTECODE_BYTES * ENERGY_PER_BYTE;
      const energyUpgrade = 70000;
      const totalEnergy = energyDeploy + energyUpgrade;
      const costTRX = (totalEnergy * SUN_PER_ENERGY) / 1e6;

      const ok = balanceTRX >= costTRX || energyFree >= totalEnergy;
      if (!ok) {
        errores.push(
          `Saldo/energy insuficiente. Owner: ${ownerAddr}. ` +
          `TRX: ${balanceTRX.toFixed(2)}, energy libre: ${energyFree.toLocaleString()}. ` +
          `Necesitas ~${costTRX.toFixed(0)} TRX o ~${totalEnergy.toLocaleString()} energy. ` +
          'Alquila energy (GasStation, TronSave) o añade TRX.'
        );
      }
    } catch (e) {
      errores.push('Error leyendo deploy-info o consultando API: ' + e.message);
    }
  }

  // 4. build/contracts
  const implPath = path.join(ROOT, 'build', 'contracts', 'TRC20TokenUpgradeable.json');
  const adminPath = path.join(ROOT, 'build', 'contracts', 'ProxyAdmin.json');
  if (!fs.existsSync(implPath) || !fs.existsSync(adminPath)) {
    errores.push('Falta build. Ejecutar: npm run compile');
  }

  if (errores.length > 0) {
    console.error('\n=== COMPUERTA UPGRADE — BLOQUEADO ===');
    errores.forEach((e, i) => console.error(`  [${i + 1}] ${e}`));
    console.error('\nNo se ejecutará upgrade:mainnet hasta resolver lo anterior.');
    console.error('Pasos: 1) PRIVATE_KEY en .env  2) Alquilar ~4M energy o tener ~1093 TRX  3) npm run compile\n');
    process.exit(1);
  }

  console.log('\n[OK] Compuerta upgrade superada — requisitos listos.\n');
}

main().catch((e) => {
  console.error('Error en compuerta:', e);
  process.exit(1);
});
