#!/usr/bin/env node
'use strict';
/**
 * Simula la comparación que hace un explorador (Tronscan, OKLink, Etherscan) al verificar un contrato.
 *
 * CÓMO FUNCIONA LA VERIFICACIÓN EN LOS EXPLORADORES:
 * 1. Obtienen el bytecode desplegado en la red (runtime bytecode) vía RPC/API (ej. getcontractinfo).
 * 2. Compilan el código fuente que tú subes con los parámetros que indicas (compilador, optimizer, runs, evmVersion, metadata).
 * 3. Comparan bytecode compilado vs bytecode en red. Si son idénticos → verificación OK.
 *
 * Este script hace exactamente eso en local: obtiene bytecode de mainnet, compila nuestro source
 * con nuestra config y con una config "tipo Tronscan" (sin bytecodeHash:none), y muestra el resultado.
 * Así puedes monitorear/investigar por qué Tronscan falla (ellos no usan bytecodeHash:none → bytecode distinto).
 *
 * Uso: node scripts/simulate-verification-comparison.js
 *      npm run verify:simulate (si está en package.json)
 */
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const https = require('node:https');
const fs = require('node:fs');

const ROOT = path.join(__dirname, '..');

function loadAddresses() {
  const def = {
    implementation: 'TFeLLtutboNwVwSSdNqAiXoQGzXZrbTDMC'
  };
  for (const p of ['deploy-info.json', path.join('abi', 'addresses.json')]) {
    const fp = path.join(ROOT, p);
    if (fs.existsSync(fp)) {
      try {
        const d = JSON.parse(fs.readFileSync(fp, 'utf8'));
        const impl = d.implementationAddress || d.implementation;
        if (impl) return { ...def, implementation: impl };
      } catch (_) { /* ignore */ }
    }
  }
  return def;
}

const ADDRS = loadAddresses();
const API_KEY = process.env.TRON_PRO_API_KEY || '';

function fetchBytecode(addr) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ value: addr, visible: true });
    const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) };
    if (API_KEY) headers['TRON-PRO-API-KEY'] = API_KEY;
    const req = https.request({
      hostname: 'api.trongrid.io',
      path: '/wallet/getcontractinfo',
      method: 'POST',
      headers
    }, (res) => {
      let buf = '';
      res.on('data', c => { buf += c; });
      res.on('end', () => {
        try {
          const j = JSON.parse(buf);
          resolve((j.runtimecode || '').replace(/^0x/, ''));
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function findImports(imp) {
  const clean = imp.replace(/^\.\//, '');
  for (const dir of ['verification', 'contracts']) {
    const fp = path.join(ROOT, dir, clean);
    if (fs.existsSync(fp)) return { contents: fs.readFileSync(fp, 'utf8') };
  }
  return { error: 'File not found: ' + imp };
}

/** Compila con la config del proyecto (trc20-networks: bytecodeHash:none). */
function compileWithProjectConfig(solc, source) {
  const config = require(path.join(ROOT, 'config', 'trc20-networks.js'));
  const comp = config.compilers?.solc || {};
  const input = {
    language: 'Solidity',
    sources: { 'TRC20TokenUpgradeable.sol': { content: source } },
    settings: {
      optimizer: {
        enabled: comp.settings?.optimizer?.enabled !== false,
        runs: comp.settings?.optimizer?.runs ?? 200
      },
      evmVersion: comp.settings?.evmVersion || 'shanghai',
      viaIR: false,
      metadata: comp.settings?.metadata || { bytecodeHash: 'none' },
      outputSelection: { '*': { '*': ['evm.deployedBytecode'] } }
    }
  };
  const out = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));
  const err = out.errors?.find(e => e.severity === 'error');
  if (err) throw new Error(err.formattedMessage);
  const bc = out.contracts?.['TRC20TokenUpgradeable.sol']?.TRC20TokenUpgradeable?.evm?.deployedBytecode?.object;
  if (!bc) throw new Error('No deployedBytecode');
  return bc.replace(/^0x/, '');
}

/** Compila SIN bytecodeHash:none (como hace Tronscan por defecto: metadata por defecto = ipfs). */
function compileLikeTronscan(solc, source) {
  const input = {
    language: 'Solidity',
    sources: { 'TRC20TokenUpgradeable.sol': { content: source } },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: 'shanghai',
      outputSelection: { '*': { '*': ['evm.deployedBytecode'] } }
    }
  };
  const out = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));
  const err = out.errors?.find(e => e.severity === 'error');
  if (err) throw new Error(err.formattedMessage);
  const bc = out.contracts?.['TRC20TokenUpgradeable.sol']?.TRC20TokenUpgradeable?.evm?.deployedBytecode?.object;
  if (!bc) throw new Error('No deployedBytecode');
  return bc.replace(/^0x/, '');
}

/** Primer índice (hex) donde difieren, o -1 si iguales hasta el mínimo length. */
function firstDiffIndex(a, b) {
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i += 2) {
    if (a.slice(i, i + 2) !== b.slice(i, i + 2)) return i;
  }
  return a.length !== b.length ? len : -1;
}

async function main() {
  console.log('\n=== Simulación: comparación código fuente vs bytecode en red ===\n');
  console.log('Cómo lo hace el explorador (Tronscan, OKLink, Etherscan):');
  console.log('  1. Obtiene el bytecode desplegado en la red (runtime bytecode).');
  console.log('  2. Compila el código que subes con los parámetros indicados.');
  console.log('  3. Compara bytecode compilado === bytecode en red → verificación OK.\n');

  let solc;
  try {
    solc = require('solc');
  } catch (e) {
    console.error('solc no instalado. npm install solc');
    process.exit(1);
  }

  const implAddr = ADDRS.implementation;
  console.log('Implementation:', implAddr);
  console.log('Obteniendo bytecode en mainnet...');

  const mainnetHex = await fetchBytecode(implAddr);
  const mainnetBytes = mainnetHex.length / 2;
  console.log('  Mainnet bytecode:', mainnetBytes, 'bytes\n');

  let verifPath = path.join(ROOT, 'verification', 'PAQUETE-VERIFICACION-POST-UPGRADE', 'TRC20TokenUpgradeable.sol');
  if (!fs.existsSync(verifPath)) verifPath = path.join(ROOT, 'contracts', 'TRC20TokenUpgradeable.sol');
  if (!fs.existsSync(verifPath)) {
    console.error('No se encontró TRC20TokenUpgradeable.sol. Ejecuta: npm run guardar:verificacion');
    process.exit(1);
  }
  const source = fs.readFileSync(verifPath, 'utf8');

  console.log('--- 1. Nuestra config (config/trc20-networks.js: 0.8.25, Shanghai, 200, bytecodeHash:none) ---');
  const ourBytecode = compileWithProjectConfig(solc, source);
  const ourBytes = ourBytecode.length / 2;
  const matchOurs = mainnetHex === ourBytecode;
  console.log('  Compilado:', ourBytes, 'bytes');
  console.log('  ¿Coincide con mainnet?', matchOurs ? 'Sí' : 'No');
  if (!matchOurs) {
    const idx = firstDiffIndex(mainnetHex, ourBytecode);
    if (idx >= 0) console.log('  Primer byte distinto: posición', idx / 2, '(hex index', idx + ')');
  }
  console.log('');

  console.log('--- 2. Config tipo Tronscan (sin bytecodeHash:none; metadata por defecto) ---');
  const tronscanBytecode = compileLikeTronscan(solc, source);
  const tronscanBytes = tronscanBytecode.length / 2;
  const matchTronscan = mainnetHex === tronscanBytecode;
  console.log('  Compilado:', tronscanBytes, 'bytes');
  console.log('  ¿Coincide con mainnet?', matchTronscan ? 'Sí' : 'No');
  if (!matchTronscan) {
    const idx = firstDiffIndex(mainnetHex, tronscanBytecode);
    console.log('  Diferencia de longitud: mainnet', mainnetBytes, 'vs compilado', tronscanBytes, '(Tronscan no expone bytecodeHash:none → siempre falla para este contrato).');
    if (idx >= 0 && idx < Math.min(mainnetHex.length, tronscanBytecode.length)) {
      console.log('  Primer byte distinto: posición', idx / 2);
    }
  }
  console.log('');

  console.log('=== Conclusión ===');
  if (matchOurs) {
    console.log('Nuestro source + config compila al mismo bytecode que mainnet. La verificación debería pasar en un explorador que acepte Standard JSON con metadata.bytecodeHash:none (ej. OKLink).');
  } else {
    console.log('Revisar que config/trc20-networks.js y el source usados coincidan con el despliegue.');
  }
  if (!matchTronscan && tronscanBytes !== mainnetBytes) {
    console.log('Tronscan compila a', tronscanBytes, 'bytes porque no permite bytecodeHash:none; mainnet tiene', mainnetBytes, '→ verificación en Tronscan falla siempre para este contrato.');
  }
  console.log('');
}

main().catch(e => {
  console.error(e.message || e);
  process.exit(1);
});
