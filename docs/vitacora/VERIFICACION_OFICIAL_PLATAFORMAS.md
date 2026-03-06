# Verificación frente a documentación oficial de cada plataforma

Comprobación cruzada: datos del proyecto vs documentación oficial en web (TRON, TronGrid, TronScan, GitHub). Todo debe estar conectado, alineado, sincronizado y funcional.

---

## 1. TRON — Estándar TRC-20 y redes

**Fuente oficial:** https://developers.tron.network/docs/trc20-protocol-interface y https://developers.tron.network/docs/networks

| Requisito oficial | Documentación | En este proyecto | Estado |
|-------------------|---------------|------------------|--------|
| **Funciones obligatorias** | totalSupply(), balanceOf(), transfer(), transferFrom(), approve(), allowance() | `TRC20TokenUpgradeable.sol`: las seis implementadas | ✅ |
| **Eventos** | Transfer, Approval | event Transfer, event Approval en el contrato | ✅ |
| **Opcionales** | name, symbol, decimals | Variables públicas en el contrato | ✅ |
| **Mainnet API** | https://api.trongrid.io | `tronbox.js` fullHost, `deploy-upgradeable.js`, `upgrade.js`, `estimate-deploy-cost.js` | ✅ |
| **Mainnet Browser** | https://tronscan.org | Usado en post-deploy-perfil y docs | ✅ |
| **Chain ID mainnet** | 728126428 (decimal), 0x2b6653dc (hex) — [chainlist](https://chainid.network/chain/728126428/) | `POST-DEPLOY.md` tabla EIP-712; contrato usa `block.chainid` | ✅ |

---

## 2. TronGrid — API y autenticación

**Fuente oficial:** https://www.trongrid.io/ y https://developers.tron.network/docs/connect-to-the-tron-network

| Requisito oficial | Documentación | En este proyecto | Estado |
|-------------------|---------------|------------------|--------|
| **URL mainnet** | https://api.trongrid.io | Única red en `tronbox.js`; mismo host en todos los scripts | ✅ |
| **Cabecera API Key** | TRON-PRO-API-KEY | `deploy-upgradeable.js`, `upgrade.js`, `estimate-deploy-cost.js`, `initialize-v2.js`: headers `TRON-PRO-API-KEY` | ✅ |
| **API Key obligatoria** | Sin API key las peticiones pueden estar limitadas o bloqueadas | Scripts de mainnet exigen `TRON_PRO_API_KEY` en .env; mensaje claro si falta | ✅ |
| **Registro API Key** | https://www.trongrid.io/ (dashboard) | Enlazado en README, CLAVES_PEGAR, LISTO_AGREGA_LAS_CLAVES | ✅ |

---

## 3. TronScan — Perfil del token y verificación

**Fuente oficial:** TRON docs y uso estándar de TronScan (mainnet)

| Requisito / URL oficial | Documentación | En este proyecto | Estado |
|-------------------------|---------------|------------------|--------|
| **Registrar / crear perfil token TRC-20 (mainnet)** | https://tronscan.org/#/tokens/create/TRC20 | `post-deploy-perfil.js` imprime esta URL; docs (TRONSCAN_DATOS_PEGAR, POST-DEPLOY, etc.) la referencian | ✅ |
| **Verificación de contratos** | https://tronscan.org/#/contracts/verify | `prepare-verification.js` y docs/VERIFICATION.md | ✅ |
| **Logo** | TronScan pide URL de imagen (no subir archivo) | URL generada desde GitHub raw; `trc20-token.config.json` con `logoPathInRepo`; doc TRONSCAN_DATOS_PEGAR | ✅ |

---

## 4. GitHub — Repo y URL del logo

**Fuente:** Estructura real del repo en GitHub (rama master) y [GitHub Raw](https://docs.github.com/en/repositories/working-with-files/using-files/work-with-non-code-files)

| Requisito | Documentación / estándar | En este proyecto | Estado |
|-----------|--------------------------|------------------|--------|
| **Formato URL raw** | https://raw.githubusercontent.com/OWNER/REPO/REF/PATH | post-deploy-perfil.js construye: githubUser + githubRepo + branch + logoPathInRepo | ✅ |
| **Rama** | master (en este repo) | trc20-token.config.json branch "master"; push-a-github.ps1 hace push a origin master | ✅ |
| **Ruta del logo en repo** | Debe existir el archivo en esa ruta | En GitHub (master) el proyecto está en la raíz: logo en `assets/colateral-logo.webp`; config y script usan `assets/colateral-logo.webp` | ✅ |
| **URL funcional verificada** | Debe devolver 200 | https://raw.githubusercontent.com/movilextra3-hue/workspace-unificado/master/assets/colateral-logo.webp responde correctamente | ✅ |

---

## 5. Sincronización entre componentes

| Origen | Dato | Consumido por | Estado |
|--------|------|---------------|--------|
| .env | PRIVATE_KEY, TRON_PRO_API_KEY | deploy-upgradeable, upgrade, estimate-deploy-cost, tronbox (solo key) | ✅ |
| trc20-token.config.json | githubUser, githubRepo, branch, logoPathInRepo | post-deploy-perfil.js → URL logo | ✅ |
| deploy-info.json | tokenAddress (Proxy), implementationAddress, proxyAdminAddress | post-deploy-perfil (tokenAddress), upgrade.js (proxy, admin) | ✅ |
| build/contracts/*.json | bytecode, ABI | deploy-upgradeable, upgrade, estimate-deploy-cost, prepare-verification | ✅ |
| tronbox.js | fullHost https://api.trongrid.io, feeLimit 300000000 (300 TRX) | migrate:mainnet; scripts usan mismo host por código | ✅ |

---

## 6. Referencias oficiales enlazadas en el proyecto

| Tema | URL oficial | Dónde se cita en el proyecto |
|------|-------------|------------------------------|
| TRC-20 estándar | https://developers.tron.network/docs/trc20-protocol-interface | docs/ALINEACION_TRON_OFFICIAL.md |
| Redes TRON | https://developers.tron.network/docs/networks | docs/ALINEACION_TRON_OFFICIAL.md |
| TronGrid / API | https://developers.tron.network/reference | docs/ALINEACION_TRON_OFFICIAL.md |
| API Key | https://www.trongrid.io/ | README, CLAVES_PEGAR, LISTO_AGREGA_LAS_CLAVES, ENV_TEMPLATE |
| TronScan mainnet | https://tronscan.org | post-deploy-perfil, POST-DEPLOY, TRONSCAN_DATOS_PEGAR, VERIFICATION |
| Chain ID (TIP-474) | documentación TRON / chainlist 728126428 | POST-DEPLOY.md |

---

## 7. Requisitos exactos por plataforma (evitar rechazos)

Comprobación de que lo que pedimos en el proyecto coincide con lo que cada plataforma exige oficialmente:

| Plataforma | Requisito oficial | En este proyecto | Doc de referencia |
|------------|-------------------|------------------|-------------------|
| **TronScan — Verificación** | Compiler version, Optimization, Runs, License, Main Contract name; subir código (varios archivos o flatten si hay dependencias); 1 SPDX en flatten | tronbox.js: 0.8.34, optimizer enabled, runs 200; verification-params.json; VERIFICATION.md con flatten y License-Identifier | [VERIFICATION.md](VERIFICATION.md), [TRON verify](https://developers.tron.network/docs/contract-verification) |
| **TronScan — Perfil token** | Contract address (Proxy), logo = URL, description, website | tokenAddress; post-deploy-perfil imprime URL logo (GitHub raw); TRONSCAN_DATOS_PEGAR | [TRONSCAN_DATOS_PEGAR.md](TRONSCAN_DATOS_PEGAR.md) |
| **Trust Wallet — Listado** | logo.png 256×256 px PNG; info.json (name, type TRC20, symbol, decimals, description, website, explorer, id, links, tags); fee 500 TWT o 2.5 BNB; criterios aceptación (holders, CMC, audit, etc.) | LISTADO_WALLETS_IGUAL_QUE_USDT con requisitos exactos; LOGO_MAINNET: Trust exige PNG 256×256 | [LISTADO_WALLETS_IGUAL_QUE_USDT.md](LISTADO_WALLETS_IGUAL_QUE_USDT.md), [Trust requirements](https://developer.trustwallet.com/developer/new-asset/requirements) |
| **GitHub — URL logo** | URL raw: raw.githubusercontent.com/OWNER/REPO/REF/PATH; archivo existente en repo | trc20-token.config.json: branch master, logoPathInRepo assets/colateral-logo.webp; post-deploy-perfil construye la URL | [ALINEAMIENTO_GITHUB_Y_TOKEN.md](ALINEAMIENTO_GITHUB_Y_TOKEN.md) |

Si sigues los docs indicados, no incurres en solicitudes incorrectas; las correcciones posibles (p. ej. logo PNG 256×256 para Trust) están documentadas.

---

## 8. Resumen

- **TRON (TRC-20 y redes):** Contrato cumple el estándar; mainnet con api.trongrid.io y chainId correctos.
- **TronGrid:** URL y cabecera TRON-PRO-API-KEY alineadas con la documentación; API key exigida en mainnet.
- **TronScan:** URLs de perfil token y verificación de contratos correctas; logo vía URL (GitHub raw); verificación con parámetros de tronbox.js; flatten y License-Identifier documentados si falla.
- **Trust Wallet (listado):** Requisitos exactos (logo.png 256×256, info.json, explorer, criterios aceptación) en LISTADO_WALLETS_IGUAL_QUE_USDT.
- **GitHub:** Estructura del repo (master, assets en raíz) y URL raw del logo verificadas y corregidas en config y docs.
- **Documentación interna:** Referencias a `npm run listo` unificadas; sin referencias a scripts inexistentes (deploy:nile/mainnet).

Todo queda verificado frente a la documentación oficial de cada plataforma, conectado, alineado, sincronizado y funcional.
