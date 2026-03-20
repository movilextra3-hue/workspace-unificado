#!/usr/bin/env node
'use strict';
/**
 * Genera paquete de verificación para TXaXTSUK (Implementation) a partir de:
 * - Bytecode de mainnet (TronGrid)
 * - ABI de token-info.json
 * - Metadata CBOR extraída del bytecode (RFC 8949, docs.soliditylang.org/metadata)
 * - Decompilación Panoramix (https://github.com/palkeo/panoramix)
 *
 * Referencias oficiales:
 * - https://docs.soliditylang.org/en/latest/metadata.html
 * - https://playground.sourcify.dev/ (metadata CBOR)
 * - https://www.soliditylang.org/
 *
 * Uso: node scripts/generate-verification-source.js
 */
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
const { decodeCborMetadata, formatDecodedMetadata } = require('./lib/cbor-metadata.js');

const ADDR = 'TXaXTSUKgdAdX76MhQoqQ98msE8azBwiFS';
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'verification', 'TXaXTSUK-verification');

function post(host, path, body) {
  return new Promise((resolve, reject) => {
    const b = JSON.stringify(body);
    const req = https.request({
      hostname: host,
      path,
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
  const bytecodeWithoutMetadata = buf.subarray(0, buf.length - 2 - len);
  return { cbor, len, cborHex: cbor.toString('hex'), bytecodeWithoutMetadata };
}

function solidityType(abiParam) {
  if (abiParam.type === 'tuple') {
    const inner = (abiParam.components || []).map((c) => solidityType(c)).join(', ');
    return `(${inner})`;
  }
  if (abiParam.type === 'tuple[]') {
    const inner = (abiParam.components || []).map((c) => solidityType(c)).join(', ');
    return `(${inner})[]`;
  }
  return abiParam.type;
}

function abiToSolidityInterface(abi) {
  const lines = [
    '// SPDX-License-Identifier: MIT',
    '// Generado desde ABI de mainnet. Interface/documentación del contrato.',
    'pragma solidity ^0.8.20;',
    '',
    '/**',
    ' * @title TRC20TokenUpgradeable (interface desde ABI)',
    ' * @notice Métodos y eventos expuestos en mainnet para TXaXTSUKgdAdX76MhQoqQ98msE8azBwiFS',
    ' */',
    'interface ITRC20TokenUpgradeableFromABI {'
  ];

  const errors = abi.filter((x) => x.type === 'error');
  const funcs = abi.filter((x) => x.type === 'function');
  const events = abi.filter((x) => x.type === 'event');

  if (errors.length > 0) {
    lines.push('    // --- Errors ---');
    for (const e of errors) {
      const args = (e.inputs || []).map((i) => solidityType(i) + ' ' + (i.name || '')).join(', ');
      lines.push(`    error ${e.name}(${args});`);
    }
    lines.push('');
  }

  if (funcs.length > 0) {
    lines.push('    // --- Functions ---');
    for (const f of funcs) {
      const args = (f.inputs || []).map((i) => solidityType(i) + ' ' + (i.name || '')).join(', ');
      const ret = (f.outputs || []).map((o) => solidityType(o)).join(', ');
      const mod = f.stateMutability === 'view' || f.stateMutability === 'pure' ? ` ${f.stateMutability}` : '';
      const retStr = ret ? ` returns (${ret})` : '';
      lines.push(`    function ${f.name}(${args}) external${mod}${retStr};`);
    }
    lines.push('');
  }

  if (events.length > 0) {
    lines.push('    // --- Events ---');
    for (const e of events) {
      const args = (e.inputs || []).map((i) => {
        const idx = i.indexed ? ' indexed' : '';
        return `${solidityType(i)}${idx} ${i.name || ''}`.trim();
      }).join(', ');
      lines.push(`    event ${e.name}(${args});`);
    }
  }

  lines.push('}');
  return lines.join('\n');
}

/** Elimina SPDX y pragma del inicio de un fragmento .sol para evitar duplicados en flattened. */
function stripSpdxAndPragma(s) {
  return String(s)
    .replace(/^\s*\/\/\s*SPDX-License-Identifier:[^\n]*\r?\n?/m, '')
    .replace(/^\s*pragma\s+solidity[^;]+;\s*\r?\n?/m, '')
    .replace(/^\s*\r?\n+/, '');
}

function runPanoramix(bytecodeHex) {
  const fullHex = '0x' + bytecodeHex;
  const useStdin = fullHex.length > 8000;
  const opts = { encoding: 'utf8', timeout: 120000, maxBuffer: 10 * 1024 * 1024 };
  const run = (cmd, input) => {
    try {
      return execSync(cmd, input ? { ...opts, input } : opts);
    } catch {
      return null;
    }
  };
  if (useStdin) {
    const out = run('python -m panoramix -', fullHex) || run('panoramix -', fullHex);
    return out;
  }
  return run(`python -m panoramix "${fullHex}"`) || run(`panoramix "${fullHex}"`);
}

/**
 * Genera un archivo .sol derivado del bytecode de mainnet.
 * Contiene: cabecera, pseudocódigo descompilado (Panoramix) y la interface desde ABI.
 * LIMITACIÓN: La descompilación NO produce código que recompile byte a byte al original.
 * Este archivo sirve para COMPROBAR/AUDITAR la lógica, no para verificación en Tronscan.
 */
function buildSolFromBytecode(addr, bytecodeHex, solcVersion, decompiled, interfaceSol) {
  const decompiledEscaped = (decompiled || '').replace(/\*\//g, '* /').replace(/\/\*/g, '/ *');
  return `// SPDX-License-Identifier: MIT
// =============================================================================
// TRC20TokenUpgradeable-FROM-BYTECODE.sol
// Generado desde bytecode de MAINNET (TronGrid)
// Contrato: ${addr}
// Bytecode: ${bytecodeHex.length / 2} bytes | solc: ${solcVersion || '0.8.25'} (metadata CBOR)
// =============================================================================
//
// ORIGEN: Este archivo se obtiene del bytecode desplegado en mainnet mediante:
// 1. Descarga de runtimecode desde TronGrid (getcontractinfo)
// 2. Extracción metadata CBOR (RFC 8949): docs.soliditylang.org/metadata
// 3. Descompilación con Panoramix (github.com/palkeo/panoramix)
// 4. Interface generada desde ABI on-chain
//
// REFS: https://www.soliditylang.org/ | https://playground.sourcify.dev/
//
// *** LIMITACIÓN IMPORTANTE ***
// La descompilación NO produce Solidity que recompile byte a byte al original.
// Con bytecodeHash:none no hay metadata JSON (ipfs/bzzr1) — no se puede recuperar
// el source original desde chain. docs.soliditylang.org: Sourcify usa metadata para
// verificación "full/perfect"; sin ipfs/bzzr1 no aplica.
// Para verificación en Tronscan se requiere el código fuente original compilado
// con la misma configuración exacta, o redesplegar una nueva Implementation.
//
// =============================================================================
pragma solidity 0.8.25;

// --- PSEUDOCÓDIGO DESCOMPILADO (Panoramix) ---
// Representa la lógica inferida del bytecode. NO es Solidity compilable.
/*
${decompiledEscaped}
*/

// --- INTERFACE DESDE ABI MAINNET ---
// Expone los métodos y eventos del contrato para documentación y comprobación.
${stripSpdxAndPragma(interfaceSol).replace('pragma solidity ^0.8.20;', '// pragma solidity 0.8.25; (usado arriba)')}
`;
}

async function main() {
  console.log('=== Generar paquete verificación TXaXTSUK desde mainnet ===\n');

  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  // 1. Bytecode
  console.log('1. Obteniendo bytecode desde TronGrid...');
  const bytecodeHex = await fetchBytecode(ADDR);
  console.log('   Bytecode:', bytecodeHex.length / 2, 'bytes');

  fs.writeFileSync(path.join(OUT_DIR, 'bytecode.hex'), bytecodeHex, 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, 'bytecode-0x.txt'), '0x' + bytecodeHex, 'utf8');

  // 2. Metadata CBOR (RFC 8949, docs.soliditylang.org/metadata)
  const meta = extractMetadata(bytecodeHex);
  if (meta && meta.bytecodeWithoutMetadata) {
    const execHex = meta.bytecodeWithoutMetadata.toString('hex');
    fs.writeFileSync(path.join(OUT_DIR, 'bytecode-executable.hex'), execHex, 'utf8');
    fs.writeFileSync(path.join(OUT_DIR, 'bytecode-executable-0x.txt'), '0x' + execHex, 'utf8');
  }
  let solcVersion = null;
  let bytecodeHash = 'none';
  if (meta) {
    const decoded = decodeCborMetadata(meta.cbor);
    const formatted = formatDecodedMetadata(decoded);
    solcVersion = formatted.solc || null;
    bytecodeHash = (formatted.ipfs ? 'ipfs' : (formatted.bzzr1 || formatted.bzzr0 ? 'bzzr1' : 'none'));
  }
  console.log('2. Metadata CBOR:', meta ? `${meta.len} bytes` : 'no extraída');
  if (solcVersion) console.log('   Compilador (CBOR): solc', solcVersion);

  const metadataObj = {
    contract: ADDR,
    name: 'TRC20TokenUpgradeable',
    solcVersion: solcVersion || '0.8.25',
    bytecodeHash,
    bytecodeSizeBytes: bytecodeHex.length / 2,
    source: 'Mainnet TronGrid getcontractinfo',
    refs: ['https://docs.soliditylang.org/en/latest/metadata.html', 'https://playground.sourcify.dev/']
  };
  fs.writeFileSync(path.join(OUT_DIR, 'metadata.json'), JSON.stringify(metadataObj, null, 2), 'utf8');

  // 3. ABI
  const abiPath = path.join(ROOT, 'abi', 'token-info.json');
  let abi = [];
  if (fs.existsSync(abiPath)) {
    const tokenInfo = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
    abi = tokenInfo.abi || [];
  }
  if (abi.length === 0) {
    const addPath = path.join(ROOT, 'abi', 'addresses.json');
    if (fs.existsSync(addPath)) {
      const add = JSON.parse(fs.readFileSync(addPath, 'utf8'));
      abi = add.implementationAbi || add.abi || [];
    }
  }
  console.log('3. ABI:', abi.length, 'entradas');
  fs.writeFileSync(path.join(OUT_DIR, 'abi.json'), JSON.stringify(abi, null, 2), 'utf8');

  // 4. Interface desde ABI
  const interfaceSol = abiToSolidityInterface(abi);
  fs.writeFileSync(path.join(OUT_DIR, 'TRC20TokenUpgradeable-from-abi.sol'), interfaceSol, 'utf8');
  console.log('4. Generado: TRC20TokenUpgradeable-from-abi.sol (interface desde ABI)');

  // 5. Source para verificación (nuestro contrato con pragma exacto)
  // Usa Initializable-OZ (InvalidInitialization 0x13a3db11) para coincidir con bytecode de mainnet (EtherVM).
  const srcPath = path.join(ROOT, 'contracts', 'TRC20TokenUpgradeable.sol');
  const initOZPath = path.join(OUT_DIR, 'Initializable-OZ.sol');
  if (!fs.existsSync(initOZPath)) {
    const ozContent = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/** Initializable OZ-compatible: InvalidInitialization 0x13a3db11 (EtherVM). */
abstract contract Initializable {
    error InvalidInitialization();
    error NotInitializing();
    uint8 private _initialized;
    bool private _initializing;
    modifier initializer() {
        if (!(_initializing ? _isConstructor() : _initialized == 0)) revert InvalidInitialization();
        bool isTopLevelCall = !_initializing;
        if (isTopLevelCall) { _initializing = true; _initialized = 1; }
        _;
        if (isTopLevelCall) _initializing = false;
    }
    modifier reinitializer(uint8 version) {
        if (!_initializing && _initialized >= version) revert InvalidInitialization();
        _initialized = version;
        bool isTopLevelCall = !_initializing;
        if (isTopLevelCall) _initializing = true;
        _;
        if (isTopLevelCall) _initializing = false;
    }
    function _isConstructor() private view returns (bool) { return address(this).code.length == 0; }
    function _disableInitializers() internal virtual {
        if (_initializing) revert NotInitializing();
        _initialized = 255;
    }
}
`;
    fs.writeFileSync(initOZPath, ozContent, 'utf8');
    console.log('   Creado Initializable-OZ.sol (InvalidInitialization 0x13a3db11)');
  }
  const initPath = fs.existsSync(initOZPath) ? initOZPath : path.join(ROOT, 'contracts', 'Initializable.sol');
  if (fs.existsSync(srcPath) && fs.existsSync(initPath)) {
    let src = fs.readFileSync(srcPath, 'utf8');
    let init = fs.readFileSync(initPath, 'utf8');
    src = src.replace(/pragma\s+solidity\s+\^?0\.8\.\d+;/, 'pragma solidity ^0.8.25;');
    init = init.replace(/pragma\s+solidity\s+\^?0\.8\.\d+;/, 'pragma solidity ^0.8.25;');
    init = init.replace(/\babstract\s+contract\s+Initializable\b/, 'contract Initializable');
    const implNoImport = src.replace(/import\s*\{\s*Initializable\s*\}\s*from\s*["']\.\/Initializable\.sol["'];\s*\n?/i, '');
    const flattened = `// SPDX-License-Identifier: MIT\n// Flattened para verificación Tronscan (Initializable-OZ: InvalidInitialization 0x13a3db11)\npragma solidity ^0.8.25;\n\n${stripSpdxAndPragma(init)}\n\n${stripSpdxAndPragma(implNoImport)}`;
    fs.writeFileSync(path.join(OUT_DIR, 'TRC20TokenUpgradeable-flattened.sol'), flattened, 'utf8');
    console.log('5. Generado: TRC20TokenUpgradeable-flattened.sol (pragma 0.8.25, Initializable-OZ)');

    const flattenedTronscan = flattened.replace(/\bblock\.chainid\b/g, '728126428');
    fs.writeFileSync(path.join(OUT_DIR, 'TRC20TokenUpgradeable-flattened-TRONSCAN.sol'), flattenedTronscan, 'utf8');
    console.log('   + TRC20TokenUpgradeable-flattened-TRONSCAN.sol (block.chainid→728126428 para EVM sin chainid)');
  }

  // 6. Panoramix + TRC20TokenUpgradeable-FROM-BYTECODE.sol
  // Usar bytecode ejecutable (sin metadata CBOR) para decompilación según docs.soliditylang.org
  const bytecodeForDecompile = meta && meta.bytecodeWithoutMetadata
    ? meta.bytecodeWithoutMetadata.toString('hex')
    : bytecodeHex;
  console.log('6. Decompilación Panoramix y generación .sol desde bytecode...');
  let decompiled = runPanoramix(bytecodeForDecompile);
  if (!decompiled) {
    decompiled = '// Panoramix no disponible. Ejecutar: pip install panoramix-decompiler\n// Luego: panoramix 0x<bytecode> con bytecode-0x.txt';
  } else {
    fs.writeFileSync(path.join(OUT_DIR, 'TRC20TokenUpgradeable-decompiled.pyr'), decompiled, 'utf8');
    console.log('   Guardado: TRC20TokenUpgradeable-decompiled.pyr');
  }

  const fromBytecodeSol = buildSolFromBytecode(ADDR, bytecodeHex, solcVersion, decompiled, interfaceSol);
  fs.writeFileSync(path.join(OUT_DIR, 'TRC20TokenUpgradeable-FROM-BYTECODE.sol'), fromBytecodeSol, 'utf8');
  console.log('   Generado: TRC20TokenUpgradeable-FROM-BYTECODE.sol (derivado del bytecode mainnet)');

  // 7. Parámetros Tronscan
  const paramsTxt = `PARÁMETROS PARA VERIFICACIÓN EN TRONSCAN
==========================================

Contrato: ${ADDR}
URL: https://tronscan.org/#/contract/${ADDR}/code

Compilador: ${solcVersion || '0.8.25'} (exacto, del metadata CBOR)
Optimización: Sí
Runs: 200
EVM: default (o compatible TRON)
License: MIT

Archivos en esta carpeta:
- bytecode.hex          : Bytecode runtime de mainnet
- bytecode-0x.txt       : Mismo con prefijo 0x (para panoramix)
- abi.json              : ABI del contrato
- metadata.json         : Metadata extraída
- TRC20TokenUpgradeable-from-abi.sol    : Interface generada desde ABI
- TRC20TokenUpgradeable-flattened.sol   : Source flatten para verificación
- TRC20TokenUpgradeable-decompiled.pyr   : Salida Panoramix (pseudocódigo)
- TRC20TokenUpgradeable-FROM-BYTECODE.sol : .sol derivado del bytecode (auditoría, NO recompila idéntico)

NOTA: El bytecode desplegado fue compilado con solc 0.8.25 y bytecodeHash:none
(metadata CBOR no incluye ipfs/bzzr1 — no recuperable desde chain).
Refs: docs.soliditylang.org/metadata, playground.sourcify.dev
Si TRC20TokenUpgradeable-flattened.sol no compila al bytecode exacto, probar
en Tronscan con ese source. La decompilación sirve para documentación/auditoría.
`;
  fs.writeFileSync(path.join(OUT_DIR, 'PARAMETROS-TRONSCAN.txt'), paramsTxt, 'utf8');
  console.log('7. Generado: PARAMETROS-TRONSCAN.txt');

  console.log('\n=== Paquete listo en verification/TXaXTSUK-verification/ ===');
}

// NOSONAR - top-level await requiere type:module; CommonJS mantiene compatibilidad
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
