# Estado en mainnet – qué pasó y qué falta

Resumen comprobado en mainnet (Tronscan/APIs) y pasos pendientes.

---

## Los 3 contratos necesarios

En un token upgradeable hay **tres contratos**. Estado actual en mainnet:

| # | Rol | Dirección | Estado en mainnet |
|---|-----|-----------|-------------------|
| 1 | **Implementation** (lógica TRC20) | `TYqRvxioNWBqVa2nJGog8RkYQrXQdPJwR3` | ✅ OK – TRC20TokenUpgradeable |
| 2 | **Proxy** (dirección del token para usuarios) | `TV4P3sVfSQULNnsCPyzLnofCbK6cwkHeDm` | ✅ Desplegado, inicializado y **verificado** en Tronscan (verify_status: 2) |
| 3 | **ProxyAdmin** (hace upgrade del Proxy) | `TVeVPZGiMc9GWQ8sQHvUwhfg19EDZt3UjZ` | ✅ OK – reutilizado del .env |

- **Wallet / owner:** `TWYhXqeMMtEePYnk2WdhoyyvHWxA1ay9Gz` (creador).

**Estado actual:** Se desplegó un **nuevo** Proxy con `deploy:proxy-only`. La dirección del token (para usuarios y wallets) es **`TV4P3sVfSQULNnsCPyzLnofCbK6cwkHeDm`**. La antigua `TDUPqTHo1mCTMUxajReCrmEF9eS86ymNVh` quedó en FAIL y no se usa.

**Enlaces Tronscan – pestaña Code / contrato:**

| Contrato       | Contrato (overview) | Code (bytecode / verificación) |
|----------------|---------------------|---------------------------------|
| Implementation | [TRC20TokenUpgradeable](https://tronscan.org/#/contract/TYqRvxioNWBqVa2nJGog8RkYQrXQdPJwR3) | [Code](https://tronscan.org/#/contract/TYqRvxioNWBqVa2nJGog8RkYQrXQdPJwR3/code) |
| Proxy          | [TransparentUpgradeableProxy](https://tronscan.org/#/contract/TV4P3sVfSQULNnsCPyzLnofCbK6cwkHeDm) | [Code](https://tronscan.org/#/contract/TV4P3sVfSQULNnsCPyzLnofCbK6cwkHeDm/code) |
| ProxyAdmin     | [ProxyAdmin](https://tronscan.org/#/contract/TVeVPZGiMc9GWQ8sQHvUwhfg19EDZt3UjZ) | [Code](https://tronscan.org/#/contract/TVeVPZGiMc9GWQ8sQHvUwhfg19EDZt3UjZ/code) |

En **Code** se ve el bytecode y, si está verificado, el código fuente. El Proxy (token) está **verificado** (verify_status: 2 en API). Para verificar otros: [tronscan.org/#/contracts/verify](https://tronscan.org/#/contracts/verify).

---

## Qué pasó (comprobado)

1. **Implementation (1/3)**  
   - Contrato **TYqRvxioNWBqVa2nJGog8RkYQrXQdPJwR3** existe en mainnet.  
   - Nombre: `TRC20TokenUpgradeable`.  
   - Creador: `TWYhXqeMMtEePYnk2WdhoyyvHWxA1ay9Gz`.  
   - Métodos: `initialize`, `transfer`, `approve`, etc.

2. **Proxy (2/3)**  
   - La tx de creación del Proxy (hash `cea17e54...`) tiene **Result: FAIL**.  
   - La dirección `TDUPqTHo1mCTMUxajReCrmEF9eS86ymNVh` **no** tiene un Proxy válido desplegado.

3. **ProxyAdmin (3/3)**  
   - **TVeVPZGiMc9GWQ8sQHvUwhfg19EDZt3UjZ** existe en mainnet (nombre: `ProxyAdmin`).  
   - Creador: misma wallet. Métodos: `upgrade`, `callProxy`, `transferOwnership`, etc.  
   - Se reutilizó desde `.env` (PROXY_ADMIN_ADDRESS); no se desplegó de nuevo.

4. **Llamada a `initialize()`**  
   - Una transacción que llamaba al Proxy (para `initialize`) **revirtió** (REVERT).  
   - Sin `initialize()` con éxito, el Proxy no tiene name, symbol, decimals, supply ni owner del token configurados.

---

## Qué falta (pasos manuales opcionales)

- **Verificar contratos en Tronscan** (recomendado para evitar alertas en wallets): [tronscan.org/#/contracts/verify](https://tronscan.org/#/contracts/verify). Usar `verification/` generado con `npm run prepare:verification`.
- **Completar perfil del token en Tronscan** (logo, descripción, web): [tronscan.org/#/tokens/create/TRC20](https://tronscan.org/#/tokens/create/TRC20). Datos listos con `npm run post-deploy:perfil`.

---

## Verificación de los 3 contratos en mainnet

Comprobación realizada contra Tronscan/APIs:

| Contrato       | Dirección | Estado | Detalle |
|----------------|-----------|--------|---------|
| **Implementation** | `TYqRvxioNWBqVa2nJGog8RkYQrXQdPJwR3` | ✅ OK | Nombre: TRC20TokenUpgradeable. Creador: TWYhXqeMMtEePYnk2WdhoyyvHWxA1ay9Gz. Métodos: initialize, transfer, approve, etc. |
| **ProxyAdmin**     | `TVeVPZGiMc9GWQ8sQHvUwhfg19EDZt3UjZ` | ✅ OK | Nombre: ProxyAdmin. Creador: misma wallet. Métodos: upgrade, callProxy, transferOwnership. |
| **Proxy**           | `TV4P3sVfSQULNnsCPyzLnofCbK6cwkHeDm` | ✅ OK | Token (Proxy) desplegado e inicializado. Dirección pública del token. |

Para volver a comprobar en local (respeta límite de peticiones de Tronscan, ~3/s):

```bash
node scripts/check-mainnet-contracts.js
```

Enlaces: [Implementation](https://tronscan.org/#/contract/TYqRvxioNWBqVa2nJGog8RkYQrXQdPJwR3), [ProxyAdmin](https://tronscan.org/#/contract/TVeVPZGiMc9GWQ8sQHvUwhfg19EDZt3UjZ), [Proxy (token)](https://tronscan.org/#/contract/TV4P3sVfSQULNnsCPyzLnofCbK6cwkHeDm).

---

## Referencias

- Flujo de despliegue: `docs/DESPLIEGUE_FLUJO_UNICO.md`  
- Completar initialize si falló: `docs/COMPLETAR_INITIALIZE_SI_FALLO.md`  
- Checklist mainnet: `docs/CHECKLIST_DESPLIEGUE_MAINNET.md`
