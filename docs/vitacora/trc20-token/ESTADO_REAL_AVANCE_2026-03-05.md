# Estado real de avance — comprobable (2026-03-05)

**Origen de los datos:** consulta en vivo a la API de Tronscan y revisión de archivos del repositorio. Sin suposiciones.

**Actualización 2026-03-06:** Verificación Implementation enviada en OKLink (verify:oklink:playwright, Submit OK 22:42). Tronscan sigue mostrando verify_status=0 (OKLink y Tronscan son exploradores distintos). Ver docs/vitacora/VITACORA.md.

---

## 1. Blockchain TRON (mainnet) — API Tronscan

Consultas realizadas el 2026-03-05 a:
`https://apilist.tronscanapi.com/api/contract?contract=<address>`

### 1.1 Token (Proxy) — `TV4P3sVfSQULNnsCPyzLnofCbK6cwkHeDm`

| Campo | Valor (API) |
|-------|-------------|
| **verify_status** | **2** (verificado) |
| **name** | TransparentUpgradeableProxy |
| **is_proxy** | true |
| **proxy_implementation** | TYqRvxioNWBqVa2nJGog8RkYQrXQdPJwR3 |
| **date_created** | 1772601846000 (timestamp) |
| **creator** | TWYhXqeMMtEePYnk2WdhoyyvHWxA1ay9Gz |
| **balance** | 0 TRX |

### 1.2 Implementation — `TYqRvxioNWBqVa2nJGog8RkYQrXQdPJwR3`

| Campo | Valor (API) |
|-------|-------------|
| **verify_status** | **0** (no verificado) |
| **name** | TRC20TokenUpgradeable |
| **redTag** | "Suspicious" (Tronscan marca no verificados así) |
| **is_proxy** | false |
| **date_created** | 1772598465000 |
| **creator** | TWYhXqeMMtEePYnk2WdhoyyvHWxA1ay9Gz |
| **balance** | 0 TRX |

### 1.3 ProxyAdmin — `TVeVPZGiMc9GWQ8sQHvUwhfg19EDZt3UjZ`

| Campo | Valor (API) |
|-------|-------------|
| **verify_status** | **2** (verificado) |
| **name** | ProxyAdmin |
| **date_created** | 1772543988000 (el más antiguo de los tres) |
| **creator** | TWYhXqeMMtEePYnk2WdhoyyvHWxA1ay9Gz |
| **balance** | 0 TRX |

**Resumen verificaciones:** Proxy ✅ | Implementation ❌ | ProxyAdmin ✅

---

## 2. Repositorio (blockchain/trc20-token)

### 2.1 Direcciones guardadas

- **abi/addresses.json** (updatedAt 2026-03-04T09:21:30.166Z): tokenAddress, implementationAddress, proxyAdminAddress — coinciden con las de la API.
- **abi/token-info.json**: name "Colateral USD", symbol "USDT", decimals 6 — metadata del token (lo que se quiere mostrar); no es lo que devuelve la blockchain para el contrato Implementation (ahí name/symbol aparecen como la dirección por no estar verificado).

### 2.2 Carpeta `verification/`

- **No existe** en el repo (búsqueda `**/verification/*` en trc20-token: 0 archivos).
- Se genera con `npm run prepare:verification` (script prepare-verification.js). No está versionada; hay que ejecutar el comando para tener los .sol y parámetros para Tronscan.

### 2.3 deploy-info.json

- No está en `blockchain/trc20-token` (probablemente en .gitignore). Otras carpetas del workspace referencian `trc20-token/deploy-info.json` con las mismas direcciones.

### 2.4 Documento ESTADO_MAINNET.md

- No existe en docs/ ni en la raíz del proyecto trc20-token (referenciado en otros docs pero el archivo no está).

---

## 3. Apps RTSP — descartadas de pendientes

**Según interacciones pasadas:** las apps RTSP (rtsp-webcam, rtsp-virtual-webcam) se dieron por **terminadas** y se descartaron de la lista de pendientes. Queda **documentado** que no forman parte del estado de avance a seguir; no se listan como tareas abiertas.

---

## 4. Resumen en una tabla

| Área | Comprobación | Resultado |
|------|--------------|-----------|
| Proxy (token) en mainnet | API Tronscan | Verificado (verify_status=2) |
| Implementation en mainnet | API Tronscan | No verificado (verify_status=0), redTag "Suspicious" |
| ProxyAdmin en mainnet | API Tronscan | Verificado (verify_status=2) |
| Direcciones en repo | abi/addresses.json | Coinciden con blockchain |
| Carpeta verification/ | Sistema de archivos | No existe; se genera con npm run prepare:verification |
| deploy-info.json en trc20-token | Sistema de archivos | No presente (gitignore o no generado) |
| ESTADO_MAINNET.md | Sistema de archivos | No existe |
| Apps RTSP | Interacciones pasadas | **Terminadas; descartadas de pendientes y documentado.** |

---

## 5. Cómo reproducir la comprobación

1. **Contratos en mainnet:**  
   `GET https://apilist.tronscanapi.com/api/contract?contract=TV4P3sVfSQULNnsCPyzLnofCbK6cwkHeDm` (y sustituir por Implementation y ProxyAdmin).  
   Revisar en la respuesta JSON: `data[0].verify_status` (2 = verificado, 0 = no verificado).

2. **Carpeta verification/:**  
   En `blockchain/trc20-token`: `dir verification` o `ls verification` — si no existe, ejecutar `npm run prepare:verification`.

3. **Apps RTSP:** Consideradas terminadas y descartadas de pendientes (documentado en interacciones pasadas). No forman parte del avance pendiente.

---

*Documento generado a partir de datos de API y archivos del repositorio. Actualizar al repetir las comprobaciones.*
