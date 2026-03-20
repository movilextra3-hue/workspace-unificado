#!/usr/bin/env node
'use strict';
/**
 * Decodifica correctamente la metadata CBOR del bytecode de TXaXTSUK.
 * Obtiene todos los campos: solc, ipfs, bzzr1, experimental.
 * Usa decodificador CBOR según RFC 8949.
 *
 * Uso: node scripts/decode-bytecode-metadata.js
 */
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');

const ADDR = 'TXaXTSUKgdAdX76MhQoqQ98msE8azBwiFS';
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'verification', 'TXaXTSUK-verification');

function post(host, p, body) {
  return new Promise((resolve, reject) => {
    const b = JSON.stringify(body);
    const req = https.request({
      hostname: host,
      path: p,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(b) }
    }, (res) => {
      let buf = '';
      res.on('data', c => { buf += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(buf)); } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(b);
    req.end();
  });
}

async function fetchBytecode(addr) {
  const j = await post('api.trongrid.io', '/wallet/getcontractinfo', { value: addr, visible: true });
  const hex = (j.runtimecode || '').replace(/^0x/, '');
  if (!hex) throw new Error('No runtimecode en getcontractinfo');
  return hex;
}

function extractMetadata(hex) {
  if (hex.length < 4) return null;
  const buf = Buffer.from(hex, 'hex');
  const len = buf.readUInt16BE(buf.length - 2);
  if (len <= 0 || len >= buf.length - 2) return null;
  const cbor = buf.subarray(buf.length - 2 - len, buf.length - 2);
  return { cbor, len, cborHex: cbor.toString('hex'), bytecodeWithoutMetadata: buf.subarray(0, buf.length - 2 - len) };
}

/**
 * Decodificador CBOR mínimo para metadata Solidity.
 * Especificación: RFC 8949.
 */
function decodeCborMetadata(cborBuf) {
  let i = 0;
  const result = {};

  function readByte() {
    if (i >= cborBuf.length) return null;
    return cborBuf[i++];
  }

  function readBytes(n) {
    if (i + n > cborBuf.length) return null;
    const b = cborBuf.subarray(i, i + n);
    i += n;
    return b;
  }

  function readUint(additional, _bytesLen) {
    if (additional < 24) return additional;
    if (additional === 24) return readByte();
    if (additional === 25) return readBytes(2).readUInt16BE(0);
    if (additional === 26) return readBytes(4).readUInt32BE(0);
    if (additional === 27) return Number(readBytes(8).readBigUInt64BE(0));
    return null;
  }

  function decodeOne() {
    const b = readByte();
    if (b === null) return null;
    const major = b >> 5;
    const additional = b & 0x1f;

    if (major === 0) return readUint(additional, 0);
    if (major === 1) return -1 - readUint(additional, 0);
    if (major === 2) {
      const n = readUint(additional, 0);
      if (n === null) return null;
      return readBytes(n);
    }
    if (major === 3) {
      const n = readUint(additional, 0);
      if (n === null) return null;
      return readBytes(n).toString('utf8');
    }
    if (major === 4) {
      const n = readUint(additional, 0);
      const arr = [];
      for (let j = 0; j < n; j++) arr.push(decodeOne());
      return arr;
    }
    if (major === 5) {
      const n = readUint(additional, 0);
      const obj = {};
      for (let j = 0; j < n; j++) {
        const k = decodeOne();
        const v = decodeOne();
        if (k !== null) obj[k] = v;
      }
      return obj;
    }
    if (major === 7) {
      if (additional === 20) return false;
      if (additional === 21) return true;
      if (additional === 22) return null;
    }
    return null;
  }

  const decoded = decodeOne();
  if (decoded && typeof decoded === 'object' && !Buffer.isBuffer(decoded) && !Array.isArray(decoded)) {
    return decoded;
  }
  return result;
}

function formatDecodedMetadata(raw) {
  const out = {};
  if (raw.solc !== undefined) {
    const b = Buffer.isBuffer(raw.solc) ? raw.solc : (Array.isArray(raw.solc) ? Buffer.from(raw.solc) : null);
    // Solidity: 3 bytes = [major, minor, patch] => "0.minor.patch"
    if (b && b.length >= 3) out.solc = `0.${b[1]}.${b[2]}`;
  }
  if (raw.ipfs !== undefined) {
    const b = Buffer.isBuffer(raw.ipfs) ? raw.ipfs : (Array.isArray(raw.ipfs) ? Buffer.from(raw.ipfs) : null);
    if (b) out.ipfs = '0x' + b.toString('hex');
  }
  if (raw.bzzr1 !== undefined) {
    const b = Buffer.isBuffer(raw.bzzr1) ? raw.bzzr1 : (Array.isArray(raw.bzzr1) ? Buffer.from(raw.bzzr1) : null);
    if (b) out.bzzr1 = '0x' + b.toString('hex');
  }
  if (raw.bzzr0 !== undefined) {
    const b = Buffer.isBuffer(raw.bzzr0) ? raw.bzzr0 : (Array.isArray(raw.bzzr0) ? Buffer.from(raw.bzzr0) : null);
    if (b) out.bzzr0 = '0x' + b.toString('hex');
  }
  if (raw.experimental !== undefined) out.experimental = !!raw.experimental;
  return out;
}

async function main() {
  console.log('=== Decodificación metadata CBOR TXaXTSUK ===\n');

  let bytecodeHex;
  const savedPath = path.join(OUT_DIR, 'bytecode.hex');
  if (fs.existsSync(savedPath)) {
    bytecodeHex = fs.readFileSync(savedPath, 'utf8').trim();
    console.log('Bytecode desde', savedPath);
  } else {
    console.log('Obteniendo bytecode desde TronGrid...');
    bytecodeHex = await fetchBytecode(ADDR);
  }

  const meta = extractMetadata(bytecodeHex);
  if (!meta) {
    console.error('No se pudo extraer metadata del bytecode');
    process.exit(1);
  }

  console.log('Bytecode total:', bytecodeHex.length / 2, 'bytes');
  console.log('Bytecode ejecutable (sin metadata):', meta.bytecodeWithoutMetadata.length, 'bytes');
  console.log('Longitud metadata CBOR:', meta.len, 'bytes');
  console.log('CBOR hex:', meta.cborHex);
  console.log('');

  const decoded = decodeCborMetadata(meta.cbor);
  const formatted = formatDecodedMetadata(decoded);

  console.log('--- DATOS DECODIFICADOS (correctos) ---');
  console.log(JSON.stringify(formatted, null, 2));
  console.log('');

  const solc = formatted.solc || null;
  const hasIpfs = !!formatted.ipfs;
  const hasBzzr1 = !!formatted.bzzr1;
  const bytecodeHash = !hasIpfs && !hasBzzr1 ? 'none' : (hasIpfs ? 'ipfs' : 'bzzr1');

  console.log('--- RESUMEN PARA VERIFICACIÓN ---');
  console.log('Compilador solc:', solc || '(no detectado)');
  console.log('bytecodeHash:', bytecodeHash);
  if (formatted.ipfs) console.log('IPFS multihash:', formatted.ipfs);
  if (formatted.bzzr1) console.log('Swarm bzzr1:', formatted.bzzr1);
  if (formatted.experimental) console.log('Experimental: true');
  console.log('');

  const output = {
    contract: ADDR,
    decodedMetadata: formatted,
    bytecodeSize: bytecodeHex.length / 2,
    bytecodeExecutableSize: meta.bytecodeWithoutMetadata.length,
    cborLength: meta.len,
    cborHex: meta.cborHex,
    solcVersion: solc,
    bytecodeHash
  };

  const outPath = path.join(OUT_DIR, 'metadata-decoded.json');
  if (!fs.existsSync(path.dirname(outPath))) fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8');
  console.log('Guardado:', outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
