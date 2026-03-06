# Ejemplificaciones y pruebas completas — Seguimiento en tiempo real

**Fecha:** 2026-03-02  
**Objetivo:** Ejecutar todo tipo de ejemplificaciones y pruebas de funcionamiento de absolutamente todo; seguimiento en tiempo real para detectar mejoras, fallos y errores a corregir.

---

## 1. Pruebas de build y calidad ✅

| Prueba | Comando | Resultado |
|--------|---------|-----------|
| Compilación (solc) | `npm run compile` | ✅ OK — 5 contratos compilados. |
| Compilación (TronBox) | `npm run compile:tronbox` | ✅ OK. |
| Lint Solidity | `npm run lint` | ✅ Sin errores. |
| Lint JavaScript | `npm run lint:js` | ✅ Sin errores. |
| Lint completo | `npm run lint:all` | ✅ OK (ESLint + Solhint + lint-otros-proyectos). |
| Tests unitarios | `npm test` | ✅ Todos pasan (TronBox test). |

---

## 2. Ejemplificación de scripts sin red ✅

| Script | Prueba | Resultado |
|--------|--------|-----------|
| **setup-env.js** | Ejecutar con .env ya existente | ✅ Mensaje "El archivo .env ya existe. No se sobrescribe." |
| **prepare-verification.js** | Ejecutar tras compilar | ✅ Crea verification/ con 4 .sol y verification-params.json; mensaje con URL Tronscan. |
| **post-deploy-perfil.js** | Ejecutar con deploy-info.json (ejemplo o real) | ✅ Imprime dirección token, URL Tronscan, descripción, logo (GitHub raw), website. |
| **deploy-upgradeable.js** | Ejecutar sin PRIVATE_KEY válida | ✅ Exit 1; mensaje: "Falta o PRIVATE_KEY inválido en .env (64 caracteres hex, sin 0x)". |
| **upgrade.js** | Ejecutar sin deploy-info.json | ✅ Exit 1; mensaje: "Falta deploy-info.json. Ejecutar deploy primero." |

---

## 3. Ejemplificación de scripts con red (estimate-deploy-cost) ✅ → 🔧 Corregido

| Prueba | Resultado inicial | Acción |
|--------|-------------------|--------|
| `node scripts/estimate-deploy-cost.js` | ❌ **TypeError: TronWeb is not a constructor** | **Corrección aplicada:** TronWeb v6 usa export nombrado. En todos los scripts que usan TronWeb se cambió `const TronWeb = require('tronweb')` por `const { TronWeb } = require('tronweb')`. |
| Tras corrección | ✅ Script ejecuta; muestra dirección, recursos, estimación de energía y TRX, recomendación de balance. | — |

**Archivos corregidos:** `scripts/estimate-deploy-cost.js`, `scripts/deploy-upgradeable.js`, `scripts/upgrade.js`, `scripts/initialize-v2.js`.

---

## 4. Cobertura de tests unitarios (TRC20TokenUpgradeable.test.js) ✅

| Área | Casos cubiertos |
|------|------------------|
| **Básico** | name, symbol, decimals; supply inicial al owner; cap y version tras initialize. |
| **Transfer** | transfer; dirección del token = proxy; transfer a address(0) y address(this) revert. |
| **Pausa** | pause/unpause; transfer revert cuando paused. |
| **Mint/Burn** | mint, burn, burnFrom, forceBurn; mint a 0/contract/blacklisted revert; burnFrom sin allowance revert. |
| **Freeze/Unfreeze** | freezeAddress, unfreezeAddress; freeze a 0/owner/ya frozen revert; unfreeze no frozen revert. |
| **Blacklist** | addBlacklist, removeBlacklist, destroyBlackFunds; add a 0/owner/ya blacklisted revert; remove no blacklisted revert; destroyBlackFunds no blacklisted revert. |
| **Allowance** | approve, allowance, transferFrom; increaseAllowance, decreaseAllowance; decrease por encima revert; transferFrom allowance insuficiente revert. |
| **Ownership** | proposeOwnership, acceptOwnership, cancelOwnershipTransfer; propose a 0/mismo owner revert; accept por no-pending revert; cancel sin pending revert. |
| **Recovery** | recoverTokens (revert cuando balance 0); recoverTokens a 0 revert; recoverToken(self) revert. |
| **Seguridad upgradeable** | initialize segunda vez revert. |
| **EIP-2612** | DOMAIN_SEPARATOR no cero; nonces; permit firma inválida revert. |
| **initializeV2 / cap** | initializeV2 fija version y cap; initializeV2 cap < totalSupply revert; mint por encima cap revert; setCap. |
| **Batch** | batchFreeze, batchUnfreeze; batchAddBlacklist, batchRemoveBlacklist; batchFreeze vacío revert. |
| **Aliases** | getOwner, isBlackListed, getBlackListStatus. |
| **ProxyAdmin** | upgrade solo owner; upgrade mantiene estado; transferOwnership; proposeOwnership/acceptOwnership. |

---

## 5. Verificación de artefactos y directorios ✅

| Elemento | Estado |
|----------|--------|
| build/contracts/*.json | ✅ Initializable, Migrations, ProxyAdmin, TransparentUpgradeableProxy, TRC20TokenUpgradeable. |
| verification/ (tras prepare-verification) | ✅ TRC20TokenUpgradeable.sol, Initializable.sol, TransparentUpgradeableProxy.sol, ProxyAdmin.sol, verification-params.json. |

---

## 6. Resumen de errores corregidos

| # | Descripción | Archivos | Solución |
|---|-------------|----------|----------|
| 1 | TronWeb v6 no expone constructor con `require('tronweb')`. | estimate-deploy-cost.js, deploy-upgradeable.js, upgrade.js, initialize-v2.js | Usar `const { TronWeb } = require('tronweb')`. |

---

## 7. Posibles mejoras identificadas (no bloqueantes)

| Mejora | Descripción |
|--------|-------------|
| **estimate-deploy-cost sin .env** | Si el usuario ejecuta sin PRIVATE_KEY, el script ya sale con mensaje claro; opcional: mostrar mensaje de "Ejecuta con PRIVATE_KEY y TRON_PRO_API_KEY para estimación en tiempo real" antes de exit. |
| **Tests en CI** | Incluir en CI (GitHub Actions o similar) `npm run compile`, `npm run lint:all`, `npm test` para garantizar que cada commit mantiene el estado verde. |
| **post-deploy-perfil** | Ya robusto: try/catch en deploy-info.json y validación de tokenAddress (aplicado en verificación anterior). |

---

## 8. Conclusión

- **Build, lint y tests:** Todos pasan; compilación con solc y con TronBox correctas.
- **Scripts sin red:** setup-env, prepare-verification, post-deploy-perfil se ejecutan correctamente; deploy y upgrade fallan con mensajes claros cuando faltan .env o deploy-info.
- **Error crítico detectado y corregido:** Import de TronWeb en 4 scripts para compatibilidad con TronWeb v6 (named export).
- **Tests unitarios:** Cobertura amplia de TRC20TokenUpgradeable y ProxyAdmin (funcionalidad, reverts, permit, initializeV2, batch, ownership).
- **Seguimiento en tiempo real:** Todas las ejecuciones se han realizado y verificado en esta sesión; no se han detectado más fallos tras la corrección de TronWeb.

El proyecto queda con todas las ejemplificaciones y pruebas ejecutadas y un error real corregido (TronWeb v6), listo para despliegue y uso en mainnet.
