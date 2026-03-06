# Cuántos contratos se despliegan y procedimiento de verificación

Resumen para **migrate-3-safe** (completar token reutilizando ProxyAdmin).

---

## 1. Cuántos contratos se despliegan (migrate-3-safe)

Con **npm run migrate-3-safe** la migración 3 hace lo siguiente:

| # | Acción | Contrato | Dirección (tras deploy) |
|---|--------|----------|-------------------------|
| 1 | **Desplegar** | TRC20TokenUpgradeable (Implementation) | `implementationAddress` en deploy-info.json |
| 2 | **No desplegar** (reutilizar) | ProxyAdmin | `proxyAdminAddress` (la de .env, ya existente en mainnet) |
| 3 | **Desplegar** | TransparentUpgradeableProxy (Proxy) | `tokenAddress` en deploy-info.json (= dirección pública del token) |
| 4 | **Llamada** (no es deploy) | initialize(name, symbol, decimals, initialSupply, owner) en el token vía Proxy | — |

**Resumen:** se **despliegan 2 contratos nuevos** (Implementation y Proxy). La ProxyAdmin **no se despliega** en este paso; se reutiliza la indicada en PROXY_ADMIN_ADDRESS. Tras el deploy se genera **deploy-info.json** con las tres direcciones: tokenAddress (Proxy), implementationAddress, proxyAdminAddress.

---

## 2. Contratos que debes verificar en Tronscan

En total hay **3 contratos** involucrados. En Tronscan debes verificar **cada uno con su dirección** (la que corresponda en tu deploy):

| # | Contrato | Dirección a usar | Archivo(s) principal(es) |
|---|----------|------------------|---------------------------|
| 1 | **Proxy (Token)** | `tokenAddress` de deploy-info.json | TransparentUpgradeableProxy.sol |
| 2 | **Implementation** | `implementationAddress` de deploy-info.json | TRC20TokenUpgradeable.sol + Initializable.sol (si lo pide el verificador) |
| 3 | **ProxyAdmin** | `proxyAdminAddress` de deploy-info.json | ProxyAdmin.sol |

La **dirección que deben usar usuarios y wallets** es solo **tokenAddress** (Proxy). Las otras dos son para verificación y para upgrades.

---

## 3. Procedimiento para verificar (en orden)

### Paso 1 — Preparar el paquete de verificación (local)

En la raíz del proyecto (`blockchain/trc20-token`):

```bash
npm run prepare:verification
```

Esto crea (o actualiza) la carpeta **verification/** con:

- TRC20TokenUpgradeable.sol  
- Initializable.sol  
- TransparentUpgradeableProxy.sol  
- ProxyAdmin.sol  
- verification-params.json (compilador 0.8.34, optimization enabled, runs 200)

**Requisito:** que exista **deploy-info.json** (se genera al ejecutar migrate-3-safe). Si aún no has desplegado, primero ejecuta `npm run migrate-3-safe` y luego este paso.

---

### Paso 2 — Abrir Tronscan (mainnet)

- **URL:** https://tronscan.org/#/contracts/verify  
- Comprobar que la red seleccionada sea **Mainnet** (esquina superior derecha).

---

### Paso 3 — Verificar cada contrato (orden recomendado)

Para **cada** fila de la tabla anterior:

1. En Tronscan → Contract Verify, pegar la **dirección** del contrato (tokenAddress, implementationAddress o proxyAdminAddress según el caso).
2. Subir el **código** correspondiente (archivo .sol; para Implementation, TRC20TokenUpgradeable.sol y, si lo pide la web, Initializable.sol).
3. Indicar **parámetros de compilación** (deben coincidir con tronbox.js):
   - **Compiler:** Solidity 0.8.34  
   - **Optimization:** Enabled  
   - **Runs:** 200  
   - **License:** MIT o **None** (si Tronscan no ofrece MIT)  
4. Enviar la verificación.

**Orden recomendado en la doc:** 1) ProxyAdmin, 2) Implementation (TRC20TokenUpgradeable + Initializable si aplica), 3) Proxy. Así las dependencias quedan enlazadas en Tronscan.

---

### Paso 4 — Si Tronscan pide “flatten”

Si el verificador no admite varios archivos o subdirectorios:

1. Generar un único .sol aplanado (flatten) con TronBox o la herramienta que uses. Ver [How to verify contracts with subdirectory structures](https://support.tronscan.org/hc/en-us/articles/19500651417241-How-to-verify-contracts-with-subdirectory-structures).
2. Dejar solo **un** SPDX-License-Identifier en el archivo aplanado (evitar duplicados).
3. Subir ese archivo en https://tronscan.org/#/contracts/verify con los mismos parámetros (0.8.34, optimization enabled, runs 200, MIT).

---

## 4. Resumen rápido

| Pregunta | Respuesta |
|----------|-----------|
| ¿Cuántos contratos **se despliegan** con migrate-3-safe? | **2** (Implementation + Proxy). ProxyAdmin se reutiliza, no se despliega. |
| ¿Cuántos contratos **hay que verificar** en Tronscan? | **3** (Proxy, Implementation, ProxyAdmin), cada uno con su dirección de deploy-info.json. |
| ¿Qué comando prepara los archivos para verificar? | `npm run prepare:verification` (después de tener deploy-info.json). |
| ¿Dónde se verifica? | https://tronscan.org/#/contracts/verify (mainnet). |
| Parámetros de compilación | Solidity 0.8.34, Optimization enabled, Runs 200, License MIT o None. |

Detalle completo: [VERIFICATION.md](VERIFICATION.md).
