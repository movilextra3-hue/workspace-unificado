# Comprobación completa y siguientes pasos

Documento generado tras revisar configuración, mainnet y post-despliegue. Sirve para **garantizar que todo está correcto** y para **saber en qué parte del proceso estamos** y qué falta para continuar.

---

## 1. Comprobaciones realizadas (resultados)

### 1.1 Los 3 contratos en mainnet

| Contrato       | Dirección | Resultado |
|----------------|-----------|-----------|
| **Implementation** | `TYqRvxioNWBqVa2nJGog8RkYQrXQdPJwR3` | ✅ OK – TRC20TokenUpgradeable |
| **ProxyAdmin**     | `TVeVPZGiMc9GWQ8sQHvUwhfg19EDZt3UjZ` | ✅ OK – ProxyAdmin |
| **Proxy (token)**  | `TV4P3sVfSQULNnsCPyzLnofCbK6cwkHeDm` | ✅ OK – TransparentUpgradeableProxy |

**Comando:** `node scripts/check-mainnet-contracts.js` (usa `deploy-info.json` si existe).

### 1.2 Variables de entorno (.env)

- PRIVATE_KEY: presente, longitud correcta  
- TRON_PRO_API_KEY: presente  
- PROXY_ADMIN_ADDRESS: presente  
- TOKEN_NAME, TOKEN_SYMBOL, TOKEN_DECIMALS, TOKEN_SUPPLY: definidos  

**Comando:** `npm run check:env`

### 1.3 Configuración del proyecto

- **tronbox.js:** mainnet, compilador 0.8.34, optimizer runs 200, feeLimit 450 TRX.  
- **deploy-info.json:** existe y contiene tokenAddress (Proxy), implementationAddress, proxyAdminAddress.  
- **post-deploy:perfil:** ejecutado correctamente; imprime dirección del token y datos para Tronscan.  
- **prepare:verification:** ejecutado; generados `verification/` (TRC20TokenUpgradeable.sol, Initializable.sol, TransparentUpgradeableProxy.sol, ProxyAdmin.sol, verification-params.json).

---

## 2. En qué parte del proceso estamos

Resumen del flujo y estado actual:

| Fase | Estado | Nota |
|------|--------|------|
| Configuración (.env, tronbox) | ✅ Hecho | Listo para mainnet |
| Compilación (build/contracts) | ✅ Hecho | TronBox 0.8.34, optimizer 200 |
| Despliegue Implementation | ✅ Hecho | TYqRvxioNWBqVa2nJGog8RkYQrXQdPJwR3 |
| Despliegue ProxyAdmin | ✅ Hecho (reutilizado) | TVeVPZGiMc9GWQ8sQHvUwhfg19EDZt3UjZ |
| Despliegue Proxy | ✅ Hecho | TV4P3sVfSQULNnsCPyzLnofCbK6cwkHeDm |
| initialize() en Proxy | ✅ Hecho | Token con name, symbol, supply, owner |
| deploy-info.json | ✅ Actualizado | tokenAddress = Proxy actual |
| Verificación en Tronscan (código) | ⏳ Pendiente (manual) | Opcional pero recomendado |
| Perfil del token en Tronscan (logo, web) | ⏳ Pendiente (manual) | Para que se vea logo y sin alertas en wallets |

**Conclusión:** El token está **desplegado e inicializado** en mainnet. La dirección que deben usar usuarios y wallets es **`TV4P3sVfSQULNnsCPyzLnofCbK6cwkHeDm`**. Los pasos pendientes son **manuales en Tronscan** (verificar contratos y completar perfil del token).

---

## 3. Qué falta y cómo continuar

### 3.1 Verificación de contratos en Tronscan (recomendado)

**Objetivo:** Evitar alertas de “contrato no verificado” en wallets.

1. Ir a: https://tronscan.org/#/contracts/verify  
2. Verificar en este orden:  
   - **Token (Proxy):** dirección `TV4P3sVfSQULNnsCPyzLnofCbK6cwkHeDm`, nombre `TransparentUpgradeableProxy`, compilador 0.8.34, Optimization Yes, Runs 200. Subir `verification/TransparentUpgradeableProxy.sol`.  
   - **Implementation:** dirección `TYqRvxioNWBqVa2nJGog8RkYQrXQdPJwR3`, nombre `TRC20TokenUpgradeable`. Subir `verification/TRC20TokenUpgradeable.sol`.  
   - **ProxyAdmin** (opcional): dirección `TVeVPZGiMc9GWQ8sQHvUwhfg19EDZt3UjZ`, subir `verification/ProxyAdmin.sol`.  

Parámetros exactos: [VERIFICATION.md](../VERIFICATION.md) y `verification/verification-params.json`.

### 3.2 Perfil del token en Tronscan (logo y metadatos)

**Objetivo:** Que el token muestre logo, descripción y web como los tokens estándar.

1. Ejecutar de nuevo (si quieres ver los datos): `npm run post-deploy:perfil`  
2. Ir a: https://tronscan.org/#/tokens/create/TRC20  
3. Conectar la wallet owner.  
4. Contract address: `TV4P3sVfSQULNnsCPyzLnofCbK6cwkHeDm`  
5. Rellenar descripción, logo (URL), project website según la salida del script o [docs/TRONSCAN_DATOS_PEGAR.md](TRONSCAN_DATOS_PEGAR.md).  

Guía paso a paso: [docs/TRONSCAN_PERFIL_TOKEN.md](TRONSCAN_PERFIL_TOKEN.md).

### 3.3 Añadir token en wallets

Los usuarios deben añadir el token manualmente con la dirección del contrato: **`TV4P3sVfSQULNnsCPyzLnofCbK6cwkHeDm`**. Ver [docs/EVITAR_PROBLEMAS_WALLETS.md](EVITAR_PROBLEMAS_WALLETS.md) y [docs/WALLET_DISPLAY.md](WALLET_DISPLAY.md).

### 3.4 Opcional: listados (CoinGecko / CoinMarketCap)

- Copiar `token-metadata.json.example` a `token-metadata.json`.  
- Rellenar name, symbol, description, website, logo (URL), contractAddress = `TV4P3sVfSQULNnsCPyzLnofCbK6cwkHeDm`.  
- Usar al solicitar listing en CoinGecko o CoinMarketCap.

---

## 4. Resumen ejecutivo

| Aspecto | Estado |
|---------|--------|
| Contratos en mainnet (Implementation, Proxy, ProxyAdmin) | ✅ Los 3 correctos |
| Token inicializado (name, symbol, supply, owner) | ✅ Sí |
| .env y comprobaciones locales | ✅ Correctos |
| deploy-info.json y scripts post-deploy | ✅ Actualizados |
| Verificación de código en Tronscan | ⏳ Manual |
| Perfil del token (logo, web) en Tronscan | ⏳ Manual |
| Listados externos (CoinGecko, etc.) | ⏳ Opcional |

**Para continuar:** realizar los pasos manuales de las secciones 3.1 y 3.2 cuando quieras que el token se vea verificado y con perfil completo en Tronscan. El token ya es usable con la dirección **`TV4P3sVfSQULNnsCPyzLnofCbK6cwkHeDm`**.

---

## 5. Comandos útiles

```bash
# Comprobar los 3 contratos en mainnet
node scripts/check-mainnet-contracts.js

# Comprobar .env (sin mostrar valores)
npm run check:env

# Ver datos para perfil Tronscan
npm run post-deploy:perfil

# Regenerar archivos para verificación
npm run prepare:verification
```

Referencias: [ESTADO_MAINNET.md](ESTADO_MAINNET.md), [CHECKLIST_DESPLIEGUE_MAINNET.md](CHECKLIST_DESPLIEGUE_MAINNET.md), [POST-DEPLOY.md](../POST-DEPLOY.md).
