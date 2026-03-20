#!/usr/bin/env node
'use strict';
/**
 * Extrae metadata CBOR del bytecode de TXaXTSUK para obtener
 * la versión exacta del compilador Solidity.
 */
const https = require('node:https');

const ADDR = 'TXaXTSUKgdAdX76MhQoqQ98msE8azBwiFS';

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

function extractMetadata(hex) {
  if (hex.length < 4) return null;
  const buf = Buffer.from(hex, 'hex');
  const len = buf.readUInt16BE(buf.length - 2);
  if (len <= 0 || len >= buf.length - 2) return null;
  const cbor = buf.subarray(buf.length - 2 - len, buf.length - 2);
  return { cbor, len, cborHex: cbor.toString('hex') };
}

async function main() {
  console.log('=== Extracción metadata TXaXTSUK ===\n');
  const chainHex = await fetchBytecode(ADDR);
  console.log('Bytecode length:', chainHex.length / 2, 'bytes');
  const meta = extractMetadata(chainHex);
  if (!meta) {
    console.error('No se pudo extraer metadata');
    process.exit(1);
  }
  console.log('CBOR length:', meta.len);
  console.log('CBOR hex (primeros 80):', meta.cborHex.slice(0, 160));
  const solcManual = decodeSolcVersion(meta.cbor);
  if (solcManual) {
    console.log('\n>>> Compilador (CBOR): solc', solcManual);
  }
}

function decodeSolcVersion(cborBuf) {
  let i = 0;
  const b = cborBuf[i++];
  if (!b) return null;
  const major = b >> 5, minor = b & 0x1f;
  if (major !== 5 || minor !== 1) return null;
  const kb = cborBuf[i++];
  if (!kb || (kb >> 5) !== 3) return null;
  const klen = (kb & 0x1f) < 28 ? kb & 0x1f : 0;
  i += klen;
  const vb = cborBuf[i++];
  if (!vb || (vb >> 5) !== 2) return null;
  const vlen = (vb & 0x1f) < 28 ? vb & 0x1f : 0;
  if (vlen !== 3) return null;
  cborBuf[i++]; // major version byte (discard)
  const b1 = cborBuf[i++], b2 = cborBuf[i++];
  return `0.${b1}.${b2}`;
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
