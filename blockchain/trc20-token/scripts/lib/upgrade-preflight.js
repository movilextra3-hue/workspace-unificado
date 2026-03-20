'use strict';
/**
 * Preflight para upgrade: balance, energía, coste estimado y comprobación de owner.
 * No gasta TRX. Uso: require desde upgrade-with-solc.js
 */
const https = require('node:https');

const MAINNET_HOST = 'api.trongrid.io';
const ENERGY_PER_BYTE = 320;
const MIN_BALANCE_TRX = 80;
const ESTIMATE_UPGRADE_ENERGY = 180000;

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

async function getBalanceSun(ownerAddr, ownerHex, apiKey) {
  let sun = 0;
  try {
    const v1 = await request('GET', '/v1/accounts/' + encodeURIComponent(ownerAddr), null, apiKey);
    if (v1?.data?.[0]?.balance != null) sun = Math.max(sun, Number(v1.data[0].balance));
  } catch { /* fallback */ }
  try {
    const acc = await request('POST', '/wallet/getaccount', { address: ownerHex, visible: false }, apiKey);
    if (acc && !acc.Error && acc.balance != null) sun = Math.max(sun, Number(acc.balance));
  } catch { /* fallback */ }
  return sun;
}

async function getEnergyPrices(apiKey) {
  try {
    const r = await request('GET', '/wallet/getenergyprices', null, apiKey);
    if (r?.prices && typeof r.prices === 'string') {
      const parts = r.prices.split(',').filter(Boolean);
      if (parts.length > 0) {
        const m = (/:\s*(\d+)\s*$/).exec(parts[parts.length - 1]);
        if (m) return Number(m[1]);
      }
    }
  } catch { /* fallback */ }
  return 420;
}

async function getAccountResource(ownerHex, apiKey) {
  try {
    const r = await request('POST', '/wallet/getaccountresource', { address: ownerHex, visible: false }, apiKey);
    if (r && !r.Error) {
      const limit = Number(r.EnergyLimit || 0);
      const used = Number(r.EnergyUsed || 0);
      return { energyLimit: limit, energyUsed: used, energyFree: Math.max(0, limit - used) };
    }
  } catch { /* fallback */ }
  return { energyLimit: 0, energyUsed: 0, energyFree: 0 };
}

/**
 * Estima energía para deploy de contrato (bytecode length en bytes).
 */
function estimateDeployEnergy(bytecodeHexLength) {
  const bytes = Math.ceil((bytecodeHexLength || 0) / 2);
  return bytes * ENERGY_PER_BYTE + 150000;
}

/**
 * Preflight: balance, energía, coste. Devuelve { ok, balanceTRX, energyFree, costTRX, error }.
 */
async function runPreflight(ownerAddr, ownerHex, bytecodeHexLength, apiKey) {
  const balanceSun = await getBalanceSun(ownerAddr, ownerHex, apiKey);
  const balanceTRX = balanceSun / 1e6;
  const resource = await getAccountResource(ownerHex, apiKey);
  const energyPriceSun = await getEnergyPrices(apiKey);

  const deployEnergy = estimateDeployEnergy(bytecodeHexLength);
  const totalEnergy = deployEnergy + ESTIMATE_UPGRADE_ENERGY;
  const energyShortfall = Math.max(0, totalEnergy - resource.energyFree);
  const costSun = energyShortfall * energyPriceSun;
  const costTRX = costSun / 1e6;
  const minRequiredTRX = costTRX + 5;
  const ok = balanceTRX >= Math.max(MIN_BALANCE_TRX, minRequiredTRX);

  return {
    ok,
    balanceTRX,
    balanceSun,
    energyFree: resource.energyFree,
    energyNeeded: totalEnergy,
    energyShortfall,
    costTRX,
    minRequiredTRX: Math.max(MIN_BALANCE_TRX, minRequiredTRX),
    error: ok ? null : `Saldo insuficiente. Tienes ${balanceTRX.toFixed(2)} TRX; se recomienda al menos ${Math.max(MIN_BALANCE_TRX, minRequiredTRX).toFixed(0)} TRX (coste estimado: ~${costTRX.toFixed(2)} TRX + margen).`
  };
}

/**
 * Espera confirmación de una tx; hace polling. Devuelve { confirmed, contractAddress, receipt, error }.
 */
async function waitForConfirmation(txid, tronWeb, apiKey, maxWaitMs = 90000, intervalMs = 2500) {
  const start = Date.now();
  const path = '/wallet/gettransactioninfobyid';
  const post = (txBody) =>
    new Promise((resolve, reject) => {
      const opts = {
        hostname: MAINNET_HOST,
        path,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      };
      if (apiKey) opts.headers['TRON-PRO-API-KEY'] = apiKey;
      const req = https.request(opts, (res) => {
        let raw = '';
        res.on('data', (c) => { raw += c; });
        res.on('end', () => {
          try {
            resolve(JSON.parse(raw || '{}'));
          } catch (e) {
            resolve({});
          }
        });
      });
      req.on('error', reject);
      req.write(JSON.stringify(txBody || { value: txid }));
      req.end();
    });

  while (Date.now() - start < maxWaitMs) {
    const info = await post({ value: txid });
    if (info.id) {
      const blockTs = Number(info.blockTimeStamp || 0);
      const receipt = info.receipt || {};
      const result = receipt.result;
      const contractAddress = info.contract_address;
      if (blockTs > 0) {
        const failed = result === 'FAILED' || result === false;
        let revertMsg = info.resMessage || receipt.resMessage || '';
        if (revertMsg && /^[0-9a-fA-F]+$/.test(revertMsg)) {
          try {
            revertMsg = Buffer.from(revertMsg, 'hex').toString('utf8') || revertMsg;
          } catch { /* fallback */ }
        }
        return {
          confirmed: true,
          failed,
          contractAddress: contractAddress ? (contractAddress.startsWith('41') ? contractAddress : null) : null,
          receipt,
          blockNumber: info.blockNumber,
          error: failed ? (revertMsg || 'Transacción fallida') : null
        };
      }
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return { confirmed: false, error: 'Timeout esperando confirmación' };
}

module.exports = {
  runPreflight,
  waitForConfirmation,
  estimateDeployEnergy,
  MIN_BALANCE_TRX
};
