#!/usr/bin/env node
/**
 * Pre-verificación exhaustiva antes de enviar a TronScan.
 * Comprueba que todos los aspectos coincidan para evitar errores.
 * Uso: node scripts/verify-before-tronscan-TNduz3.mjs
 */
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ADDRESS = 'TNduz3PrYRDDN9HmEWXFn3nEsXKCaJt9er';
const VERIFICATION_DIR = path.join(__dirname, '..', 'verification');
const FLATTENED = path.join(VERIFICATION_DIR, 'TRC20TokenUpgradeable.sol');

function fetchBytecode(addr) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ value: addr, visible: true });
    const opts = {
      hostname: 'api.trongrid.io',
      path: '/wallet/getcontractinfo',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body, 'utf8') }
    };
    const req = https.request(opts, (res) => {
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

function loadSolc(version) {
  return new Promise((resolve, reject) => {
    const solc = require('solc');
    solc.loadRemoteVersion(version, (err, s) => (err ? reject(err) : resolve(s)));
  });
}

function compileWith(solcSnapshot, source, evmVersion, runs = 200) {
  const input = {
    language: 'Solidity',
    sources: { 'flat.sol': { content: source } },
    settings: {
      optimizer: { enabled: true, runs },
      outputSelection: { '*': { '*': ['evm.deployedBytecode'] } }
    }
  };
  if (evmVersion) input.settings.evmVersion = evmVersion;
  const out = JSON.parse(solcSnapshot.compile(JSON.stringify(input)));
  const err = out.errors?.find(e => e.severity === 'error');
  if (err) throw new Error(err.formattedMessage);
  const bc = out.contracts['flat.sol']?.TRC20TokenUpgradeable?.evm?.deployedBytecode?.object;
  if (!bc) throw new Error('No deployedBytecode');
  return bc.replace(/^0x/, '');
}

/** Quita metadata CBOR del bytecode (spec Solidity: últimos 2 bytes = longitud). */
function stripMetadata(hex) {
  if (!hex || hex.length < 4) return hex;
  const lenBytes = Number.parseInt(hex.slice(-4), 16);
  if (lenBytes > 0 && lenBytes < 200 && hex.length >= (lenBytes + 2) * 2) {
    return hex.slice(0, -(lenBytes + 2) * 2);
  }
  const idx = hex.lastIndexOf('a264');
  if (idx > 0 && hex.length - idx >= 86) return hex.slice(0, idx);
  return hex;
}

function runSourceChecks(source, checks) {
  let allOk = true;
  const hasAbstract = /abstract\s+contract\s+Initializable/.test(source);
  if (hasAbstract) {
    console.log('❌ FALLO: El archivo contiene "abstract contract Initializable"');
    console.log('   TronScan da ParserError. Debe ser "contract Initializable".');
    console.log('   Ejecutar: npm run prepare:verification');
    allOk = false;
  }
  checks.push({ name: 'Sin "abstract contract" (evita ParserError)', ok: !hasAbstract });

  const hasContractInit = /contract\s+Initializable\s*\{/.test(source);
  checks.push({ name: 'Contiene "contract Initializable"', ok: hasContractInit });
  if (!hasContractInit && !hasAbstract) console.log('⚠️  AVISO: No se encontró "contract Initializable"');

  const spdxMatches = source.match(/SPDX-License-Identifier/gi) || [];
  const spdxOk = spdxMatches.length === 1;
  checks.push({ name: 'SPDX-License-Identifier único (sin duplicados)', ok: spdxOk });
  if (!spdxOk && spdxMatches.length > 1) {
    console.log('❌ FALLO: Hay', spdxMatches.length, 'SPDX-License-Identifier. TronScan exige uno solo.');
    allOk = false;
  }
  return allOk;
}

async function getCompiledBytecode(source) {
  try {
    const solc = await loadSolc('v0.8.25+commit.b61c2a91');
    return compileWith(solc, source, 'shanghai', 200);
  } catch (e) {
    console.warn('Compilación para comparación falló:', e.message);
    return '';
  }
}

function printSuccess(fullMatch) {
  console.log('=== LISTO PARA TRONSCAN ===');
  console.log('Todo comprobado. Puedes enviar a TronScan con estos parámetros:');
  console.log('  Address:', ADDRESS);
  console.log('  Contract: TRC20TokenUpgradeable');
  console.log('  Compiler: 0.8.25 | Optimization: Yes | Runs: 200 | EVM: Shanghai');
  console.log('  License: None (doc oficial TronScan)');
  console.log('  Archivo:', FLATTENED);
  if (!fullMatch) {
    console.log('');
    console.log('Nota: Metadata no coincide (habitual al cambiar "abstract"→"contract").');
    console.log('TronScan normalmente compara solo el código ejecutable (Sourcify "Match").');
  }
  console.log('\nDoc: https://developers.tron.network/docs/contract-verification');
}

async function main() {
  const checks = [];
  let allOk = true;

  console.log('=== PRE-VERIFICACIÓN TNduz3 (antes de TronScan) ===\n');

  if (!fs.existsSync(FLATTENED)) {
    console.log('❌ FALLO: No existe', FLATTENED);
    console.log('   Ejecutar: npm run prepare:verification');
    process.exit(1);
  }
  checks.push({ name: 'Archivo existe', ok: true });

  const source = fs.readFileSync(FLATTENED, 'utf8');
  allOk = runSourceChecks(source, checks) && allOk;

  let compilesOk = false;
  try {
    const solc = await loadSolc('v0.8.25+commit.b61c2a91');
    compileWith(solc, source, 'shanghai', 200);
    compilesOk = true;
  } catch (e) {
    console.log('❌ FALLO: No compila:', e.message);
    allOk = false;
  }
  checks.push({ name: 'Compila con 0.8.25+Shanghai+runs=200', ok: compilesOk });

  if (!compilesOk) {
    console.log('\n--- Resumen: FALLOS detectados. No enviar a TronScan. ---');
    process.exit(1);
  }

  let chainBytecode;
  try {
    chainBytecode = await fetchBytecode(ADDRESS);
  } catch (e) {
    console.log('❌ FALLO: No se pudo obtener bytecode:', e.message);
    process.exit(1);
  }
  checks.push({ name: 'Bytecode obtenido de TronGrid', ok: chainBytecode.length > 0 });

  const chainClean = stripMetadata(chainBytecode);
  const compiledBytecode = await getCompiledBytecode(source);
  const compiledClean = stripMetadata(compiledBytecode);
  const codeMatch = compiledClean === chainClean;
  checks.push({ name: 'Bytecode ejecutable COINCIDE (sin metadata)', ok: codeMatch });

  if (!codeMatch) {
    console.log('❌ FALLO: El bytecode ejecutable NO coincide.');
    console.log('   chainClean length:', chainClean.length, 'compiledClean length:', compiledClean.length);
    allOk = false;
  }

  const fullMatch = chainBytecode === compiledBytecode;
  checks.push({ name: 'Bytecode completo COINCIDE (con metadata)', ok: fullMatch });
  if (!fullMatch && codeMatch) {
    console.log('⚠️  AVISO: Metadata (IPFS hash) no coincide.');
    console.log('   La mayoría de verificadores (incl. TronScan) ignoran metadata.');
  }

  checks.push({ name: 'Constructor args: ninguno (Implementation)', ok: true });

  console.log('\n--- CHECKLIST ---');
  checks.forEach(c => console.log(c.ok ? '✅' : '❌', c.name));
  console.log('');

  if (allOk && codeMatch) {
    printSuccess(fullMatch);
    process.exit(0);
  }
  console.log('=== NO ENVIAR A TRONSCAN ===');
  console.log('Hay fallos. Corregir antes de intentar verificación.');
  process.exit(1);
}

try {
  await main();
} catch (e) {
  console.error(e);
  process.exit(1);
}
