#!/usr/bin/env node
'use strict';
/**
 * Comprueba si los contratos desplegados están verificados en Tronscan.
 * Usa deploy-info.json o abi/addresses.json para las direcciones.
 * Uso: node scripts/check-contract-verified.js
 *      node scripts/check-contract-verified.js --all  (comprueba Proxy, Implementation y ProxyAdmin)
 */
const https = require('node:https');
const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.join(__dirname, '..');
const DEPLOY_INFO = path.join(ROOT, 'deploy-info.json');
const ADDRESSES = path.join(ROOT, 'abi', 'addresses.json');

function loadAddresses() {
  let tokenAddress, implementationAddress, proxyAdminAddress;
  if (fs.existsSync(DEPLOY_INFO)) {
    const info = JSON.parse(fs.readFileSync(DEPLOY_INFO, 'utf8'));
    tokenAddress = info.tokenAddress;
    implementationAddress = info.implementationAddress;
    proxyAdminAddress = info.proxyAdminAddress;
  }
  if ((!implementationAddress || !tokenAddress) && fs.existsSync(ADDRESSES)) {
    const addr = JSON.parse(fs.readFileSync(ADDRESSES, 'utf8'));
    tokenAddress = tokenAddress || addr.tokenAddress;
    implementationAddress = implementationAddress || addr.implementationAddress;
    proxyAdminAddress = proxyAdminAddress || addr.proxyAdminAddress;
  }
  return { tokenAddress, implementationAddress, proxyAdminAddress };
}

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let d = '';
      res.on('data', (c) => { d += c; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(d));
        } catch (e) {
          resolve({});
        }
      });
    }).on('error', reject);
  });
}

async function checkVerified(contractAddress) {
  const r = await get('https://apilist.tronscanapi.com/api/contract?contract=' + encodeURIComponent(contractAddress));
  const c = r.data && r.data[0];
  const status = c ? (c.verify_status ?? 0) : 0;
  return { address: contractAddress, status, verified: status === 2 };
}

async function main() {
  const checkAll = process.argv.includes('--all');
  const addrs = loadAddresses();

  if (!addrs.tokenAddress && !addrs.implementationAddress) {
    console.error('Falta deploy-info.json o abi/addresses.json con tokenAddress e implementationAddress.');
    process.exit(1);
  }

  const toCheck = [];
  if (addrs.implementationAddress) toCheck.push({ name: 'Implementation', addr: addrs.implementationAddress });
  if (checkAll && addrs.tokenAddress) toCheck.push({ name: 'Proxy (token)', addr: addrs.tokenAddress });
  if (checkAll && addrs.proxyAdminAddress) toCheck.push({ name: 'ProxyAdmin', addr: addrs.proxyAdminAddress });
  if (toCheck.length === 0 && addrs.tokenAddress) toCheck.push({ name: 'Proxy (token)', addr: addrs.tokenAddress });

  console.log('');
  console.log('=== Estado de verificación en Tronscan ===');
  console.log('');

  let allOk = true;
  for (let i = 0; i < toCheck.length; i++) {
    if (i > 0) await new Promise((ok) => setTimeout(ok, 450));
    const { name, addr } = toCheck[i];
    const result = await checkVerified(addr);
    const label = result.verified ? 'VERIFICADO' : 'No verificado';
    console.log(name + ' (' + addr + '): ' + label + (result.verified ? '' : ' (verify_status=' + result.status + ')'));
    if (!result.verified) allOk = false;
    if (result.verified) console.log('  https://tronscan.org/#/contract/' + addr);
  }

  console.log('');
  if (!allOk) {
    const implAddr = addrs.implementationAddress;
    if (implAddr && implAddr.startsWith('TFeLLtutbo')) {
      console.log('Implementation (TFeLLtutbo): 0.8.25, Shanghai, runs 200, metadata.bytecodeHash:none (coincide con mainnet).');
      console.log('  Tronscan no expone bytecodeHash:none → verificar en OKLink con Standard JSON:');
      console.log('    npm run generate:standard-input && npm run verify:oklink:playwright');
      console.log('    npm run guardar:verificacion → PAQUETE-VERIFICACION-POST-UPGRADE/');
      console.log('  Ver docs/vitacora/CONSOLIDACION_COMPLETA_TODO.md');
    } else if (implAddr === 'TYqRvxioNWBqVa2nJGog8RkYQrXQdPJwR3') {
      console.log('Implementation (TYqRvxio): desplegado con 0.8.34. Tronscan no ofrece 0.8.34 → OKLink.');
      console.log('  npm run verify:oklink:playwright:legacy -- --step2');
      console.log('  Ver docs/vitacora/CONSOLIDACION_COMPLETA_TODO.md');
    } else {
      console.log('Para verificar: npm run prepare:verification');
      console.log('  Tronscan: https://tronscan.org/#/contracts/verify');
      console.log('  OKLink: https://www.oklink.com/tron/verify-contract-preliminary');
      console.log('  Ver docs/vitacora/CONSOLIDACION_COMPLETA_TODO.md');
    }
    process.exit(1);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
