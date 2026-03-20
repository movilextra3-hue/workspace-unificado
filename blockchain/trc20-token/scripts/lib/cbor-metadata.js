'use strict';
/**
 * Decodificador CBOR para metadata Solidity (RFC 8949).
 * Referencia: https://docs.soliditylang.org/en/latest/metadata.html
 * Los dos últimos bytes del bytecode = longitud CBOR (big-endian).
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
    return cborBuf.subarray(i, (i += n));
  }

  function readUint(additional) {
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

    if (major === 0) return readUint(additional);
    if (major === 1) return -1 - readUint(additional);
    if (major === 2) {
      const n = readUint(additional);
      if (n === null) return null;
      return readBytes(n);
    }
    if (major === 3) {
      const n = readUint(additional);
      if (n === null) return null;
      return readBytes(n).toString('utf8');
    }
    if (major === 4) {
      const n = readUint(additional);
      const arr = [];
      for (let j = 0; j < n; j++) arr.push(decodeOne());
      return arr;
    }
    if (major === 5) {
      const n = readUint(additional);
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
    // Solidity release: 3 bytes = [major, minor, patch] => "0.minor.patch"
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

function extractMetadataFromBytecode(hex) {
  if (hex.length < 4) return null;
  const buf = Buffer.from(hex, 'hex');
  const len = buf.readUInt16BE(buf.length - 2);
  if (len <= 0 || len >= buf.length - 2) return null;
  const cbor = buf.subarray(buf.length - 2 - len, buf.length - 2);
  const bytecodeWithoutMetadata = buf.subarray(0, buf.length - 2 - len);
  const decoded = decodeCborMetadata(cbor);
  const formatted = formatDecodedMetadata(decoded);
  return { cbor, len, formatted, bytecodeWithoutMetadata };
}

module.exports = { decodeCborMetadata, formatDecodedMetadata, extractMetadataFromBytecode };
