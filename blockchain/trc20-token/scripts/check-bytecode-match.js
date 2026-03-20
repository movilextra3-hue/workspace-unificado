/**
 * Comprueba qué parámetros de compilación coinciden con el bytecode
 * desplegado en mainnet para la Implementation TYqRvxioNWBqVa2nJGog8RkYQrXQdPJwR3.
 * NO despliega nada. Solo compara.
 * Uso: node scripts/check-bytecode-match.js
 */
'use strict';
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');

const IMPL_ADDRESS = 'TYqRvxioNWBqVa2nJGog8RkYQrXQdPJwR3';
const ROOT = path.join(__dirname, '..');
const FLATTENED_025 = path.join(ROOT, 'verification', 'TRC20TokenUpgradeable.sol');
const FLATTENED_034 = path.join(ROOT, 'verification', 'TRC20TokenUpgradeable-oklink.sol');

function fetchBytecode() {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ value: IMPL_ADDRESS, visible: true });
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
        const runtime = (j.runtimecode || '').replace(/^0x/, '');
        resolve(runtime);
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
    if (typeof solc.loadRemoteVersion !== 'function') {
      return reject(new Error('solc.loadRemoteVersion no disponible'));
    }
    solc.loadRemoteVersion(version, (err, snapshot) => {
      if (err) return reject(err);
      resolve(snapshot);
    });
  });
}

function compileWith(solcSnapshot, source, evmVersion) {
  const settings = {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { '*': { '*': ['evm.deployedBytecode'] } }
  };
  if (evmVersion) settings.evmVersion = evmVersion;
  const input = {
    language: 'Solidity',
    sources: { 'flat.sol': { content: source } },
    settings
  };
  const out = JSON.parse(solcSnapshot.compile(JSON.stringify(input)));
  const err = out.errors?.find(e => e.severity === 'error');
  if (err) throw new Error(err.formattedMessage);
  const bytecode = out.contracts['flat.sol']?.TRC20TokenUpgradeable?.evm?.deployedBytecode?.object;
  if (!bytecode) throw new Error('No deployedBytecode generado');
  return bytecode.replace(/^0x/, '');
}

// Metadata CBOR al final: a264697066735843... (ipfs) + solc version
// Strip últimos bytes típicos de metadata si existen
function stripMetadata(hex) {
  if (hex.length < 90) return hex;
  // Buscar patrón a264 (CBOR map + "ipfs" key) - metadata suele empezar ahí
  const idx = hex.lastIndexOf('a264');
  if (idx > 0 && hex.length - idx >= 86) {
    return hex.slice(0, idx);
  }
  // Fallback: quitar últimos 86 hex (43 bytes) si parece metadata
  const last = hex.slice(-90);
  if (last.slice(0, 4) === 'a264') return hex.slice(0, -90);
  return hex;
}

async function main() {
  console.log('[check-bytecode-match] Obteniendo bytecode en cadena...');
  const chainBytecode = await fetchBytecode();
  console.log('[check-bytecode-match] Bytecode en cadena:', chainBytecode.length, 'chars hex');

  if (!fs.existsSync(FLATTENED_025)) {
    console.log('[check-bytecode-match] Generando verification...');
    require('./prepare-verification');
  }

  const source025 = fs.readFileSync(FLATTENED_025, 'utf8');
  const source034 = fs.existsSync(FLATTENED_034)
    ? fs.readFileSync(FLATTENED_034, 'utf8')
    : source025;

  const chainClean = stripMetadata(chainBytecode);
  const chainLen = chainClean.length;

  console.log('\n[check-bytecode-match] Compilando con 0.8.25 + Shanghai...');
  let solc025;
  try {
    solc025 = await loadSolc('v0.8.25+commit.b61c2a91');
  } catch (e) {
    console.log('[check-bytecode-match] Error cargando 0.8.25:', e.message);
    solc025 = null;
  }

  let solc034;
  try {
    solc034 = await loadSolc('v0.8.34+commit.80d5c536');
  } catch (e) {
    console.log('[check-bytecode-match] Error cargando 0.8.34:', e.message);
    solc034 = null;
  }

  const results = [];

  if (solc025) {
    try {
      const bc025 = compileWith(solc025, source025, 'shanghai');
      const bc025Clean = stripMetadata(bc025);
      const prefixMatch = chainBytecode.slice(0, 200) === bc025.slice(0, 200);
      results.push({
        config: '0.8.25 + Shanghai',
        len: bc025Clean.length,
        exact: bc025Clean === chainClean,
        prefixMatch,
        chainLen
      });
      console.log('  0.8.25+Shanghai: compiled len', bc025Clean.length, 'exact match', bc025Clean === chainClean);
    } catch (e) {
      console.log('  0.8.25+Shanghai: ERROR', e.message);
    }
  }

  if (solc034) {
    try {
      const bc034 = compileWith(solc034, source034, 'shanghai');
      const bc034Default = compileWith(solc034, source034, undefined);
      const bc034Clean = stripMetadata(bc034);
      const bc034DefClean = stripMetadata(bc034Default);
      const bc034DefRaw = compileWith(solc034, source034, undefined);
      const codeOnlyMatch = chainBytecode.length === bc034DefRaw.length && chainBytecode === bc034DefRaw;
      const codeOnlyMatchClean = chainClean === bc034DefClean;
      results.push({
        config: '0.8.34 + Shanghai',
        len: bc034Clean.length,
        exact: bc034Clean === chainClean,
        chainLen
      });
      results.push({
        config: '0.8.34 + default',
        len: bc034DefClean.length,
        exact: bc034DefClean === chainClean,
        chainLen,
        codeOnlyMatch,
        codeOnlyMatchClean
      });
      console.log('  0.8.34+Shanghai: compiled len', bc034Clean.length, 'exact match', bc034Clean === chainClean);
      console.log('  0.8.34+default:  compiled len', bc034DefClean.length, 'exact match', bc034DefClean === chainClean);
      if (chainBytecode.length === bc034DefRaw.length) {
        console.log('  0.8.34+default:  RAW same length, bytes equal:', codeOnlyMatch);
        if (!codeOnlyMatch) {
          let firstDiff = 0;
          for (let i = 0; i < chainBytecode.length; i++) {
            if (chainBytecode[i] !== bc034DefRaw[i]) { firstDiff = i; break; }
          }
          console.log('    First diff at hex char index:', firstDiff);
        }
      }
    } catch (e) {
      console.log('  0.8.34: ERROR', e.message);
    }
  }

  console.log('\n[check-bytecode-match] RESULTADO:');
  const exact = results.find(r => r.exact);
  if (exact) {
    console.log('  COINCIDE:', exact.config);
    console.log('  Usar estos parámetros para verificación.');
  } else {
    console.log('  Ninguna configuración coincide exactamente.');
    console.log('  Puede ser metadata, flattened vs multi-file, o compilador distinto.');
    console.log('  Longitudes comparadas - chainClean:', chainLen);
    results.forEach(r => console.log('   ', r.config, 'compiled:', r.len, 'exact:', r.exact));
  }

  return exact ? 0 : 1;
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).then(code => process.exit(code || 0));
