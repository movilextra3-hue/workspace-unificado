# Revisión exhaustiva sin omisiones – TRC20 Token

**Fecha:** 3 de marzo de 2025  
**Alcance:** Todo el proyecto (contratos, migraciones, scripts, configuración, tests, flujos).  
**Criterio:** Revisión de máximo nivel, sin exclusiones ni suposiciones; detalle de cada hallazgo.

---

## Índice

1. [Contratos Solidity](#1-contratos-solidity)  
2. [Migraciones](#2-migraciones)  
3. [Scripts (uno por uno)](#3-scripts)  
4. [Configuración](#4-configuración)  
5. [Tests](#5-tests)  
6. [Flujos end-to-end](#6-flujos-end-to-end)  
7. [Errores restantes y correcciones aplicadas](#7-errores-restantes-y-correcciones-aplicadas)

---

## 1. Contratos Solidity

### 1.1 TRC20TokenUpgradeable.sol

| Líneas / Área | Revisión | Estado / Nota |
|---------------|----------|----------------|
| Inicialización | `initialize` con `initializer`; `_owner == address(0)`; `_decimals > 77`; `totalSupply = _initialSupply * 10 ** _decimals`. | OK. Overflow cubierto por Solidity 0.8 (revert). Si `_initialSupply` es enorme, revierte; no hace falta comprobación explícita adicional. |
| initializeV2 | `onlyOwner`, `reinitializer(2)`, `_cap < totalSupply`. | OK. |
| transfer / transferFrom / approve | Modificadores whenNotPaused, whenNotFrozen, whenNotBlacklisted. | OK. |
| increaseAllowance / decreaseAllowance | Aritmética en 0.8; en decreaseAllowance se comprueba `current < subtractedValue`. | OK. |
| Ownership en dos pasos | proposeOwnership, acceptOwnership, cancelOwnershipTransfer. | OK. |
| mint | onlyOwner, whenNotFrozen(to), whenNotBlacklisted(to), nonReentrant; comprobaciones to != 0, to != this; cap. | OK. |
| burnFrom | onlyOwner; _spendAllowance(account, msg.sender, amount). | OK. Semántica: el owner quema desde `account` usando el allowance que `account` dio al owner. |
| forceBurn | onlyOwner; account != 0. | OK. |
| freezeAddress / unfreezeAddress | No congelar owner; comprobaciones de estado. | OK. |
| addBlacklist / removeBlacklist / destroyBlackFunds | No blacklistear owner; comprobaciones. | OK. |
| permit (EIP-2612) | deadline, s en rango bajo, nonce, DOMAIN_SEPARATOR, ecrecover. | OK. |
| DOMAIN_SEPARATOR | name, "1", block.chainid, address(this). | OK. TRON mainnet chainId soportado. |
| recoverTokens | Solo tokens de address(this); nonReentrant. | OK. |
| recoverTRX | address(this).balance; call{value}. | OK. TVM compatible. |
| recoverToken | Evita tokenAddr == this; comprueba ok y, si data.length >= 32, decode bool. | **Nota:** Tokens que no devuelven bool (o devuelven vacío) pueden no revertir aunque falle el transfer; se considera limitación conocida con tokens no estándar. |
| setCap | newCap >= totalSupply. | OK. |
| batchFreeze / batchUnfreeze / batchAddBlacklist / batchRemoveBlacklist | Evitan address(0) y owner donde aplica; BatchEmpty. | OK. |
| _transfer / _approve / _spendAllowance / _burn | Validaciones y unchecked donde corresponde. | OK. |
| ReentrancyGuard | _NOT_ENTERED / _ENTERED; uso en mint y recover*. | OK. |
| Storage gap | __gap[47]. | OK. |
| Constructor | _disableInitializers(). | OK. |

### 1.2 Initializable.sol

| Área | Revisión | Estado |
|------|----------|--------|
| initializer | Condición correcta; _initializing y _initialized. | OK. |
| reinitializer(version) | _initialized >= version; version fijado. | OK. |
| _isConstructor() | address(this).code.length == 0. En proxy, delegatecall hace que address(this) sea el proxy (con código). | OK. |
| _disableInitializers() | _initialized = 255. | OK. |

### 1.3 TransparentUpgradeableProxy.sol

| Área | Revisión | Estado |
|------|----------|--------|
| Slots EIP-1967 | keccak256("eip1967.proxy.implementation") - 1 y mismo para admin. | OK. |
| Constructor | _logic != 0, _logic.code.length > 0, admin_ != 0. No se exige admin_.code.length > 0 (EOA como admin permitido). | OK. |
| _data | Si _data.length > 0, delegatecall; si no, no se llama init. | OK. |
| upgradeTo | Solo _admin(); comprueba nueva impl. | OK. |
| _fallback | delegatecall con assembly; manejo de revert. | OK. |

### 1.4 ProxyAdmin.sol

| Área | Revisión | Estado |
|------|----------|--------|
| Ownership | proposeOwnership, acceptOwnership, cancelOwnershipTransfer, transferOwnership. | OK. |
| upgrade | onlyOwner, nonReentrant; call a proxy.upgradeTo. | OK. |
| callProxy | onlyOwner, nonReentrant; call con data. | OK. |

### 1.5 Migrations.sol

| Área | Revisión | Estado |
|------|----------|--------|
| setCompleted | restricted (solo owner). | OK. |

---

## 2. Migraciones

### 2.1 1_initial_migration.js

- Despliega Migrations. Sin dependencias de env. OK.

### 2.2 2_deploy_trc20.js

| Punto | Revisión | Estado |
|-------|----------|--------|
| parseEnvDecimals | 0–255, Number.parseInt, NaN. | OK. |
| parseEnvSupply | Solo dígitos, trim. | OK. |
| Cuenta | initialOwner = accounts[0] (wallet de tronbox). | OK. |
| Proxy | impl.address, admin.address, '0x'. | OK. |
| deploy-info | Solo nile/shasta/mainnet; tokenAddress, implementationAddress, proxyAdminAddress. | OK. |

### 2.3 3_deploy_impl_and_proxy_reuse_admin.js

| Punto | Revisión | Estado |
|-------|----------|--------|
| MIGRATE_3_VERIFIED | mainnet exige '1'. | OK. |
| PROXY_ADMIN_ADDRESS | Obligatorio; trim. | OK. |
| feeLimit mainnet | >= 250000000; lectura desde tronbox.js. | OK. |
| parseEnvDecimals / parseEnvSupply | Misma lógica que migración 2. | OK. |
| ProxyAdmin.at(existingAdminAddress) | admin.address usado en deployInfo. | OK. |

---

## 3. Scripts

### 3.1 deploy-upgradeable.js

| Punto | Revisión | Estado |
|-------|----------|--------|
| PRIVATE_KEY / TRON_PRO_API_KEY | Validación 64 hex y presencia. | OK. |
| loadArtifact | Mensaje compile:tronbox. | OK. |
| TOKEN_DECIMALS / TOKEN_SUPPLY | Validación. | OK. |
| placeholderContract | Proxy con direcciones de contrato en validateBuild. | OK. |
| getBalanceAndResources | get/post con apiKey del cierre. | OK. |
| Despliegue | impl, admin, proxy con implAddress/adminAddress reales; initialize(name, symbol, decimals, initialSupply, ownerAddr). | OK. |
| deployInfo | deployedVia incluido. | OK. |
| decodeHexError | Uso en impl/admin/proxy result. | OK. |

### 3.2 upgrade.js

| Punto | Revisión | Estado |
|-------|----------|--------|
| deploy-info | tokenAddress, proxyAdminAddress; red mainnet. | OK. |
| Formato direcciones | Base58 / 41 hex. | OK. |
| contract_address | TronWeb lo rellena al construir la tx. Si en algún entorno no existiera, fromHex lanzaría. | **Corrección:** Comprobar que `implTx.contract_address` exista antes de fromHex y mensaje claro si falta. |

### 3.3 verify-before-migrate-3.js

| Punto | Revisión | Estado |
|-------|----------|--------|
| PRIVATE_KEY / TRON_PRO_API_KEY / PROXY_ADMIN_ADDRESS | Validación. | OK. |
| getcontract | body { value: proxyAdminAddr, visible: true }. API TRON correcta. | OK. |
| loadBytecodeSize | build/contracts; mensaje compile:tronbox. | OK. |
| Balance | Varias fuentes; toSun; VERIFY_BALANCE_TRX. | OK. |
| feeLimit / energía | Comprobaciones y mensajes. | OK. |

### 3.4 desplegar-completar-token.js

| Punto | Revisión | Estado |
|-------|----------|--------|
| ensureEnvExists / ensureProxyAdminInEnv | Crean/rellenan .env. | OK. |
| dotenv.config({ path: envPath }) | Antes de execSync. | OK. |
| Orden | compile:tronbox → verify → migrate con MIGRATE_3_VERIFIED=1. | OK. |

### 3.5 estimate-deploy-cost.js

| Punto | Revisión | Estado |
|-------|----------|--------|
| Mensaje compile | compile:tronbox. | OK. |
| get(pathname, apiKey) | https.get(opts, callback) con hostname/path. | OK. |
| Balance / recursos | Múltiples fuentes y parseBalancesFromV1. | OK. |

### 3.6 initialize-v2.js

| Punto | Revisión | Estado |
|-------|----------|--------|
| deploy-info | tokenAddress, network mainnet. | OK. |
| version / cap | version >= 2; cap "max" o BigInt. | OK. |
| tokenAddress | No se valida formato antes de tronWeb.contract. | **Corrección:** Validar formato TRON (base58 o 41 hex) y fallar pronto con mensaje claro. |

### 3.7 post-deploy-perfil.js

| Punto | Revisión | Estado |
|-------|----------|--------|
| .env manual | Regex simple; no sobrescribe process.env existente. Valores con "=" pueden ser incompletos. | Aceptable para uso actual (GITHUB_*, WEBSITE_URL). |
| deploy-info | tokenAddress obligatorio. | OK. |
| trc20-token.config.json | Opcional. | OK. |
| git remote | Fallback para githubUser/githubRepo. | OK. |

### 3.8 setup-env.js

| Punto | Revisión | Estado |
|-------|----------|--------|
| ENV_TEMPLATE → .env | Solo si no existe .env. | OK. |

### 3.9 check-api.js

| Punto | Revisión | Estado |
|-------|----------|--------|
| Dirección | PRIVATE_KEY o dirección fija. | OK. |
| Endpoints | get/post con y sin API key. | OK. |

### 3.10 verify-transaction-history.js

| Punto | Revisión | Estado |
|-------|----------|--------|
| gettransactioninfobyid | body { value: hash }. | OK. |
| ADDRESS | env o valor por defecto. | OK. |

### 3.11 fetch-tx.js

| Punto | Revisión | Estado |
|-------|----------|--------|
| Uso | Herramienta de consulta; txId por argv o por defecto. | OK. |

### 3.12 prepare-verification.js

| Punto | Revisión | Estado |
|-------|----------|--------|
| CONTRACTS_TO_VERIFY | Token, Initializable, Proxy, ProxyAdmin (sin Migrations). | OK. |
| verification-params | compiler 0.8.34, optimization, runs 200. | OK. |

### 3.13 compile-with-solc.js

| Punto | Revisión | Estado |
|-------|----------|--------|
| Salida | build/contracts; formato abi + evm.bytecode (EVM). | OK para uso alternativo; no usar para mainnet (usar compile:tronbox). |
| findImports | Dentro de contracts/. | OK. |
| Optimizer | runs 200, alineado con tronbox. | OK. |

---

## 4. Configuración

### 4.1 tronbox.js

| Punto | Revisión | Estado |
|-------|----------|--------|
| mainnet | privateKey, feeLimit 300000000, fullHost, network_id. | OK. |
| compilers | solc 0.8.34, optimizer 200. | OK. |
| Rutas | contracts, build/contracts, migrations. | OK. |

### 4.2 package.json

| Punto | Revisión | Estado |
|-------|----------|--------|
| listo / deploy:mainnet / deploy:dry-run | compile:tronbox antes de deploy. | OK. |
| migrate-3-safe | desplegar-completar-token.js. | OK. |
| prepare:migrate-3 | setup-env + verify (sin compilar). | OK. Quien use migrate-3-safe ya compila dentro. |
| engines | node >= 18. | OK. |

### 4.3 ENV_TEMPLATE.txt

| Punto | Revisión | Estado |
|-------|----------|--------|
| PROXY_ADMIN_ADDRESS | Valor por defecto. | OK. |
| TOKEN_SYMBOL | Comentario de que USDT es ejemplo. | OK. |

---

## 5. Tests

### 5.1 TRC20TokenUpgradeable.test.js

| Punto | Revisión | Estado |
|-------|----------|--------|
| before | Deploy impl, admin, proxy; initialize. | OK. |
| Casos | name/symbol, cap/version, supply, transfer, pause, mint/burn/freeze/blacklist. | OK. |
| Uso de artifacts | TRC20TokenUpgradeable, TransparentUpgradeableProxy, ProxyAdmin. | OK. |

---

## 6. Flujos end-to-end

| Flujo | Pasos | Estado |
|-------|--------|--------|
| Deploy completo (migración 2) | tronbox migrate → 1, 2; deploy-info en nile/shasta/mainnet. | OK. |
| Deploy completo (script) | compile:tronbox → deploy-upgradeable → 3 tx + initialize → deploy-info. | OK. |
| Completar token (migración 3) | migrate-3-safe: compile:tronbox → verify → migrate -f 3. | OK. |
| Upgrade | compile:tronbox → upgrade.js (deploy impl, ProxyAdmin.upgrade, actualizar deploy-info). | OK. |
| initializeV2 | deploy-info + compile:tronbox → initialize-v2.js [version] [cap]. | OK. |

---

## 7. Errores restantes y correcciones aplicadas

### 7.1 upgrade.js — contract_address indefinido

**Problema:** Si en algún cliente/versión TronWeb no se rellena `implTx.contract_address`, `tronWeb.address.fromHex(implTx.contract_address)` puede lanzar o dar resultado incorrecto.

**Corrección:** Comprobar que `implTx.contract_address` exista después de `sendRawTransaction` y, si no, lanzar un error explícito indicando revisar la tx en Tronscan.

### 7.2 initialize-v2.js — validación de tokenAddress

**Problema:** Si `deploy-info.json` tiene `tokenAddress` mal formado (typo, otro formato), el fallo llega tarde al llamar a TronWeb.

**Corrección:** Validar que `tokenAddress` sea base58 (T + 33 caracteres) o hex (41 + 40 hex) y, si no, salir con mensaje claro.

### 7.3 Resumen de hallazgos sin cambio de código

- **recoverToken:** Comportamiento con tokens que no devuelven bool documentado como limitación conocida.
- **post-deploy-perfil:** Parsing manual de .env aceptable para las variables usadas; para valores con "=" podría considerarse dotenv en el futuro.
- **estimate-deploy-cost get():** Uso de `https.get(opts, callback)` con `hostname`/`path` es válido en Node.

---

## Conclusión

- **Contratos:** Revisados al detalle; sin vulnerabilidades críticas; única nota la limitación en `recoverToken` con tokens no estándar.
- **Migraciones:** Validación de env y flujos correctos.
- **Scripts:** Dos mejoras aplicadas (upgrade.js e initialize-v2.js); resto coherente con mainnet y TVM.
- **Configuración y tests:** Alineados con el diseño y los flujos descritos.

Con las correcciones de los apartados 7.1 y 7.2, la revisión exhaustiva queda cerrada sin omisiones en el alcance definido.
