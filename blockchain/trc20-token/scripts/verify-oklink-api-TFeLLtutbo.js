#!/usr/bin/env node
'use strict';
/**
 * Verificación TFeLLtutbo vía API OKLink.
 * Ref: https://www.oklink.com/docs/en/#developer-tools-contract-verification
 *
 * RESULTADO COMPROBADO: La API de verificación de OKLink NO soporta TRON.
 * - chainShortName TRX/trx → "This chain does not currently support" (50038).
 * - chainShortName TRON/tron → code 0 pero data [] (no devuelve GUID).
 * Verificación posible solo por web: https://www.oklink.com/tron/verify-contract-preliminary
 * o npm run verify:oklink:playwright (rellena formulario).
 *
 * Uso: node scripts/verify-oklink-api-TFeLLtutbo.js
 */
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');

const ROOT = path.join(__dirname, '..');
const PKG = path.join(ROOT, 'verification', 'PAQUETE-VERIFICACION-POST-UPGRADE');
const STD_JSON = path.join(PKG, 'standard-input-TFeLLtutbo.json');
const ADDR = 'TFeLLtutboNwVwSSdNqAiXoQGzXZrbTDMC';
const NAME = 'TRC20TokenUpgradeable';

// Ref: https://www.oklink.com/docs/en/#developer-tools-contract-verification
const CHAINS_TO_TRY = ['TRX', 'TRON', 'trx', 'tron'];
const OKLINK = 'www.oklink.com';
const VERIFY_PATH = '/api/v5/explorer/contract/verify-source-code';
const CHECK_PATH = '/api/v5/explorer/contract/check-verify-result';
const POLL_INTERVAL_MS = 15000;
const POLL_MAX_ATTEMPTS = 6;

function getApiKey() {
  const env = path.join(ROOT, '.env');
  if (fs.existsSync(env)) {
    const m = /OKLINK_API_KEY\s*=\s*(\S+)/.exec(fs.readFileSync(env, 'utf8'));
    if (m) return m[1].trim();
  }
  return process.env.OKLINK_API_KEY || '';
}

function post(body, pathname) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname: OKLINK,
      path: pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data, 'utf8') }
    };
    const key = getApiKey();
    if (key) opts.headers['Ok-Access-Key'] = key;

    const req = https.request(opts, (res) => {
      let buf = '';
      res.on('data', (c) => { buf += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(buf || '{}')); } catch { resolve({}); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  if (!fs.existsSync(STD_JSON)) {
    console.error('Ejecutar: npm run generate:standard-input');
    process.exit(1);
  }

  const standardInput = fs.readFileSync(STD_JSON, 'utf8');
  const apiKey = getApiKey();

  console.log('\n=== VERIFICACIÓN API OKLINK — TFeLLtutbo ===\n');
  if (!apiKey) console.log('Aviso: OKLINK_API_KEY no configurada. La API puede limitar requests.\n');

  for (const chain of CHAINS_TO_TRY) {
    console.log('Probando chainShortName:', chain);
    const body = {
      chainShortName: chain,
      contractAddress: ADDR,
      contractName: NAME,
      sourceCode: standardInput,
      codeFormat: 'solidity-standard-json-input',
      compilerVersion: 'v0.8.25+commit.b61c2a91',
      optimization: '1',
      optimizationRuns: '200',
      evmVersion: 'shanghai',
      viaIr: false,
      licenseType: 'MIT'
    };

    try {
      const res = await post(body, VERIFY_PATH);
      const code = res.code;
      const data = res.data;
      if (code === '0' || code === 0) {
        const guid = Array.isArray(data) ? data[0] : (typeof data === 'string' ? data : data?.guid);
        if (guid) {
          console.log('  Enviado. GUID:', guid);
          console.log('  Esperando resultado (30-60s según docs OKLink)...\n');
          for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
            await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
            const checkRes = await post({ chainShortName: chain, guid }, CHECK_PATH);
            const checkData = checkRes.data;
            const result = Array.isArray(checkData) ? checkData[0] : (typeof checkData === 'string' ? checkData : checkData?.result);
            if (result === 'Success') {
              console.log('  Resultado: Success');
              console.log('\nContrato verificado: https://www.oklink.com/tron/address/' + ADDR);
              process.exit(0);
            }
            if (result === 'Fail') {
              console.log('  Resultado: Fail. Revisar bytecode/parámetros.');
              process.exit(1);
            }
            console.log('  Estado:', result || 'Pending', '(' + (i + 1) + '/' + POLL_MAX_ATTEMPTS + ')');
          }
          console.log('\nTimeout. Comprobar manualmente: https://www.oklink.com/tron/address/' + ADDR);
          process.exit(0);
        }
      }
      const msg = (res.msg || res.message || '').slice(0, 300);
      if (msg) console.log('  Msg:', msg);
      if (code !== undefined) console.log('  Code:', code);
      if (data !== undefined && data !== null) console.log('  Data:', typeof data === 'object' ? JSON.stringify(data).slice(0, 200) : data);
      if (/not support|unsupported|does not currently support|chain/i.test(msg)) {
        console.log('  TRON no soportado para este chain.');
        continue;
      }
    } catch (e) {
      console.log('  Error:', e.message);
    }
  }

  console.log('\nOKLink API no soporta verificación de contratos en TRON (comprobado).');
  console.log('Verificación solo por web:');
  console.log('  1. npm run verify:oklink:open  (abre OKLink)');
  console.log('  2. O npm run verify:oklink:playwright  (rellena formulario + sube Standard JSON)');
  console.log('  URL: https://www.oklink.com/tron/verify-contract-preliminary');
  process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
