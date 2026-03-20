#!/usr/bin/env node
'use strict';
/**
 * Obtiene el bytecode de contratos en BNB Chain vía RPC público.
 * Uso: node scripts/fetch-bsc-bytecode.js [direcciones...]
 */

const https = require('https');

const RPC = 'https://bsc-dataseed.binance.org/';
const ADDRESSES = [
  '0x5Ac688d8810EF34B117CcD67A64828e766633f0a',  // OBS token
  '0x0610131f882B5F8EF281F6E0EEf07978637c9b44',  // Purchase/swap
];

function fetchBytecode(address) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_getCode',
      params: [address, 'latest'],
      id: 1,
    });
    const req = https.request(RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': body.length },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) reject(new Error(json.error.message));
          else resolve(json.result);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const addrs = process.argv.slice(2).length ? process.argv.slice(2) : ADDRESSES;
  for (const addr of addrs) {
    try {
      const code = await fetchBytecode(addr);
      const name = addr === ADDRESSES[0] ? 'OBS' : addr === ADDRESSES[1] ? 'Purchase' : '';
      const fname = `bytecode-${addr.slice(2, 10).toLowerCase()}.txt`;
      require('fs').writeFileSync(fname, code, 'utf8');
      console.log(`${addr} (${name}) -> ${fname} (${(code.length - 2) / 2} bytes)`);
    } catch (e) {
      console.error(`${addr}: ${e.message}`);
    }
  }
}

main();
