#!/usr/bin/env node
'use strict';
/**
 * Guarda los artefactos necesarios para verificar en Tronscan la Implementation que se desplegará.
 * Un solo archivo: TRC20TokenUpgradeable.sol (contrato consolidado, Initializable incluido).
 * Parámetros desde config/trc20-networks.js (mismo compilador que upgrade).
 * Uso: node scripts/guardar-paquete-verificacion.js
 *      npm run guardar:verificacion
 *
 * Carpeta: verification/PAQUETE-VERIFICACION-POST-UPGRADE/
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'verification', 'PAQUETE-VERIFICACION-POST-UPGRADE');
const CONTRACTS = path.join(ROOT, 'contracts');

const KEEP_FILES = new Set([
  'TRC20TokenUpgradeable.sol', 'TRC20TokenUpgradeable-MAINNET-EXACT.sol', 'PARAMETROS-TRONSCAN.txt', 'PARAMETROS-CORRECTOS-TFeLLtutbo.txt', 'PASOS-SEGUROS-VERIFICAR.txt', 'OKLINK-ERRORES-SOLUCIONES.txt', 'TRONSCAN-POR-QUE-FALLA.txt', 'VERIFICACION-ESTADO.txt', 'LEEME-VERIFICACION.txt', 'verification-params.json', 'VERIFICAR_AHORA.txt', 'BYTECODE-MAINNET-REPORT.txt',
  'standard-input-TFeLLtutbo.json', 'standard-input-TFeLLtutbo-oklink.json', 'standard-input-TFeLLtutbo-oklink-evm-empty.json'
]);

function cleanObsoleteFiles() {
  try {
    const entries = fs.readdirSync(OUT_DIR, { withFileTypes: true });
    for (const e of entries) {
      if (e.isFile() && !KEEP_FILES.has(e.name)) {
        fs.unlinkSync(path.join(OUT_DIR, e.name));
      }
    }
  } catch (err) {
    console.warn('Advertencia: no se pudieron limpiar archivos obsoletos en', OUT_DIR, err.message);
  }
}

function getImplementationAddress() {
  try {
    const d = JSON.parse(fs.readFileSync(path.join(ROOT, 'deploy-info.json'), 'utf8'));
    return d.implementationAddress || '(consultar deploy-info.json)';
  } catch {
    return '(consultar deploy-info.json)';
  }
}

function runCompilationCheck() {
  const { spawnSync } = require('node:child_process');
  const cp = spawnSync('node', ['scripts/compile-with-solc.js'], { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
  if (cp.status !== 0) {
    console.error('ERROR: Compilación falló. El source debe compilar sin errores.');
    if (cp.stderr) console.error(cp.stderr.slice(-800));
    if (cp.stdout) console.error(cp.stdout.slice(-800));
    process.exit(1);
  }
  const buildPath = path.join(ROOT, 'build', 'contracts', 'TRC20TokenUpgradeable.json');
  if (!fs.existsSync(buildPath)) {
    console.error('ERROR: Falta build/contracts/TRC20TokenUpgradeable.json tras compilar.');
    process.exit(1);
  }
  const buildArtifact = JSON.parse(fs.readFileSync(buildPath, 'utf8'));
  const buildBc = (buildArtifact.bytecode || '').replace(/^0x/, '');
  if (!buildBc || buildBc.length < 100) {
    console.error('ERROR: Build sin bytecode válido. Revisar compilación.');
    process.exit(1);
  }
}

function runBytecodeVerification() {
  const { spawnSync } = require('node:child_process');
  const cp = spawnSync('node', ['scripts/verificar-bytecode-despliegue-vs-verificacion.js'], { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
  if (cp.status !== 0) {
    console.error('ERROR: El bytecode del paquete de verificación NO coincide con el de despliegue.');
    if (cp.stderr) console.error(cp.stderr.slice(-500));
    process.exit(1);
  }
}

function main() {
  console.log('\n=== GUARDAR PAQUETE VERIFICACIÓN (post-upgrade) ===\n');

  const implPath = path.join(CONTRACTS, 'TRC20TokenUpgradeable.sol');
  if (!fs.existsSync(implPath)) {
    console.error('Falta contracts/TRC20TokenUpgradeable.sol');
    process.exit(1);
  }

  let source = fs.readFileSync(implPath, 'utf8');
  source = source.replace(/pragma\s+solidity\s+\^?0\.8\.\d+;/, 'pragma solidity ^0.8.25;');

  fs.mkdirSync(OUT_DIR, { recursive: true });
  cleanObsoleteFiles();

  fs.writeFileSync(path.join(OUT_DIR, 'TRC20TokenUpgradeable.sol'), source, 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, 'TRC20TokenUpgradeable-MAINNET-EXACT.sol'), source, 'utf8');

  const config = require(path.join(ROOT, 'config', 'trc20-networks.js'));
  const comp = config.compilers?.solc || {};
  const compiler = comp.version || '0.8.25';
  const optimizer = comp.settings?.optimizer?.enabled !== false;
  const runs = comp.settings?.optimizer?.runs ?? 200;
  const evmVersion = comp.settings?.evmVersion || 'shanghai';
  const compilerFull = 'v0.8.25+commit.b61c2a91';
  const implAddr = getImplementationAddress();

  const paramsTxt = `PARÁMETROS EXACTOS PARA TRONSCAN — TFeLLtutboNwVwSSdNqAiXoQGzXZrbTDMC
===============================================================================

Usar EXACTAMENTE estos valores. Si falla "confirm the correct parameters":

1. CONFIGURACIÓN OBLIGATORIA:
   Compiler Version:    ${compilerFull}  (o "0.8.25" si Tronscan solo muestra número)
   Optimization:        ${optimizer ? 'Yes' : 'No'}
   Runs:                ${runs}
   EVM Version:         Shanghai  (o "shanghai" — probar si falla)
   License:             MIT
   ViaIR:               No
   Contract Name:       TRC20TokenUpgradeable
   Contract Address:   ${implAddr}

2. COMPILADOR: Usar compilador ETHEREUM (NO TRON). Tronscan puede ofrecer ambos.

3. CONSTRUCTOR ARGUMENTS: Ninguno (contrato upgradeable, usa initialize).

4. ARCHIVO: Subir TRC20TokenUpgradeable.sol (único archivo, Initializable incluido).

5. SI FALLA EN TRONSCAN: Probar OKLink con Standard Input JSON:
   - Ejecutar: node scripts/generate-standard-input-TFeLLtutbo.js
   - Subir standard-input-TFeLLtutbo.json en OKLink
   - URL: https://www.oklink.com/tron/verify-contract-preliminary

URL Tronscan: https://tronscan.org/#/contracts/verify
Términos de uso del código fuente: https://tronscan.org/#/contracts/source-code-usage-terms

DOCUMENTACIÓN OFICIAL TRON:
  DApp Development Tools: https://developers.tron.network/docs/dapp-development-tools
  Verifying a Contract:    https://developers.tron.network/docs/contract-verification

DOCUMENTACIÓN OKLINK (API verificación y proxy):
  Developer tools: https://www.oklink.com/docs/en/#developer-tools
  (API verify-source-code no soporta TRON; verificación por web.)

REFERENCIA OFICIAL — Contratos con subdirectorios:
  Tronscan no soporta subdirectorios: hay que subir un único archivo (flattened).
  Guía: https://support.tronscan.org/hc/en-us/articles/19500651417241-How-to-verify-contracts-with-subdirectory-structures
  Si usas tronbox flatten: eliminar SPDX duplicados en el .sol resultante (dejar solo uno):
  https://github.com/NomicFoundation/hardhat/issues/1050
  Este paquete ya usa un único .sol (Initializable incluido), no hay que flattenear.
`;

  fs.writeFileSync(path.join(OUT_DIR, 'PARAMETROS-TRONSCAN.txt'), paramsTxt, 'utf8');

  const correctParamsTxt = `PARÁMETROS CORRECTOS — TFeLLtutbo (si la verificación falla)
================================================================

Contract Address (EXACTO):
  TFeLLtutboNwVwSSdNqAiXoQGzXZrbTDMC

Contract Name (EXACTO):
  TRC20TokenUpgradeable

Compiler Version (EXACTO):
  0.8.25
  (o v0.8.25+commit.b61c2a91 si el explorador pide commit)

Optimization:
  Yes (activado)

Optimizer Runs (EXACTO):
  200

EVM Version (EXACTO):
  Shanghai
  (OKLink: si aparece "Invalid EVM version requested", usar standard-input-TFeLLtutbo-oklink.json
   y no seleccionar EVM en el formulario; ejecutar: npm run generate:standard-input:oklink)

Constructor Arguments:
  Ninguno (dejar vacío / 0x). Es la Implementation, no el Proxy.

Archivo fuente:
  TRC20TokenUpgradeable.sol (único archivo; Initializable incluido = compatible con Tronscan).
  Tronscan no soporta subdirectorios: https://support.tronscan.org/hc/en-us/articles/19500651417241
  OKLink: tipo "Standard JSON Input", pegar standard-input-TFeLLtutbo-oklink.json.

Comprobar antes de enviar:
  [ ] Dirección pegada sin espacios ni saltos de línea
  [ ] Nombre del contrato exactamente: TRC20TokenUpgradeable (sin .sol)
  [ ] Compiler 0.8.25 (no 0.8.24 ni 0.8.26)
  [ ] Runs = 200 (no 20000 ni 1)
  [ ] Constructor arguments vacío

Documentación oficial: https://developers.tron.network/docs/contract-verification
`;

  fs.writeFileSync(path.join(OUT_DIR, 'PARAMETROS-CORRECTOS-TFeLLtutbo.txt'), correctParamsTxt, 'utf8');

  const leemeTxt = `LEEME — VERIFICACIÓN EN TRONSCAN POST-UPGRADE
========================================

1. EJECUTAR ANTES DEL UPGRADE:
   npm run guardar:verificacion
   (ya ejecutado si estás leyendo esto)

2. TRAS EL UPGRADE (npm run upgrade:mainnet):
   - La nueva Implementation tendrá una dirección (deploy-info.json → implementationAddress)
   - Esa dirección es la que debes verificar en Tronscan

3. PASOS EN TRONSCAN (https://tronscan.org/#/contracts/verify):
   a) Contract Address: pegar la dirección de la NUEVA Implementation
   b) Compiler: ${compiler} (seleccionar versión exacta)
   c) Optimization: ${optimizer ? 'Yes' : 'No'}, Runs: ${runs}
   d) EVM: ${evmVersion}
   e) License: MIT
   f) Contract Name: TRC20TokenUpgradeable
   g) Source: subir TRC20TokenUpgradeable.sol

4. ARCHIVOS EN ESTA CARPETA:
   - TRC20TokenUpgradeable.sol  : Único archivo, único contrato (Initializable + TRC20TokenUpgradeable)
   - PARAMETROS-TRONSCAN.txt    : Parámetros exactos para verificación

Este paquete se generó desde contracts/ en el momento del guardado.
Si cambias contracts/TRC20TokenUpgradeable.sol, ejecuta de nuevo:
   npm run guardar:verificacion
`;

  fs.writeFileSync(path.join(OUT_DIR, 'LEEME-VERIFICACION.txt'), leemeTxt, 'utf8');

  const solPath = path.join(OUT_DIR, 'TRC20TokenUpgradeable.sol');
  const pasosTxt = `PASOS SEGUROS PARA VERIFICAR TFeLLtutboNwVwSSdNqAiXoQGzXZrbTDMC
================================================================================

IMPORTANTE: Este contrato se desplegó con metadata.bytecodeHash:none. Tronscan NO
ofrece esa opción en el formulario, por eso suele fallar con "Please confirm the
correct parameters". Ver TRONSCAN-POR-QUE-FALLA.txt. Usar OKLINK (Opción A).

OPCIÓN A — OKLINK (recomendado para TFeLLtutbo; el JSON lleva bytecodeHash:none)

1. Generar JSON sin EVM (evita error "Invalid EVM version"):
   En la carpeta del proyecto: npm run generate:standard-input:oklink

2. Abre: https://www.oklink.com/tron/verify-contract-preliminary

3. Contract Address: TFeLLtutboNwVwSSdNqAiXoQGzXZrbTDMC

4. Verification Type: "Standard JSON Input"

5. Compiler Version: 0.8.25 (no elijas EVM Version en el formulario; dejarlo en default)

6. Clic "Next". En la segunda pantalla: pegar TODO el contenido del archivo:
   ${path.join(OUT_DIR, 'standard-input-TFeLLtutbo-oklink.json')}

7. Main Contract Name: TRC20TokenUpgradeable

8. CAPTCHA y Submit.

9. DESPUÉS de verificar la Implementation: vincular el Proxy en OKLink
   https://www.oklink.com/tron/verify-proxy-contract
   Proxy: TV4P3sVfSQULNnsCPyzLnofCbK6cwkHeDm | Implementation: TFeLLtutboNwVwSSdNqAiXoQGzXZrbTDMC
   (npm run verify:oklink:proxy abre la página y rellena; o rellenar a mano.)


OPCIÓN B — TRONSCAN (suele fallar para este contrato; ver TRONSCAN-POR-QUE-FALLA.txt)
  Si aun así quieres probar: https://tronscan.org/#/contracts/verify
  Contract Address: TFeLLtutboNwVwSSdNqAiXoQGzXZrbTDMC
  Contract Name: TRC20TokenUpgradeable | Compiler: 0.8.25 (Ethereum) | Optimization: Yes | Runs: 200 | EVM: Shanghai | License: MIT | Constructor: vacío
  Subir: ${solPath}

RESUMEN — Valores que DEBEN coincidir con el despliegue
  Address:  TFeLLtutboNwVwSSdNqAiXoQGzXZrbTDMC
  Contract: TRC20TokenUpgradeable
  Compiler: 0.8.25   Optimization: Yes   Runs: 200   EVM: Shanghai
  Constructor: ninguno
  Para verificación: OKLink con Standard JSON (bytecodeHash:none incluido en el JSON).

SI OKLINK MUESTRA ERRORES:
  Ver en esta carpeta: OKLINK-ERRORES-SOLUCIONES.txt
`;

  fs.writeFileSync(path.join(OUT_DIR, 'PASOS-SEGUROS-VERIFICAR.txt'), pasosTxt, 'utf8');

  const oklinkErroresTxt = `OKLINK — ERRORES FRECUENTES Y SOLUCIONES (TFeLLtutbo)
================================================================================

1. "Invalid EVM version requested"
   → Probar en este orden:
   a) standard-input-TFeLLtutbo-oklink.json (sin clave evmVersion). En el formulario NO elegir "EVM Version".
   b) standard-input-TFeLLtutbo-oklink-evm-empty.json (evmVersion: ""). Generar: npm run generate:standard-input:oklink
   → Si ambos fallan, el backend OKLink TRON puede estar rechazando cualquier opción; contactar soporte OKLink.

2. "Verification failed" / "Bytecode mismatch" / "Please confirm the correct parameters"
   → En TRONSCAN: falla porque no ofrece bytecodeHash:none (ver TRONSCAN-POR-QUE-FALLA.txt).
   → En OKLink: asegúrate de usar standard-input-TFeLLtutbo-oklink.json completo, tipo "Standard JSON Input", Compiler 0.8.25, sin elegir EVM. Si sigue fallando, el backend de OKLink podría no aplicar metadata.bytecodeHash; no hay otra vía pública para este contrato.

3. Error relacionado con "metadata" o "settings" en el JSON
   → OKLink puede rechazar metadata.bytecodeHash u otras opciones.
   → No quitar metadata del JSON (el bytecode dejaría de coincidir con mainnet).
   → Verificar en TRONSCAN subiendo el archivo .sol (Tronscan no pide Standard JSON para un solo archivo).

4. "Source file requires different compiler version (current compiler is 0.8.20)"
   → El formulario usó 0.8.20; el contrato requiere 0.8.25 (pragma ^0.8.25).
   → En el desplegable "Compiler Version" selecciona explícitamente 0.8.25 o v0.8.25 (no tronbox si es 0.8.20).
   → Si OKLink solo ofrece 0.8.20 para TRON, no se puede verificar este contrato ahí; contactar soporte.

5. "Contract name" / "Main contract" incorrecto
   → Escribir exactamente: TRC20TokenUpgradeable (sin .sol, sin espacios).

6. Errores de red / CAPTCHA / tiempo de espera
   → Comprobar que la red sea TRON Mainnet en OKLink.
   → Resolver CAPTCHA antes de Submit.
   → Si la página no carga: probar Tronscan.

RECOMENDACIÓN: Para TFeLLtutboNwVwSSdNqAiXoQGzXZrbTDMC usar OKLINK con Standard JSON
(standard-input-TFeLLtutbo-oklink.json). Tronscan falla porque no ofrece bytecodeHash:none.
Ver TRONSCAN-POR-QUE-FALLA.txt y PASOS-SEGUROS-VERIFICAR.txt.

Documentación API OKLink (verificación y proxy): https://www.oklink.com/docs/en/#developer-tools
(La API verify-source-code no soporta TRON; verificación solo por web.)
`;

  fs.writeFileSync(path.join(OUT_DIR, 'OKLINK-ERRORES-SOLUCIONES.txt'), oklinkErroresTxt, 'utf8');

  const tronscanFallaTxt = `POR QUÉ TRONSCAN DICE "verification failed. Please confirm the correct parameters"
===============================================================================================

CAUSA COMPROBADA:
  Este contrato se desplegó con metadata.bytecodeHash: 'none' (config/trc20-networks.js).
  Con bytecodeHash:none el bytecode en mainnet tiene 19072 bytes.
  Si se compila SIN esa opción (valor por defecto), el bytecode tiene 19113 bytes.
  Tronscan NO ofrece "bytecode hash" ni "metadata" en el formulario, así que compila
  con el valor por defecto → el bytecode no coincide → "Please confirm the correct parameters".

SOLUCIÓN:
  Verificar en OKLINK con Standard JSON Input (ese JSON sí incluye bytecodeHash:none).

  1. npm run generate:standard-input:oklink
  2. Abre: https://www.oklink.com/tron/verify-contract-preliminary
  3. Contract Address: TFeLLtutboNwVwSSdNqAiXoQGzXZrbTDMC
  4. Verification Type: Standard JSON Input
  5. Compiler: 0.8.25 (NO elijas "EVM Version" en el formulario)
  6. Next → pega TODO el contenido de: standard-input-TFeLLtutbo-oklink.json
  7. Main Contract: TRC20TokenUpgradeable
  8. CAPTCHA y Submit

  Si OKLink da "Invalid EVM version": probar standard-input-TFeLLtutbo-oklink-evm-empty.json
  (evmVersion: ""). Generar con: npm run generate:standard-input:oklink. El script Playwright
  usa esa variante primero si existe.

DESPUÉS DE VERIFICAR LA IMPLEMENTATION — Vincular el proxy:
  https://www.oklink.com/es-la/tron/verify-proxy-contract
  (o https://www.oklink.com/tron/verify-proxy-contract)
  Dirección proxy: TV4P3sVfSQULNnsCPyzLnofCbK6cwkHeDm
  Dirección implementation: TFeLLtutboNwVwSSdNqAiXoQGzXZrbTDMC
  Así OKLink muestra ABI e implementación en la página del proxy. Comando: npm run verify:oklink:proxy
`;

  fs.writeFileSync(path.join(OUT_DIR, 'TRONSCAN-POR-QUE-FALLA.txt'), tronscanFallaTxt, 'utf8');

  const estadoTxt = `ESTADO DE VERIFICACIÓN — TFeLLtutboNwVwSSdNqAiXoQGzXZrbTDMC
===============================================================================

CONTRATO: Implementation (mainnet). Bytecode desplegado: 19072 bytes (compilado con
metadata.bytecodeHash:none, optimizer 200, evmVersion shanghai, 0.8.25).

VÍAS PROBADAS:
1. Tronscan (https://tronscan.org/#/contracts/verify)
   → Fallo: "Please confirm the correct parameters". Causa: Tronscan no ofrece
   bytecodeHash/metadata; compila con valor por defecto (19113 bytes) ≠ mainnet (19072).
   Ver TRONSCAN-POR-QUE-FALLA.txt.

2. OKLink Standard JSON (https://www.oklink.com/tron/verify-contract-preliminary)
   → Fallo: "Invalid EVM version requested". Probado: JSON sin evmVersion; JSON con
   evmVersion: ""; en formulario no elegir EVM. El backend OKLink TRON sigue rechazando.
   Ver OKLINK-ERRORES-SOLUCIONES.txt.

3. API OKLink (verify-source-code): no soporta TRON (solo cadenas EVM en la API).

4. Sourcify: no soporta TRON.

PRÓXIMOS PASOS RECOMENDADOS:
- Volver a intentar OKLink con: npm run generate:standard-input:oklink y
  npm run verify:oklink:playwright (usa variante evm-empty). No elegir EVM en el formulario.
- Contactar soporte OKLink: indicar dirección TFeLLtutboNwVwSSdNqAiXoQGzXZrbTDMC,
  error "Invalid EVM version requested" al verificar con Standard JSON Input (sin evmVersion
  o evmVersion ""), solicitar soporte para TRON con compilación metadata.bytecodeHash:none.
- Si Tronscan añade opción de metadata/bytecode hash en el futuro, verificar ahí con el .sol
  de este paquete y parámetros 0.8.25, 200 runs, Shanghai, MIT.
`;

  fs.writeFileSync(path.join(OUT_DIR, 'VERIFICACION-ESTADO.txt'), estadoTxt, 'utf8');

  const verificarAhoraTxt = `VERIFICAR CONTRATO AHORA — OKLink (Implementation TFeLLtutbo)
================================================================================

Qué se compara en la verificación: el explorador compila tu Standard JSON y compara
el bytecode generado (deployedBytecode completo, incluido sufijo metadata) con el
bytecode en mainnet (runtimecode de getcontractinfo). Deben ser idénticos byte a byte.

El script de rellenado NO hace clic en Submit: tú debes resolver el CAPTCHA (si aparece)
y pulsar Submit/Enviar manualmente cuando estés listo.

PASOS (en orden):

1. En blockchain/trc20-token ejecuta:
   npm run guardar:verificacion

   (Incluye: compilación, bytecode paquete=build, bytecode compilado=mainnet, y al final
   npm run generate:standard-input:oklink para generar standard-input-TFeLLtutbo*.json.)
   Si solo necesitas regenerar JSON sin todo el guardado: npm run verify:oklink:prepare

2. Opcional pero recomendado antes de enviar a OKLink:
   npm run check:bytecode:mainnet
   Debe mostrar "¿Idénticos? SÍ". Si no, no enviar hasta alinear source/config.
   Informe detallado: PAQUETE.../BYTECODE-MAINNET-REPORT.txt

3. Abre OKLink y rellena con el script (o a mano):
   npm run verify:oklink:playwright

   El script rellena: dirección, Standard JSON Input, compilador 0.8.25, pega el JSON.
   El navegador se queda abierto.

4. IMPORTANTE:
   - Resuelve el CAPTCHA si aparece.
   - Haz clic en Submit/Enviar TÚ MISMO (el script ya no hace clic automático).
   - Espera la respuesta de OKLink.

5. Si pide "Contract name" o "Main contract":
   Usar: TRC20TokenUpgradeable
   Si falla, probar: TRC20TokenUpgradeable.sol:TRC20TokenUpgradeable

6. Archivo JSON a pegar (en la pestaña 2):
   verification/PAQUETE-VERIFICACION-POST-UPGRADE/standard-input-TFeLLtutbo-oklink-evm-empty.json
   (o standard-input-TFeLLtutbo-oklink.json si el primero da error)

URL: https://www.oklink.com/tron/verify-contract-preliminary
Comprobar después: https://www.oklink.com/tron/address/TFeLLtutboNwVwSSdNqAiXoQGzXZrbTDMC

Tronscan: no verifica este contrato porque no soporta metadata.bytecodeHash:none
(bytecode 19113 vs 19072 en mainnet). Solo OKLink con Standard JSON.
`;

  fs.writeFileSync(path.join(OUT_DIR, 'VERIFICAR_AHORA.txt'), verificarAhoraTxt, 'utf8');

  const verificationParams = {
    compiler,
    optimization: optimizer,
    runs,
    evmVersion,
    license: 'MIT',
    mainContract: 'TRC20TokenUpgradeable',
    sourceFile: 'TRC20TokenUpgradeable.sol',
    generatedAt: new Date().toISOString()
  };
  fs.writeFileSync(
    path.join(OUT_DIR, 'verification-params.json'),
    JSON.stringify(verificationParams, null, 2),
    'utf8'
  );

  runCompilationCheck();
  console.log('  [OK] Compilación correcta. Source, params y build alineados.');

  runBytecodeVerification();
  console.log('  [OK] Bytecode paquete verificación = bytecode despliegue (coincidencia exacta).');

  const { spawnSync } = require('node:child_process');
  const mainnetCheck = spawnSync('node', ['scripts/check-bytecode-mainnet-full.js'], { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
  if (mainnetCheck.status !== 0) {
    console.error('  [FALLO] Bytecode compilado (config actual) no coincide con mainnet. No guardar hasta alinear.');
    if (mainnetCheck.stdout) console.error(mainnetCheck.stdout.slice(-1500));
    process.exit(1);
  }
  console.log('  [OK] Bytecode compilado = bytecode mainnet (comprobación real; lo que compara el verificador).');

  const genOklink = spawnSync('npm', ['run', 'generate:standard-input:oklink'], { cwd: ROOT, encoding: 'utf8', stdio: 'inherit' });
  if (genOklink.status !== 0) {
    console.error('ERROR: generate:standard-input:oklink falló. Ejecutar: npm run generate:standard-input:oklink');
    process.exit(1);
  }
  console.log('  [OK] Standard JSON + variantes OKLink (standard-input-TFeLLtutbo*.json) generados.');

  console.log('\nPaquete guardado en:', OUT_DIR);
  console.log('  - TRC20TokenUpgradeable.sol (único archivo, mismo contrato consolidado)');
  console.log('  - TRC20TokenUpgradeable-MAINNET-EXACT.sol (mismo contenido; nombre inequívoco para mainnet TFeLLtutbo...)');
  console.log('  - PARAMETROS-TRONSCAN.txt');
  console.log('  - PARAMETROS-CORRECTOS-TFeLLtutbo.txt (si la verificación falla, usar estos valores exactos)');
  console.log('  - PASOS-SEGUROS-VERIFICAR.txt (pasos seguros Tronscan + OKLink)');
  console.log('  - OKLINK-ERRORES-SOLUCIONES.txt (si OKLink muestra errores)');
  console.log('  - TRONSCAN-POR-QUE-FALLA.txt (por qué Tronscan da "confirm the correct parameters")');
  console.log('  - VERIFICACION-ESTADO.txt (resumen de vías probadas y próximos pasos)');
  console.log('  - VERIFICAR_AHORA.txt (pasos definitivos para verificar en OKLink; Submit manual tras CAPTCHA)');
  console.log('  - BYTECODE-MAINNET-REPORT.txt (informe comprobación real mainnet; ver check:bytecode:mainnet)');
  console.log('\nTras el upgrade, usa la nueva implementationAddress en Tronscan.');
  console.log('');
}

main();
