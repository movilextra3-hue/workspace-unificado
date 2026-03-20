#!/usr/bin/env node
'use strict';
/**
 * Comprueba saldo TRX y ENERGY del owner antes del upgrade.
 * Evita gastar TRX en vano: sin balance/energy suficiente el upgrade fallaría.
 * Uso: node scripts/check-saldo-upgrade.js
 *      npm run check:saldo
 *
 * Dirección: owner del ProxyAdmin (deploy-info o DEPLOYER por defecto).
 */
require('dotenv').config();
const path = require('node:path');
const fs = require('node:fs');
const https = require('node:https');

const ROOT = path.join(__dirname, '..');
const DEPLOYER = 'TWYhXqeMMtEePYnk2WdhoyyvHWxA1ay9Gz';
const API_KEY = (process.env.TRON_PRO_API_KEY || '').trim();
const API_TIMEOUT_MS = 20000;

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
  let ownerAddr = DEPLOYER;
  const deployPath = path.join(ROOT, 'deploy-info.json');
  if (fs.existsSync(deployPath)) {
    try {
      const deploy = JSON.parse(fs.readFileSync(deployPath, 'utf8'));
      if (deploy.ownerAddress) ownerAddr = deploy.ownerAddress;
    } catch (_) { /* usar DEPLOYER */ }
  }

  console.log('\n=== SALDO OWNER (ProxyAdmin) ===');
  console.log('Dirección:', ownerAddr);
  console.log('URL: https://tronscan.org/#/address/' + ownerAddr);

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

  console.log('Balance TRX:', balanceTRX.toFixed(2));
  console.log('Energy limit:', energyLimit, '| usado:', energyUsed, '| libre:', energyFree);

  const energyDeploy = BYTECODE_BYTES * ENERGY_PER_BYTE;
  const energyUpgrade = 70000;
  const totalEnergy = energyDeploy + energyUpgrade;
  const costTRX = (totalEnergy * SUN_PER_ENERGY) / 1e6;

  console.log('\n=== UPGRADE ESTIMADO ===');
  console.log('Energy necesaria (Deploy Impl):', energyDeploy.toLocaleString());
  console.log('Energy necesaria (Upgrade call):', energyUpgrade.toLocaleString());
  console.log('Total energy:', totalEnergy.toLocaleString());
  console.log('Coste si 0 energy (280 sun/energy):', costTRX.toFixed(0), 'TRX');

  const ok = balanceTRX >= costTRX || energyFree >= totalEnergy;
  if (ok) {
    console.log('\n[OK] Saldo/energy suficiente para upgrade.');
  } else {
    console.log('\n[!] Balance insuficiente. Necesitas ~' + costTRX.toFixed(0) + ' TRX o delegar/stakear ENERGY');
    console.log('    No ejecutar upgrade:mainnet hasta tener fondos o energy suficientes.');
    console.log('');
    console.log('=== ALTERNATIVA: Alquilar ENERGY (reduce coste hasta ~90%) ===');
    console.log('En vez de quemar TRX, alquila ~' + totalEnergy.toLocaleString() + ' energy para 1 día.');
    console.log('Plataformas (solo dirección, sin private key):');
    console.log('  - GasStation: https://www.gasstation.ai/en/buy');
    console.log('  - TronSave: https://tronsave.io');
    console.log('  - TronNRG / TronZap');
    console.log('Pasos: 1) Alquilar ~4M energy al owner arriba | 2) npm run upgrade:mainnet');
  }
  console.log('');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
