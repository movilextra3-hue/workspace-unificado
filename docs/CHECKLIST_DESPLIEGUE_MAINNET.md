# Checklist para Desplegar Token en TRON Mainnet

Este documento responde al checklist solicitado en GitHub para verificación de configuración TRON y despliegue en mainnet.

---

## 1. Configuración de Red 🌐

| Item | Estado | Dónde |
|------|--------|--------|
| **RPC Node** | ✅ | `https://api.trongrid.io` (TronGrid oficial). Configurado en `tronbox.js` y en todos los scripts de deploy (`scripts/deploy-upgradeable.js`, `upgrade.js`, etc.). |
| **Chain ID** | ✅ | Mainnet: **728126428** (hex: `0x2b6653dc`). Ver `POST-DEPLOY.md` y EIP-712 en `contracts/TRC20TokenUpgradeable.sol`. (Algunas fuentes citan 728126660; este proyecto usa 728126428 según documentación TRON y TIP-474.) |
| **Network** | ✅ | **mainnet** únicamente (NO testnet). Red única en `tronbox.js`; scripts sin variantes Nile/Shasta. |
| **Gas / Fee limit** | ✅ | `feeLimit: 1e8` (100 TRX máx. por tx) en `tronbox.js`. Despliegue: 4 transacciones; estimación en tiempo real con `npm run estimate:deploy`. |

---

## 2. Smart Contract 📝

| Item | Estado | Dónde |
|------|--------|--------|
| **Estándar TRC-20** | ✅ | Contrato principal: `contracts/TRC20TokenUpgradeable.sol`. Alineado con documentación oficial (ver `docs/ALINEACION_TRON_OFFICIAL.md`). |
| **name(), symbol(), decimals()** | ✅ | Implementados en `TRC20TokenUpgradeable.sol`. |
| **totalSupply** | ✅ | Correcto; inicializado en `initialize()`. |
| **balanceOf() y transfer()** | ✅ | Implementados; `transfer` con bloqueo a `address(0)` y `address(this)`. |
| **Auditoría / revisión** | ✅ | `SECURITY.md` actualizado; checklist de medidas (CEI, ownership, recoverTokens, etc.). Slither/Solhint documentados. |

**Contratos del proyecto:**

- `contracts/TRC20TokenUpgradeable.sol` — Implementación del token (upgradeable).
- `contracts/TransparentUpgradeableProxy.sol` — Proxy; la **dirección del token** es la del Proxy.
- `contracts/ProxyAdmin.sol` — Admin del proxy.
- `contracts/Initializable.sol`, `contracts/Migrations.sol` — Soporte.

---

## 3. Wallet/Account 💰

| Item | Estado | Cómo |
|------|--------|------|
| **TRX para fees** | ✅ | Script `npm run estimate:deploy` estima coste en tiempo real. Recomendado: 400–500 TRX para el despliegue completo. |
| **Private key segura** | ✅ | Solo en `.env` (en `.gitignore`); no subida a Git. Ver `SECURITY.md` y `docs/CLAVES_PEGAR.md`. |
| **Address configurada** | ✅ | Derivada de `PRIVATE_KEY` en `.env`; usada por todos los scripts. |
| **2FA en gestor de llaves** | ⚠️ | Responsabilidad del usuario; recomendado en la cuenta que posee la wallet. |

---

## 4. Configuración en Código ⚙️

**TronWeb (mainnet + API key):**

```javascript
// scripts/deploy-upgradeable.js (ejemplo real del repo)
const MAINNET = { fullHost: 'https://api.trongrid.io' };
const tronWeb = new TronWeb({
  fullHost: MAINNET.fullHost,
  privateKey: process.env.PRIVATE_KEY,
  headers: { 'TRON-PRO-API-KEY': process.env.TRON_PRO_API_KEY }
});
```

**Verificar mainnet:**  
Todos los scripts usan únicamente `https://api.trongrid.io`; no hay rutas a testnets.

**Archivos de configuración:**

- **Red / build:** `tronbox.js` (mainnet, fullHost, feeLimit, compilador).
- **Variables de entorno:** `.env` (no se sube; plantilla: `ENV_TEMPLATE.txt`). Creación desde plantilla: `npm run setup` o `npm run postinstall`.
- **Metadata del token (GitHub, logo, web):** `trc20-token.config.json` (opcional). Ejemplo: `trc20-token.config.json.example`.

---

## 5. Verificaciones Pre-Deployment 🔍

| Item | Estado |
|------|--------|
| Contrato sin vulnerabilidades conocidas | ✅ Revisión estática (Solhint, Slither documentado en SECURITY.md). |
| Sin acceso admin desprotegido | ✅ ProxyAdmin y owner; patrón transparent proxy. |
| Límites de gas / fee | ✅ feeLimit 1e8 por tx; estimación con `npm run estimate:deploy`. |
| Fees presupuestadas | ✅ Documentado en README y en este checklist. |

---

## 6. Deployment 🚀

| Item | Estado | Nota |
|------|--------|------|
| Deploy en testnet primero | ❌ No aplicable | Este proyecto está **configurado solo para mainnet** (requisito del repo). No se usan Shasta/Nile. |
| Deploy en mainnet | ✅ | Un solo comando: `npm run listo` (compila + despliega). O: `npm run compile` y `node scripts/deploy-upgradeable.js`. |
| Guardar receipt | ✅ | Se escribe `deploy-info.json` con tokenAddress (Proxy), implementation, proxyAdmin, red, etc. |

**Scripts de deployment:**

- `scripts/deploy-upgradeable.js` — Despliegue completo (Implementation + ProxyAdmin + Proxy + `initialize()`).
- `scripts/upgrade.js` — Actualización de la implementación (post-despliegue).
- `scripts/initialize-v2.js` — Inicialización de lógica v2 si se añade en upgrade.

---

## 7. Post-Deployment ✨

| Item | Estado | Dónde |
|------|--------|--------|
| Verificar en TronScan | ✅ | https://tronscan.org/ con `tokenAddress` de `deploy-info.json`. |
| Suministro total correcto | ✅ | Comprobar en TronScan o con llamada a `totalSupply()`. |
| Tokens no atascados | ✅ | Lógica con `recoverTokens` y bloqueos en `transfer` (ver SECURITY.md). |
| Publicar contrato en TronScan | ✅ | Guía en `docs/TRONSCAN_DATOS_PEGAR.md`, `docs/TRONSCAN_PERFIL_TOKEN.md`; datos listos con `npm run post-deploy:perfil`. |

---

## 8. Seguridad 🔒

| Item | Estado |
|------|--------|
| SECURITY.md actualizado | ✅ |
| Contacto de seguridad | ✅ (texto en SECURITY.md: reportar vulnerabilidades en privado). |
| Sin secrets en código | ✅ Claves y API key solo en `.env` (gitignored). |
| Variables de entorno para sensibles | ✅ `PRIVATE_KEY`, `TRON_PRO_API_KEY`; ver `ENV_TEMPLATE.txt`. |

---

## 📁 Respuesta a “¿Qué necesito ver en tu repo?”

### Repositorio

- **Nombre del repo (en este contexto):** monorepo `workspace-unificado`; submódulo/carpeta del token: **`blockchain/trc20-token`**.
- **Ruta típica en disco:** `e:\workspace-unificado\blockchain\trc20-token` (o equivalente según clonación).

### Archivos principales

| Solicitud | Archivos en el repo |
|-----------|----------------------|
| **Archivo de configuración** | `ENV_TEMPLATE.txt` (plantilla para `.env`). `trc20-token.config.json` (metadata token/GitHub). `trc20-token.config.json.example`. **No** hay `.env` en Git (está en `.gitignore`). |
| **Smart Contract** | `contracts/TRC20TokenUpgradeable.sol` (token TRC-20 upgradeable). Además: `contracts/TransparentUpgradeableProxy.sol`, `contracts/ProxyAdmin.sol`, `contracts/Initializable.sol`, `contracts/Migrations.sol`. |
| **Scripts de deployment** | `scripts/deploy-upgradeable.js` (deploy completo mainnet). `scripts/upgrade.js`, `scripts/initialize-v2.js`. `scripts/estimate-deploy-cost.js` (estimación de coste). `scripts/post-deploy-perfil.js` (datos para TronScan). |
| **Configuración TRON** | `tronbox.js` (red mainnet, fullHost `https://api.trongrid.io`, feeLimit, compilador). Uso de `TRON-PRO-API-KEY` en scripts: `scripts/deploy-upgradeable.js`, `scripts/upgrade.js`, `scripts/estimate-deploy-cost.js`, `scripts/initialize-v2.js`. |

### Comandos útiles para auditoría

```bash
cd blockchain/trc20-token   # o la ruta donde esté el token
npm install                 # crea .env desde plantilla si no existe
npm run compile              # compila contratos
npm run estimate:deploy      # estimación de coste en tiempo real (requiere .env con PRIVATE_KEY y TRON_PRO_API_KEY)
npm run listo                # compila y despliega en mainnet (requiere .env completo)
npm run post-deploy:perfil   # tras deploy: imprime datos para TronScan
```

### Documentación de referencia

- `README.md` — Visión general y pasos.
- `SECURITY.md` — Seguridad, Slither, Solhint, contacto.
- `docs/ALINEACION_TRON_OFFICIAL.md` — Alineación con TRC-20 y TronGrid.
- `docs/CLAVES_PEGAR.md`, `LISTO_AGREGA_LAS_CLAVES.md` — Dónde y cómo poner claves.
- `POST-DEPLOY.md` — Checklist post-despliegue, chainId, verificación.
- `docs/TRONSCAN_DATOS_PEGAR.md` — Datos para completar perfil del token en TronScan.
- `docs/ALINEAMIENTO_GITHUB_Y_TOKEN.md` — Repo, rama, push (PAT), URL del logo y orden operativo.
- `docs/GITHUB_PUSH.md`, `docs/PASOS_TOKEN_GITHUB.md` — Cómo hacer push a GitHub (PAT).

---

Con este checklist y la tabla de archivos se puede hacer una **verificación completa** de la configuración TRON y del despliegue en mainnet en este repositorio.
