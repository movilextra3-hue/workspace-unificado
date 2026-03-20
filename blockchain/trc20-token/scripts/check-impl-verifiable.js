#!/usr/bin/env node
/**
 * Comprueba si la Implementation actual (deploy-info o addresses) produce bytecode
 * que coincida con mainnet. Si coincide → verificable en Tronscan.
 * Si no → hace falta npm run upgrade para desplegar Implementation verificable.
 * Uso: node scripts/check-impl-verifiable.js
 */
'use strict';
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

function getImplAddress() {
  const deployPath = path.join(ROOT, 'deploy-info.json');
  const addrPath = path.join(ROOT, 'abi', 'addresses.json');
  if (fs.existsSync(deployPath)) {
    const d = JSON.parse(fs.readFileSync(deployPath, 'utf8'));
    if (d.implementationAddress) return d.implementationAddress;
  }
  if (fs.existsSync(addrPath)) {
    const a = JSON.parse(fs.readFileSync(addrPath, 'utf8'));
    if (a.implementationAddress) return a.implementationAddress;
  }
  return null;
}

function fetchBytecode(addr) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ value: addr, visible: true });
    const req = https.request({
      hostname: 'api.trongrid.io',
      path: '/wallet/getcontractinfo',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, (res) => {
      let buf = '';
      res.on('data', c => { buf += c; });
      res.on('end', () => {
        const j = JSON.parse(buf);
        resolve((j.runtimecode || '').replace(/^0x/, ''));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function loadSolc() {
  return new Promise((resolve, reject) => {
    require('solc').loadRemoteVersion('v0.8.25+commit.b61c2a91', (err, s) => (err ? reject(err) : resolve(s)));
  });
}

function compile(solc, source) {
  const input = {
    language: 'Solidity',
    sources: { 'TRC20TokenUpgradeable.sol': { content: source } },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: 'shanghai',
      viaIR: false,
      metadata: { bytecodeHash: 'none' },
      outputSelection: { '*': { '*': ['evm.deployedBytecode'] } }
    }
  };
  const out = JSON.parse(solc.compile(JSON.stringify(input)));
  const err = out.errors?.find(e => e.severity === 'error');
  if (err) throw new Error(err.formattedMessage);
  const bc = out.contracts['TRC20TokenUpgradeable.sol']?.TRC20TokenUpgradeable?.evm?.deployedBytecode?.object;
  if (!bc) throw new Error('No deployedBytecode');
  return bc.replace(/^0x/, '');
}

async function main() {
  const implAddr = getImplAddress();
  if (!implAddr) {
    console.error('No implementationAddress en deploy-info.json ni abi/addresses.json');
    process.exit(1);
  }

  const verifPath = path.join(ROOT, 'verification', 'TRC20TokenUpgradeable.sol');
  if (!fs.existsSync(verifPath)) {
    require('./prepare-verification.js');
  }
  if (!fs.existsSync(verifPath)) {
    console.error('Ejecuta npm run prepare:verification primero');
    process.exit(1);
  }

  const source = fs.readFileSync(verifPath, 'utf8');
  const chainHex = await fetchBytecode(implAddr);
  const solc = await loadSolc();
  const compiledHex = compile(solc, source);

  const match = chainHex === compiledHex;
  if (match) {
    console.log('OK: La Implementation', implAddr, 'es VERIFICABLE en Tronscan.');
    console.log('Ejecuta: npm run prepare:verification y verifica en https://tronscan.org/#/contracts/verify');
    process.exit(0);
  } else {
    console.log('La Implementation', implAddr, 'NO es verificable: bytecode no coincide.');
    console.log('Mainnet:', chainHex.length / 2, 'bytes | Compilado:', compiledHex.length / 2, 'bytes');
    console.log('\nPara poder verificar: npm run upgrade');
    console.log('(Despliega nueva Implementation con código actual 0.8.25+Shanghai y actualiza el proxy.)');
    process.exit(1);
  }
}

main().catch(e => {
  console.error(e.message);
  process.exit(1);
});
