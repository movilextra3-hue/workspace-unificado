#!/usr/bin/env node
/**
 * Verificación y comprobación de coincidencia de bytecode para TXaXTSUK (Implementation Colateral USD).
 * Usa el paquete verification/TXaXTSUK-verification/.
 *
 * Uso: node scripts/verify-contract-tronscan.js
 *   o: npm run verify:tronscan
 */
'use strict';
if (process.setMaxListeners) process.setMaxListeners(50);
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');

const ADDR = 'TXaXTSUKgdAdX76MhQoqQ98msE8azBwiFS';
const MAIN_CONTRACT = 'TRC20TokenUpgradeable';
const VERIFICATION_DIR = path.join(__dirname, '..', 'verification', 'TXaXTSUK-verification');
const SOURCE_FILE = path.join(VERIFICATION_DIR, 'TRC20TokenUpgradeable-flattened.sol');

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

function loadSolc(v) {
  return new Promise((resolve, reject) => {
    require('solc').loadRemoteVersion(v, (err, s) => (err ? reject(err) : resolve(s)));
  });
}

function stripMetadata(hex) {
  if (!hex || hex.length < 4) return hex;
  const len = parseInt(hex.slice(-4), 16);
  if (len > 0 && len < 200 && hex.length >= (len + 2) * 2) return hex.slice(0, -(len + 2) * 2);
  const idx = hex.lastIndexOf('a264');
  if (idx > 0 && hex.length - idx >= 86) return hex.slice(0, idx);
  return hex;
}

function compile(solc, source, mainContract, evm, runs, viaIR) {
  const input = {
    language: 'Solidity',
    sources: { 'flat.sol': { content: source } },
    settings: {
      optimizer: { enabled: runs >= 0, runs: Math.max(0, runs || 0) },
      metadata: { bytecodeHash: 'none' },
      outputSelection: { '*': { '*': ['evm.deployedBytecode'] } }
    }
  };
  if (evm) input.settings.evmVersion = evm;
  if (viaIR) input.settings.viaIR = true;
  const out = JSON.parse(solc.compile(JSON.stringify(input)));
  const err = out.errors?.find(e => e.severity === 'error');
  if (err) throw new Error(err.formattedMessage);
  const bc = out.contracts['flat.sol']?.[mainContract]?.evm?.deployedBytecode?.object;
  if (!bc) throw new Error('No deployedBytecode');
  return bc.replace(/^0x/, '');
}

const SOLC_025 = 'v0.8.25+commit.b61c2a91';
const RUNS = [200, 100, 150, 300, 400, 500, 0];
const CONFIGS = [
  ...RUNS.map(r => ({ solc: SOLC_025, evm: 'shanghai', runs: r, viaIR: false, tronScan: true })),
  ...RUNS.map(r => ({ solc: SOLC_025, evm: 'shanghai', runs: r, viaIR: true, tronScan: true })),
  { solc: SOLC_025, evm: 'paris', runs: 200, viaIR: false, tronScan: true },
  { solc: SOLC_025, evm: 'cancun', runs: 200, viaIR: false, tronScan: true },
  { solc: 'v0.8.34+commit.80d5c536', evm: undefined, runs: 200, viaIR: false, tronScan: false },
  { solc: 'v0.8.20+commit.a1b79de6', evm: 'shanghai', runs: 200, viaIR: false, tronScan: true }
];

async function main() {
  console.log('=== Verificación TXaXTSUK (Implementation Colateral USD) ===\n');

  if (!fs.existsSync(SOURCE_FILE)) {
    console.error('❌ No existe:', SOURCE_FILE);
    console.error('   Ejecuta: npm run generate:verification');
    process.exit(1);
  }

  let source = fs.readFileSync(SOURCE_FILE, 'utf8');
  // Flattened puede tener múltiples SPDX; solc exige uno solo
  source = source.replace(/^\s*\/\/\s*SPDX-License-Identifier:[^\n]*\n?/gm, '');
  if (!/SPDX-License-Identifier/i.test(source.slice(0, 300))) {
    source = '// SPDX-License-Identifier: MIT\n' + source;
  }
  console.log('Obteniendo bytecode de mainnet...');
  const chainBytecode = await fetchBytecode(ADDR);
  const chainClean = stripMetadata(chainBytecode);
  console.log('Bytecode mainnet (sin metadata):', chainClean.length / 2, 'bytes\n');

  /** Calcula coincidencia: { prefixMatch (bytes desde inicio), totalMatch (bytes iguales), pct } */
  function scoreMatch(chainHex, compiledHex) {
    let prefixMatch = 0;
    let totalMatch = 0;
    const len = Math.min(chainHex.length, compiledHex.length);
    let prefixDone = false;
    for (let i = 0; i < len; i += 2) {
      const eq = chainHex.slice(i, i + 2) === compiledHex.slice(i, i + 2);
      if (eq) totalMatch++;
      if (!prefixDone) {
        if (eq) prefixMatch++;
        else prefixDone = true;
      }
    }
    const totalBytes = Math.max(chainHex.length, compiledHex.length) / 2;
    return { prefixMatch, totalMatch, pct: totalBytes ? (100 * totalMatch / totalBytes).toFixed(2) : 0 };
  }

  let exactMatch = null;
  const results = [];

  for (const cfg of CONFIGS) {
    try {
      const solc = await loadSolc(cfg.solc);
      const compiled = compile(solc, source, MAIN_CONTRACT, cfg.evm, cfg.runs, cfg.viaIR);
      const compiledClean = stripMetadata(compiled);
      if (compiledClean === chainClean) {
        exactMatch = {
          ...cfg,
          compiler: cfg.solc.replace('v', '').split('+')[0],
          evmStr: cfg.evm || 'default'
        };
        break;
      }
      const s = scoreMatch(chainClean, compiledClean);
      results.push({
        cfg,
        compiledClean,
        ...s,
        evmStr: cfg.evm || 'default',
        compiler: cfg.solc.replace('v', '').split('+')[0]
      });
    } catch (e) {
      if (results.length === 0 && CONFIGS.indexOf(cfg) === 0) console.error('   (primer error):', e.message);
    }
  }

  if (exactMatch) {
    console.log('✅ COINCIDENCIA EXACTA DE BYTECODE');
    console.log('   Config:', exactMatch.compiler + '+' + exactMatch.evmStr + ', runs=' + exactMatch.runs);
    console.log('\n=== Parámetros para Tronscan ===');
    console.log('Address:', ADDR);
    console.log('Contract Name:', MAIN_CONTRACT);
    console.log('Compiler: 0.8.25 (Ethereum, NO TRON)');
    console.log('EVM: Shanghai (20)');
    console.log('Optimization: Yes, Runs:', exactMatch.runs);
    console.log('License: None');
    console.log('Source: verification/TXaXTSUK-verification/TRC20TokenUpgradeable-flattened.sol');
    console.log('\nURL: https://tronscan.org/#/contracts/verify');
    return;
  }

  // Sin coincidencia exacta: elegir la más cercana (por prefixMatch, luego totalMatch)
  results.sort((a, b) => {
    if (b.prefixMatch !== a.prefixMatch) return b.prefixMatch - a.prefixMatch;
    return b.totalMatch - a.totalMatch;
  });

  const best = results[0];
  if (!best) {
    console.error('❌ Ninguna config compiló correctamente.');
    process.exit(1);
  }

  console.log('⚠️ Sin coincidencia exacta. Config que más se acerca:\n');
  console.log('   Compiler:', best.compiler, '| EVM:', best.evmStr, '| runs:', best.cfg.runs, '| viaIR:', !!best.cfg.viaIR);
  console.log('   Bytes coincidentes desde inicio:', best.prefixMatch, '/', chainClean.length / 2);
  console.log('   Bytes totales coincidentes:', best.totalMatch);
  console.log('   Porcentaje:', best.pct + '%');
  console.log('   Primer byte distinto (índice):', best.prefixMatch);

  const paramsPath = path.join(VERIFICATION_DIR, 'PARAMETROS-TRONSCAN.txt');
  const evmLabel = best.cfg.evm === 'shanghai' ? 'Shanghai (20)' : best.cfg.evm === 'paris' ? 'Paris (14)' : best.cfg.evm === 'cancun' ? 'Cancun (21)' : 'default';
  const paramsText = `Parámetros MÁS CERCANOS para verificación manual (TXaXTSUK)
Config que más se acerca al bytecode de mainnet.

Address: ${ADDR}
Contract Name: ${MAIN_CONTRACT}
Compiler: ${best.compiler} (Ethereum, NO TRON)
EVM: ${evmLabel}
Optimization: ${best.cfg.runs >= 0 ? 'Yes' : 'No'}
Runs: ${best.cfg.runs}
viaIR: ${best.cfg.viaIR ? 'Yes' : 'No'}
License: None

Archivo fuente: TRC20TokenUpgradeable-flattened.sol (en esta carpeta)

Similitud: ${best.prefixMatch} bytes coincidentes desde inicio, ${best.totalMatch} total, ${best.pct}%

URL: https://tronscan.org/#/contracts/verify

Nota: Bytecode no coincide exactamente. Esta config es la que más se acerca.
      Probar manualmente en Tronscan.
`;
  fs.writeFileSync(paramsPath, paramsText);
  console.log('\n   Parámetros guardados en:', paramsPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
