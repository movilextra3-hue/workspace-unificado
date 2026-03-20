#!/usr/bin/env node
'use strict';
/**
 * Verifica que el source del paquete de verificación, compilado con los mismos
 * parámetros que el despliegue, produzca EXACTAMENTE el mismo bytecode.
 * Garantiza que la verificación en Tronscan tendrá éxito si usamos los params correctos.
 *
 * Uso: node scripts/verificar-bytecode-despliegue-vs-verificacion.js
 *      npm run verificar:bytecode-match
 */
const path = require('node:path');
const fs = require('node:fs');
const solc = require('solc');

const ROOT = path.join(__dirname, '..');
const PKG_DIR = path.join(ROOT, 'verification', 'PAQUETE-VERIFICACION-POST-UPGRADE');
const BUILD_DIR = path.join(ROOT, 'build', 'contracts');

function compilePackageSource() {
  const config = require(path.join(ROOT, 'config', 'trc20-networks.js'));
  const comp = config.compilers?.solc || {};
  const optimizer = comp.settings?.optimizer?.enabled !== false;
  const runs = comp.settings?.optimizer?.runs ?? 200;
  const evmVersion = comp.settings?.evmVersion || 'shanghai';
  const metadata = comp.settings?.metadata;

  const pkgSourcePath = path.join(PKG_DIR, 'TRC20TokenUpgradeable.sol');
  if (!fs.existsSync(pkgSourcePath)) {
    throw new Error('Falta verification/PAQUETE-VERIFICACION-POST-UPGRADE/TRC20TokenUpgradeable.sol');
  }
  const source = fs.readFileSync(pkgSourcePath, 'utf8');

  const input = {
    language: 'Solidity',
    sources: { 'TRC20TokenUpgradeable.sol': { content: source } },
    settings: {
      outputSelection: { '*': { '*': ['evm.bytecode'] } },
      optimizer: { enabled: optimizer, runs },
      evmVersion,
      viaIR: false,
      ...(metadata && { metadata })
    }
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  if (output.errors) {
    const errs = output.errors.filter(e => e.severity === 'error');
    if (errs.length) throw new Error('Compilación falló: ' + JSON.stringify(errs));
  }
  const bc = output.contracts?.['TRC20TokenUpgradeable.sol']?.['TRC20TokenUpgradeable']?.evm?.bytecode?.object;
  if (!bc) throw new Error('No se generó bytecode desde paquete');
  return (bc || '').replace(/^0x/, '');
}

function main() {
  console.log('\n=== VERIFICACIÓN BYTECODE: DESPLIEGUE vs PAQUETE VERIFICACIÓN ===\n');

  const buildPath = path.join(BUILD_DIR, 'TRC20TokenUpgradeable.json');
  if (!fs.existsSync(buildPath)) {
    console.error('ERROR: Falta build. Ejecutar: npm run compile');
    process.exit(1);
  }

  const buildArtifact = JSON.parse(fs.readFileSync(buildPath, 'utf8'));
  const deployBytecode = (buildArtifact.bytecode || '').replace(/^0x/, '');
  if (!deployBytecode || deployBytecode.length < 100) {
    console.error('ERROR: Build sin bytecode válido.');
    process.exit(1);
  }

  let pkgBytecode;
  try {
    pkgBytecode = compilePackageSource();
  } catch (e) {
    console.error('ERROR:', e.message);
    process.exit(1);
  }

  const deployLen = deployBytecode.length / 2;
  const pkgLen = pkgBytecode.length / 2;

  console.log('Bytecode despliegue (build/):', deployLen, 'bytes');
  console.log('Bytecode paquete (verificación compilada):', pkgLen, 'bytes');

  if (deployBytecode === pkgBytecode) {
    console.log('\n✅ COINCIDE EXACTO (build vs paquete): El source del paquete de verificación,');
    console.log('   compilado con la misma config (config/trc20-networks.js), produce el mismo');
    console.log('   bytecode que build/contracts/. Esto NO compara con mainnet.');
    console.log('');
    console.log('   Para comparar con mainnet: npm run check:alignment');
    console.log('   Si build ≠ mainnet, la verificación en Tronscan puede fallar.');
    console.log('');
    return;
  }

  // Comparar sin metadata (últimos bytes son CBOR metadata)
  const stripMetadata = (hex) => {
    if (hex.length < 4) return hex;
    const lenBytes = parseInt(hex.slice(-4), 16);
    const metaLen = lenBytes * 2 + 4;
    if (hex.length > metaLen) return hex.slice(0, -metaLen);
    return hex;
  };
  const deployNoMeta = stripMetadata(deployBytecode);
  const pkgNoMeta = stripMetadata(pkgBytecode);
  if (deployNoMeta === pkgNoMeta) {
    console.log('\n⚠️  Coincide sin metadata: El bytecode ejecutable es idéntico.');
    console.log('   La diferencia está en el sufijo de metadata CBOR.');
    console.log('   Tronscan suele ignorar metadata al verificar; la verificación');
    console.log('   podría ser exitosa. Si falla, comprobar si Tronscan permite');
    console.log('   "Standard Input JSON" con metadata.bytecodeHash:none.');
    console.log('');
  } else {
    console.log('\n❌ NO COINCIDE: Revisar source del paquete y parámetros.');
    console.log('   Puede haber diferencias en el source o en la config.');
    process.exit(1);
  }
}

main();
