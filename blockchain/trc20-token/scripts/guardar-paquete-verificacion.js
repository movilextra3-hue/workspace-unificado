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
const { execSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'verification', 'PAQUETE-VERIFICACION-POST-UPGRADE');
const CONTRACTS = path.join(ROOT, 'contracts');

const KEEP_FILES = new Set([
  'TRC20TokenUpgradeable.sol', 'TRC20TokenUpgradeable-MAINNET-EXACT.sol', 'PARAMETROS-TRONSCAN.txt', 'PARAMETROS-CORRECTOS-TFeLLtutbo.txt', 'PASOS-SEGUROS-VERIFICAR.txt', 'OKLINK-ERRORES-SOLUCIONES.txt', 'OKLINK-INVALID-EVM.txt', 'TRONSCAN-POR-QUE-FALLA.txt', 'VERIFICACION-ESTADO.txt', 'LEEME-VERIFICACION.txt', 'verification-params.json', 'VERIFICAR_AHORA.txt', 'BYTECODE-MAINNET-REPORT.txt',
  'standard-input-TFeLLtutbo.json', 'standard-input-TFeLLtutbo-oklink.json', 'standard-input-TFeLLtutbo-oklink-evm-empty.json',
  'oklink-last-submit-debug.log', 'oklink-network-sniff.log'
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
   - VERIFICAR_AHORA.txt         : Guía principal OKLink (JSON, comandos npm, orden de pruebas)
   - OKLINK-ERRORES-SOLUCIONES.txt : Si falla la verificación
   - TRC20TokenUpgradeable.sol   : Único archivo fuente (Initializable + TRC20TokenUpgradeable)
   - standard-input-TFeLLtutbo*.json : Standard JSON para OKLink
   - PARAMETROS-TRONSCAN.txt     : Parámetros Tronscan (limitaciones conocidas)

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
   Automatización: npm run verify:tronscan:playwright  (rellena formulario; reCAPTCHA a mano)
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

1. "Invalid EVM version requested" / JSONError (severity error, component general)
   → CAUSA TÍPICA: estás usando standard-input-TFeLLtutbo.json en OKLink. Ese archivo INCLUYE
     "evmVersion": "shanghai" en settings; el validador de OKLink lo rechaza.
   → NO uses en OKLink el archivo standard-input-TFeLLtutbo.json para este error.
   → SÍ usa SOLO (regenerar: npm run verify:oklink:prepare):
     a) standard-input-TFeLLtutbo-oklink.json — sin clave evmVersion en settings.
     b) En el formulario OKLink: NO elijas "EVM Version" / déjalo predeterminado / vacío (si contradices
        el JSON o fuerzas Shanghai en la UI, puede volver a fallar).
     c) Si sigue: standard-input-TFeLLtutbo-oklink-evm-empty.json (evmVersion: "").
   → Ver también: OKLINK-INVALID-EVM.txt en esta carpeta.
   → Si (a)(b)(c) fallan igual: backend OKLink TRON; contactar soporte OKLink.

2. "Verification failed" / "Bytecode mismatch" / "Please confirm the correct parameters"
   → En TRONSCAN: falla porque no ofrece bytecodeHash:none (ver TRONSCAN-POR-QUE-FALLA.txt).
   → En OKLink (mensaje genérico): probar JSON en ESTE orden (regenerar: npm run verify:oklink:prepare):
     a) standard-input-TFeLLtutbo.json (incluye evmVersion: shanghai) + en el formulario EVM/Shanghai si el sitio lo pide.
     b) standard-input-TFeLLtutbo-oklink.json (sin evmVersion) + NO elegir EVM en formulario o dejar default.
     c) standard-input-TFeLLtutbo-oklink-evm-empty.json (evmVersion: "").
   → Tipo compilador: Solidity / Standard JSON Input (Ethereum), NO compilador TRON si la UI lo separa.
   → Compiler: 0.8.25 o v0.8.25+commit.b61c2a91. Main contract: TRC20TokenUpgradeable (exacto).
   → Si tras (a)(b)(c) sigue igual: npm run check:alignment debe seguir mostrando bytecode=mainnet; entonces es
     límite del backend OKLink con metadata.bytecodeHash:none → soporte OKLink o Tronscan manual como prueba.

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

7. Mensaje genérico ("ocurrió un error", "inténtelo más tarde", toast sin texto técnico)
   → La UI de OKLink a menudo NO muestra el motivo; el detalle suele ir en la respuesta HTTP de su API.
   → Cómo ver el error REAL:
     a) En el navegador: F12 → pestaña Network → filtrar por "api" o "verify" →
        pulsar Submit → seleccionar la petición POST/GET que falle o devuelva JSON →
        pestaña Response / Preview (copiar el cuerpo).
     b) Desde el proyecto: npm run verify:oklink:sniff
        Abre el paso 2, registra tráfico en: oklink-network-sniff.log (en esta carpeta).
        Tras enviar, pulsa Enter en la terminal.
     c) Tras npm run verify:oklink:playwright también se escribe en: oklink-last-submit-debug.log
        (ahora captura más que solo application/json).
   → Si el JSON de respuesta indica rate limit, 429, 5xx, validación de campo o código numérico,
     actuar según ese mensaje (esperar, otro JSON, soporte OKLink).

RECOMENDACIÓN: Para TFeLLtutboNwVwSSdNqAiXoQGzXZrbTDMC usar OKLINK con Standard JSON
(standard-input-TFeLLtutbo-oklink.json). Tronscan falla porque no ofrece bytecodeHash:none.
Ver TRONSCAN-POR-QUE-FALLA.txt y PASOS-SEGUROS-VERIFICAR.txt.

Documentación API OKLink (verificación y proxy): https://www.oklink.com/docs/en/#developer-tools
(La API verify-source-code no soporta TRON; verificación solo por web.)
`;

  fs.writeFileSync(path.join(OUT_DIR, 'OKLINK-ERRORES-SOLUCIONES.txt'), oklinkErroresTxt, 'utf8');

  const oklinkInvalidEvmTxt = `Invalid EVM version requested (JSONError)
========================================

Puede salir en OKLink (subida de Standard JSON) o en TRONSCAN al validar.
Si fue en Tronscan: el formulario no es el mismo que OKLink — ver TRONSCAN-POR-QUE-FALLA.txt
(sección "Invalid EVM en Tronscan").

En OKLink, casi siempre es porque pegaste el JSON EQUIVOCADO.

NO uses en OKLink:
  standard-input-TFeLLtutbo.json
  (contiene "evmVersion": "shanghai" → OKLink lo rechaza.)

SÍ usa en OKLink (en este orden):
  1) standard-input-TFeLLtutbo-oklink.json
     (sin clave evmVersion; generado por npm run verify:oklink:prepare)
  2) En el formulario: no fuerces "EVM Version" / deja predeterminado.
  3) Si sigue el error: standard-input-TFeLLtutbo-oklink-evm-empty.json

Regenerar JSON:
  cd blockchain/trc20-token
  npm run verify:oklink:prepare
  (o npm run guardar:verificacion)

Detalle: OKLINK-ERRORES-SOLUCIONES.txt sección 1.
`;
  fs.writeFileSync(path.join(OUT_DIR, 'OKLINK-INVALID-EVM.txt'), oklinkInvalidEvmTxt, 'utf8');

  const tronscanFallaTxt = `POR QUÉ TRONSCAN DICE "verification failed. Please confirm the correct parameters"
===============================================================================================

--- Invalid EVM version requested (JSONError) EN TRONSCAN ---
  El explorador devuelve a veces este error al compilar/validar, no solo OKLink.
  Qué probar en el formulario Tronscan (https://tronscan.org/#/contracts/verify):
  - Compiler / tipo: solc Ethereum **0.8.25** (o v0.8.25+commit.b61c2a91 si lo listan).
  - EVM: prueba **Shanghai**; si falla, **predeterminado** o la opción más cercana (la UI
    de Tronscan cambia; no siempre coincide con el despliegue).
  - Optimization: Yes, Runs: 200, License: MIT, Main: TRC20TokenUpgradeable.
  - Fuente: un solo archivo TRC20TokenUpgradeable.sol de esta carpeta.
  Límite: aunque el EVM cuadre, Tronscan NO permite bytecodeHash:none → suele seguir
  fallando con "confirm the correct parameters". La vía que sí lleva el JSON completo
  con metadata es OKLink (ver más abajo y OKLINK-INVALID-EVM.txt para Standard JSON).

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
  (evmVersion: ""). Generar con: npm run generate:standard-input:oklink.
  Playwright (npm run verify:oklink:playwright) usa por defecto standard-input-TFeLLtutbo-oklink.json;
  forzar evm-empty: variable de entorno OKLINK_JSON_VARIANT=evm-empty.

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
- npm run guardar:verificacion  (regenera JSON y VERIFICAR_AHORA.txt)
- npm run verify:oklink:playwright  o  npm run verify:oklink:playwright:auto  (--no-wait)
- Orden de JSON si "verification failed": ver VERIFICAR_AHORA.txt y OKLINK-ERRORES-SOLUCIONES.txt §2.
- Contactar soporte OKLink: dirección TFeLLtutboNwVwSSdNqAiXoQGzXZrbTDMC, Standard JSON con
  bytecodeHash:none (igual que despliegue), errores "Invalid EVM" o "confirm parameters".
- Si Tronscan añade opción de metadata/bytecode hash en el futuro, verificar con el .sol
  de este paquete y parámetros 0.8.25, 200 runs, Shanghai, MIT.
`;

  fs.writeFileSync(path.join(OUT_DIR, 'VERIFICACION-ESTADO.txt'), estadoTxt, 'utf8');

  const verificarAhoraTxt = `VERIFICAR CONTRATO AHORA — OKLink (Implementation TFeLLtutbo)
================================================================================

Qué se compara: el explorador compila tu Standard JSON y compara el bytecode resultante
con el runtime en mainnet. Deben coincidir byte a byte (incl. sufijo metadata según config).

CONFIG LOCAL (debe seguir OK antes de insistir en OKLink):
  npm run check:alignment          → bytecode fuente contracts/ = mainnet
  npm run check:bytecode:mainnet   → informe BYTECODE-MAINNET-REPORT.txt en esta carpeta
  npm run verify:objective:status  → alignment + estado Tronscan (verify_status) en un comando

El script Playwright NO pulsa Submit: CAPTCHA (si hay) y envío final son manuales.

--------------------------------------------------------------------------------
1) Regenerar este paquete y los JSON
--------------------------------------------------------------------------------
   cd blockchain/trc20-token
   npm run guardar:verificacion

   (Solo JSON: npm run verify:oklink:prepare)
   Pipeline completo opcional: npm run verify:implementation:pipeline

--------------------------------------------------------------------------------
2) Archivos JSON — ORDEN si ves "verification failed / confirm parameters"
--------------------------------------------------------------------------------
   Si ves "Invalid EVM version requested" (JSONError): NO uses el archivo (A) en OKLink.
   Lee OKLINK-INVALID-EVM.txt y usa solo *-oklink*.json. Orden para otros errores:

   Carpeta: verification/PAQUETE-VERIFICACION-POST-UPGRADE/

   A) standard-input-TFeLLtutbo.json
      → Incluye evmVersion "shanghai" en settings. En OKLink, si hay selector EVM, elige Shanghai
         coherente con el JSON (no contradecir formulario vs JSON).

   B) standard-input-TFeLLtutbo-oklink.json  [por defecto también en Playwright]
      → Sin evmVersion en settings. En el formulario NO fuerces otro EVM o déjalo en default.

   C) standard-input-TFeLLtutbo-oklink-evm-empty.json
      → evmVersion "". Si "Invalid EVM version" con (B).

   Playwright: OKLINK_JSON_VARIANT=evm-empty  fuerza (C) en el script.

--------------------------------------------------------------------------------
3) OKLink — parámetros
--------------------------------------------------------------------------------
   URL: https://www.oklink.com/tron/verify-contract-preliminary
   Red: TRON   Contract: TFeLLtutboNwVwSSdNqAiXoQGzXZrbTDMC
   Tipo: Solidity Standard JSON Input (Ethereum), NO compilador TRON si compila distinto.
   Compiler: 0.8.25 o v0.8.25+commit.b61c2a91
   Main contract: TRC20TokenUpgradeable

--------------------------------------------------------------------------------
4) Automatizar relleno y envío (opcional)
--------------------------------------------------------------------------------
   npm run verify:oklink:playwright
   npm run verify:oklink:playwright:auto    (cierra sin "pulsa Enter"; --no-wait)
   npm run verify:oklink:playwright:submit  (rellena + pulsa Submit; log: oklink-last-submit-debug.log)

--------------------------------------------------------------------------------
5) Tras verificar Implementation — proxy (opcional)
--------------------------------------------------------------------------------
   npm run verify:oklink:proxy
   Proxy: TV4P3sVfSQULNnsCPyzLnofCbK6cwkHeDm

--------------------------------------------------------------------------------
6) Comprobar estado en explorador
--------------------------------------------------------------------------------
   npm run check:oklink
   https://www.oklink.com/tron/address/TFeLLtutboNwVwSSdNqAiXoQGzXZrbTDMC

Tronscan con .sol suelen fallar: no exponen bytecodeHash:none (ver TRONSCAN-POR-QUE-FALLA.txt).
Documentación extendida: docs/vitacora/CONSOLIDACION_COMPLETA_TODO.md
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

  try {
    // execSync + shell por defecto en Windows; spawnSync('npm') sin shell suele fallar (ENOENT / status null).
    execSync('npm run generate:standard-input:oklink', { cwd: ROOT, stdio: 'inherit', env: process.env });
  } catch {
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
  console.log('  - OKLINK-INVALID-EVM.txt (error Invalid EVM version / JSONError)');
  console.log('  - TRONSCAN-POR-QUE-FALLA.txt (por qué Tronscan da "confirm the correct parameters")');
  console.log('  - VERIFICACION-ESTADO.txt (resumen de vías probadas y próximos pasos)');
  console.log('  - VERIFICAR_AHORA.txt (pasos definitivos para verificar en OKLink; Submit manual tras CAPTCHA)');
  console.log('  - BYTECODE-MAINNET-REPORT.txt (informe comprobación real mainnet; ver check:bytecode:mainnet)');
  console.log('\nTras el upgrade, usa la nueva implementationAddress en Tronscan.');
  console.log('');
}

main();
