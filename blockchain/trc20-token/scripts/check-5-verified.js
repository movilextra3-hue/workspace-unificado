#!/usr/bin/env node
'use strict';
/**
 * Comprueba si los 5 contratos no verificados están ya verificados.
 * - TronScan: API verify_status=2
 * - OKLink: --oklink hace fetch de la página y busca "Verified"/"Verificado"
 *
 * Los 5 contratos:
 * - TTTT4AeRUjJEmTepb9X4uK4f6Pxg8UwwkW, TQJ6f3eczr2rK9x9kN2JMTdDN1zTm46XxE (ProxyAdmin)
 * - TYqRvxioNWBqVa2nJGog8RkYQrXQdPJwR3, TPK7VWSGSH1nK4jetcNCz1BQqMU7gmnaLe, TNduz3PrYRDDN9HmEWXFn3nEsXKCaJt9er (TRC20TokenUpgradeable)
 *
 * Uso: npm run check:5:verified
 *      npm run check:5:verified -- --oklink  (comprueba también OKLink, donde se verifica con verify:5:oklink)
 */
const https = require('node:https');

const CONTRACTS = [
  { address: 'TTTT4AeRUjJEmTepb9X4uK4f6Pxg8UwwkW', name: 'ProxyAdmin' },
  { address: 'TQJ6f3eczr2rK9x9kN2JMTdDN1zTm46XxE', name: 'ProxyAdmin' },
  { address: 'TYqRvxioNWBqVa2nJGog8RkYQrXQdPJwR3', name: 'TRC20TokenUpgradeable' },
  { address: 'TPK7VWSGSH1nK4jetcNCz1BQqMU7gmnaLe', name: 'TRC20TokenUpgradeable' },
  { address: 'TNduz3PrYRDDN9HmEWXFn3nEsXKCaJt9er', name: 'TRC20TokenUpgradeable' }
];

function getJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let d = '';
      res.on('data', (c) => { d += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch { resolve({}); }
      });
    }).on('error', reject);
  });
}

function getHtml(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = { hostname: u.hostname, path: u.pathname + u.search, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; check-5-verified/1.0)' } };
    https.get(url, opts, (res) => {
      let d = '';
      res.on('data', (c) => { d += c; });
      res.on('end', () => resolve(d));
    }).on('error', reject);
  });
}

async function checkTronScan(addr) {
  const r = await getJson('https://apilist.tronscanapi.com/api/contract?contract=' + encodeURIComponent(addr));
  const c = r.data?.[0];
  const status = c ? (c.verify_status ?? 0) : 0;
  return { verified: status === 2, status };
}

async function checkOKLink(addr) {
  try {
    const html = await getHtml('https://www.oklink.com/tron/address/' + addr);
    const lower = (html || '').toLowerCase();
    // Excluir "not verified", "unverified", "no verificado" para evitar falsos positivos
    const hasVerified = /\bverified\b/.test(lower) || /\bverificado\b/.test(lower);
    const hasNotVerified = /\bnot\s+verified\b|\bunverified\b|\bno\s+verificado\b/.test(lower);
    return { verified: hasVerified && !hasNotVerified };
  } catch (err) {
    return { verified: false, error: err?.message ?? String(err) };
  }
}

async function main() {
  const checkOklink = process.argv.includes('--oklink');

  console.log('\n=== Comprobación de verificación ===\n');
  console.log('Fuente: TronScan API' + (checkOklink ? ' + OKLink (fetch)' : ''));
  console.log('');

  let tronscanOk = 0;
  let oklinkOk = 0;

  for (const c of CONTRACTS) {
    const ts = await checkTronScan(c.address);
    const tsLabel = ts.verified ? 'VERIFICADO' : 'No verificado';
    process.stdout.write(c.name + ' ' + c.address + ': TronScan ' + tsLabel + (ts.verified ? '' : ' (status=' + ts.status + ')'));

    if (ts.verified) tronscanOk++;

    if (checkOklink) {
      const ok = await checkOKLink(c.address);
      const okLabel = ok.verified ? 'VERIFICADO' : 'No';
      process.stdout.write(' | OKLink ' + okLabel);
      if (ok.verified) oklinkOk++;
      if (ok.error) process.stdout.write(' (error: ' + ok.error + ')');
    }
    console.log('');

    if (ts.verified || (checkOklink && oklinkOk > 0)) {
      if (ts.verified) console.log('  TronScan: https://tronscan.org/#/contract/' + c.address);
      if (checkOklink) console.log('  OKLink:   https://www.oklink.com/tron/address/' + c.address);
    }
  }

  console.log('\n--- TronScan: ' + tronscanOk + '/5 verificados ---');
  if (checkOklink) console.log('--- OKLink:  ' + oklinkOk + '/5 verificados ---');
  console.log('\nPara verificar en OKLink: npm run verify:5:oklink');
  console.log('Para comprobar también OKLink: npm run check:5:verified -- --oklink');

  const allOk = checkOklink ? (tronscanOk === 5 || oklinkOk === 5) : tronscanOk === 5;
  process.exit(allOk ? 0 : 1);
}

main().catch((err) => { console.error(err?.message ?? err); process.exit(2); });
