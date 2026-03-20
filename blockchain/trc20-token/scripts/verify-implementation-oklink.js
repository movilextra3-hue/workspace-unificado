/**
 * Verificación automática del Implementation (TYqRvxio...) en OKLink vía API.
 * Ref: https://www.oklink.com/docs/en/#developer-tools
 *
 * OKLink API verify-source-code (POST /api/v5/explorer/contract/verify-source-code) soporta
 * solo cadenas EVM. Cadenas plugin: ETH, XLAYER, BSC, POLYGON, AVAXC, FTM, OP, ARBITRUM, etc.
 * TRON (TRX) NO está en la lista: https://www.oklink.com/docs/en/#quickstart-guide-supported-chains
 *
 * Para TRX: salida temprana sin llamar API; genera informe con pasos manuales.
 *
 * Requiere: OKLINK_API_KEY en .env (opcional, no usada para TRX).
 * Uso: node scripts/verify-implementation-oklink.js
 *      npm run verify:oklink
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');

const ROOT = path.join(__dirname, '..');
const VERIFICATION_DIR = path.join(ROOT, 'verification');
const OKLINK_SOURCE_FILE = path.join(VERIFICATION_DIR, 'TRC20TokenUpgradeable-oklink.sol');
const DEPLOY_INFO = path.join(ROOT, 'deploy-info.json');
const ADDRESSES = path.join(ROOT, 'abi', 'addresses.json');

function getImplementationAddress() {
  if (fs.existsSync(DEPLOY_INFO)) {
    const info = JSON.parse(fs.readFileSync(DEPLOY_INFO, 'utf8'));
    if (info.implementationAddress) return info.implementationAddress;
  }
  if (fs.existsSync(ADDRESSES)) {
    const addr = JSON.parse(fs.readFileSync(ADDRESSES, 'utf8'));
    if (addr.implementationAddress) return addr.implementationAddress;
  }
  return 'TPK7VWSGSH1nK4jetcNCz1BQqMU7gmnaLe';
}

const CONTRACT_ADDRESS = getImplementationAddress();
const CONTRACT_NAME = 'TRC20TokenUpgradeable';
const CHAIN = 'TRX';
const COMPILER_VERSION = process.env.VERIFY_COMPILER_VERSION || 'v0.8.25+commit.b61c2a91'; // proyecto: 0.8.25; para Implementation existente 0.8.34 usar VERIFY_COMPILER_VERSION=v0.8.34+commit.80d5c536
const OPTIMIZATION = '1';
const OPTIMIZATION_RUNS = '200';

const OKLINK_BASE = 'www.oklink.com';
const VERIFY_PATH = '/api/v5/explorer/contract/verify-source-code';
const CHECK_PATH = '/api/v5/explorer/contract/check-verify-result';

const TRONSCAN_API = 'apilist.tronscanapi.com';

const POLL_INTERVAL_MS = 10000;
const POLL_TIMEOUT_MS = 90000;

function log(msg) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${msg}`);
}

function ensureVerificationPackage() {
  if (!fs.existsSync(OKLINK_SOURCE_FILE)) {
    log('Generando paquete verification/ (prepare:verification)...');
    require('./prepare-verification.js');
    if (!fs.existsSync(OKLINK_SOURCE_FILE)) {
      throw new Error('No se generó verification/TRC20TokenUpgradeable-oklink.sol');
    }
    log('Paquete generado.');
  }
}

function getApiKey() {
  const envPath = path.join(ROOT, '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const m = /OKLINK_API_KEY\s*=\s*(\S+)/.exec(content);
    if (m) return m[1].trim();
  }
  return process.env.OKLINK_API_KEY || '';
}

function httpsPost(body, pathname) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname: OKLINK_BASE,
      path: pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data, 'utf8')
      }
    };
    const apiKey = getApiKey();
    if (apiKey) opts.headers['Ok-Access-Key'] = apiKey;

    const req = https.request(opts, (res) => {
      let buf = '';
      res.on('data', (ch) => { buf += ch; });
      res.on('end', () => {
        let json;
        try {
          json = JSON.parse(buf);
        } catch (e) {
          return reject(new Error('Respuesta no JSON: ' + buf.slice(0, 200)));
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode}: ${json.msg || buf.slice(0, 200)}`));
        }
        resolve(json);
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function submitVerification(sourceCode) {
  log('Enviando verificación a OKLink (TRX, ' + CONTRACT_ADDRESS + ')...');
  const body = {
    chainShortName: CHAIN,
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    sourceCode: sourceCode,
    codeFormat: 'solidity-single-file',
    compilerVersion: COMPILER_VERSION,
    optimization: OPTIMIZATION,
    optimizationRuns: OPTIMIZATION_RUNS,
    evmVersion: '', // leave blank for default
    licenseType: 'MIT',
    viaIr: false
  };
  const res = await httpsPost(body, VERIFY_PATH);
  if (res.code !== '0' && res.code !== 0) {
    throw new Error(res.msg || res.message || JSON.stringify(res));
  }
  const guid = Array.isArray(res.data) ? res.data[0] : res.data;
  if (!guid) throw new Error('OKLink no devolvió guid: ' + JSON.stringify(res));
  log('Enviado. GUID: ' + guid);
  return guid;
}

async function checkResult(guid) {
  const res = await httpsPost({ chainShortName: CHAIN, guid }, CHECK_PATH);
  if (res.code !== '0' && res.code !== 0) {
    throw new Error(res.msg || res.message || JSON.stringify(res));
  }
  const result = Array.isArray(res.data) ? res.data[0] : res.data;
  return typeof result === 'string' ? result : (result && result.result) || 'Pending';
}

async function pollUntilDone(guid) {
  const start = Date.now();
  while (Date.now() - start < POLL_TIMEOUT_MS) {
    const result = await checkResult(guid);
    log('Estado: ' + result);
    if (result === 'Success') return true;
    if (result === 'Fail') return false;
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  return null; // timeout
}

function httpsGet(host, pathname) {
  return new Promise((resolve, reject) => {
    https.get(`https://${host}${pathname}`, (res) => {
      let buf = '';
      res.on('data', (c) => { buf += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(buf || '{}')); } catch (e) { resolve({}); }
      });
    }).on('error', reject);
  });
}

async function checkTronscanVerified() {
  try {
    const r = await httpsGet(TRONSCAN_API, `/api/contract?contract=${CONTRACT_ADDRESS}`);
    if (r.Error) return { verified: false, msg: r.Error };
    const data = r.data && r.data[0];
    if (!data) return { verified: false, msg: 'Sin datos' };
    const status = data.verify_status;
    return {
      verified: status === 2,
      verify_status: status,
      name: data.name,
      msg: status === 2 ? 'Contrato ya verificado en Tronscan' : `verify_status=${status} (2 = verificado)`
    };
  } catch (e) {
    return { verified: false, msg: e.message };
  }
}

function writeReport(options) {
  const lines = [
    '# Reporte verificación Implementation ' + CONTRACT_ADDRESS,
    '',
    'Generado: ' + new Date().toISOString(),
    '',
    '## Estado Tronscan',
    options.tronscanVerified ? 'VERIFICADO' : 'No verificado (o no comprobado)',
    options.tronscanMsg || '',
    '',
    '## OKLink API',
    'Ref: https://www.oklink.com/docs/en/#developer-tools',
    (options.oklinkApiError ? 'Error API: ' + options.oklinkApiError + '\n\n' : '') + (options.oklinkMsg || 'No usada (cadena TRX no soportada por la API).'),
    '',
    '## Pasos manuales',
    '',
    '### Tronscan',
    '1. Ir a https://tronscan.org/#/contracts/verify',
    '2. Contract Address: ' + CONTRACT_ADDRESS,
    '3. Main Contract: ' + CONTRACT_NAME,
    '4. Compiler: 0.8.30 o 0.8.25. Optimization: Yes. Runs: 200. EVM: por defecto.',
    '5. Subir: verification/TRC20TokenUpgradeable.sol',
    '',
    '### OKLink (si ofrecen compilador 0.8.34)',
    '1. Ir a https://www.oklink.com/tron/verify-contract-preliminary',
    '2. Contract address: ' + CONTRACT_ADDRESS,
    '3. Compiler: 0.8.34. Subir: verification/TRC20TokenUpgradeable-oklink.sol',
    ''
  ];
  const reportPath = path.join(VERIFICATION_DIR, 'reporte-verificacion-implementation.txt');
  fs.writeFileSync(reportPath, lines.join('\n'), 'utf8');
  log('Informe escrito en verification/reporte-verificacion-implementation.txt');
}

async function main() {
  try {
    ensureVerificationPackage();
    const sourceCode = fs.readFileSync(OKLINK_SOURCE_FILE, 'utf8');

    let tronscan = await checkTronscanVerified();
    log('Tronscan: ' + tronscan.msg);
    if (tronscan.verified) {
      log('Implementation ya está verificado en Tronscan: https://tronscan.org/#/contract/' + CONTRACT_ADDRESS);
      writeReport({ tronscanVerified: true, tronscanMsg: tronscan.msg, oklinkMsg: 'No necesaria (ya verificado en Tronscan).' });
      process.exit(0);
    }

    // Salida temprana para TRX: OKLink API no soporta TRON (solo cadenas EVM).
    // Ref: https://www.oklink.com/docs/en/#developer-tools
    if (CHAIN === 'TRX') {
      log('OKLink API no soporta TRON (TRX). Cadenas soportadas: ETH, XLAYER, BSC, POLYGON, etc.');
      writeReport({
        tronscanVerified: false,
        tronscanMsg: tronscan.msg,
        oklinkApiError: 'TRON no soportado. Ref: https://www.oklink.com/docs/en/#developer-tools',
        oklinkMsg: 'Cadenas API: ETH, XLAYER, BSC, POLYGON, etc. TRON no incluido. Verificación solo vía web manual.'
      });
      log('Enlaces: Tronscan https://tronscan.org/#/contracts/verify | OKLink https://www.oklink.com/tron/verify-contract-preliminary');
      process.exit(0);
    }

    try {
      const guid = await submitVerification(sourceCode);
      log('Esperando resultado (poll cada ' + POLL_INTERVAL_MS / 1000 + 's, máx ' + POLL_TIMEOUT_MS / 1000 + 's)...');
      const success = await pollUntilDone(guid);
      if (success === true) {
        log('Verificación OK. Contrato: https://www.oklink.com/trx/address/' + CONTRACT_ADDRESS);
        writeReport({ tronscanVerified: false, tronscanMsg: tronscan.msg, oklinkMsg: 'Verificación enviada por API; resultado Success.' });
        process.exit(0);
      }
      if (success === false) {
        log('Verificación fallida (bytecode o parámetros).');
        writeReport({ tronscanVerified: false, tronscanMsg: tronscan.msg, oklinkMsg: 'API OKLink devolvió Fail.' });
        process.exit(1);
      }
      log('Timeout esperando resultado. GUID: ' + guid);
      writeReport({ tronscanVerified: false, tronscanMsg: tronscan.msg, oklinkMsg: 'Timeout esperando resultado. GUID: ' + guid });
      process.exit(2);
    } catch (apiErr) {
      log('API OKLink respuesta/error: ' + (apiErr.message || String(apiErr)));
      if (apiErr.message && (apiErr.message.includes('does not currently support') || apiErr.message.includes('chain'))) {
        log('OKLink API no soporta verificación para la cadena TRX. Usa los pasos manuales.');
        writeReport({
          tronscanVerified: false,
          tronscanMsg: tronscan.msg,
          oklinkApiError: apiErr.message,
          oklinkMsg: 'API OKLink responde: "This chain does not currently support." Verificación solo posible vía web manual.'
        });
        log('Enlaces: Tronscan https://tronscan.org/#/contracts/verify | OKLink https://www.oklink.com/tron/verify-contract-preliminary');
        process.exit(0);
      }
      throw apiErr;
    }
  } catch (err) {
    log('Error: ' + err.message);
    if (err.message.includes('compiler') || err.message.includes('Compiler')) {
      log('Sugerencia: OKLink puede no soportar ' + COMPILER_VERSION + '. Revisa versiones en https://www.oklink.com/trx/verify-contract-preliminary');
    }
    process.exit(1);
  }
}

main();
