# Comprobación: obligatorios, perfil y verificación

Informe generado con **comprobaciones de solo lectura** (sin gastar TRX ni tocar wallets).

---

## 1. Obligatorios (solo tú) — comprobaciones realizadas

| Comprobación | Resultado |
| ------ | ----------- |
| **check:env** | ✅ PRIVATE_KEY presente y formato correcto; TRON_PRO_API_KEY presente; PROXY_ADMIN_ADDRESS presente; TOKEN_NAME, TOKEN_SYMBOL, TOKEN_DECIMALS, TOKEN_SUPPLY definidos. |
| **deploy-info.json** | ✅ Existe; contiene tokenAddress, implementationAddress, proxyAdminAddress. |
| **Contratos en mainnet** | ✅ Los 3 contratos (Implementation, ProxyAdmin, Proxy) están en mainnet y responden en Tronscan. |

**Conclusión:** Lo obligatorio (credenciales, despliegue, deploy-info) está hecho. No se ejecutó ninguna transacción ni se modificó saldo.

---

## 2. Perfil del token en Tronscan — avance y lo que falta

### Comprobaciones realizadas (solo lectura)

| Comprobación | Resultado |
| ------ | ----------- |
| **check:perfil** | ✅ deploy-info con tokenAddress; config con description, websiteUrl, logoPathInRepo; URL del logo construida; archivo del logo existe (assets/colateral-logo.webp). |
| **post-deploy:perfil** | ✅ Datos listos para copiar/pegar (ver abajo). |

### Datos listos para pegar en Tronscan

- **URL del perfil:** <https://tronscan.org/#/tokens/create/TRC20>
- **Contract address:** `TV4P3sVfSQULNnsCPyzLnofCbK6cwkHeDm`
- **Description:** Token TRC-20 estable vinculado a USD en la red TRON. Compatible con wallets y exploradores estándar.
- **Logo (URL):** `https://raw.githubusercontent.com/movilextra3-hue/workspace-unificado/master/blockchain/trc20-token/assets/colateral-logo.webp`
- **Project website:** `https://github.com/movilextra3-hue/workspace-unificado`

### Lo que falta (solo acción manual en Tronscan)

1. Abrir <https://tronscan.org/#/tokens/create/TRC20> y **conectar la wallet owner** (la que desplegó el token).
2. Pegar **Contract address** = `TV4P3sVfSQULNnsCPyzLnofCbK6cwkHeDm`.
3. Pegar **Description**, **URL del logo** y **Project website** (los de arriba).
4. Pulsar **Guardar/Submit** en Tronscan.

### Cómo comprobar si el perfil ya está completado

- Abre la página del token: <https://tronscan.org/#/token20/TV4P3sVfSQULNnsCPyzLnofCbK6cwkHeDm>
- Si ves **logo**, **descripción** y **enlace a la web**, el perfil está completado.
- Si no ves logo ni descripción, repite los pasos de la sección anterior.

**Opcional:** `npm run perfil:tronscan:open` abre el navegador, rellena los campos y tú solo conectas la wallet y guardas.

---

## 3. Verificación de contratos en Tronscan — estado y sugerencias

### Comprobaciones realizadas (solo lectura)

| Comprobación | Resultado |
| ------ | ----------- |
| **Carpeta verification/** | ✅ Existe y contiene: TRC20TokenUpgradeable.sol, TRC20TokenUpgradeable-oklink.sol, TransparentUpgradeableProxy.sol, ProxyAdmin.sol, Initializable.sol, LEEME-TRONSCAN.txt, LEEME-OKLINK.txt, PARAMETROS-IMPLEMENTATION.txt, verification-params.json. |
| **Implementation (TYqRvxio...)** | ⏳ **No verificado** en Tronscan (verify_status = 0). |
| **Proxy y ProxyAdmin** | No comprobado por script; se asume mismo estado (verificación manual en Tronscan). |

### Sugerencias para completar la verificación

1. **Regenerar archivos (por si cambió algo):**  
   `npm run prepare:verification`  
   (solo escribe en `verification/`, no gasta TRX.)

2. **Verificar en Tronscan (manual):**
   - Ir a: <https://tronscan.org/#/contracts/verify>
   - **Token (Proxy)** — dirección `TV4P3sVfSQULNnsCPyzLnofCbK6cwkHeDm`:
     - Contract name: `TransparentUpgradeableProxy`
     - Subir: `verification/TransparentUpgradeableProxy.sol`
     - Compiler: 0.8.34, Optimization: Yes, Runs: 200
   - **Implementation** — dirección `TYqRvxioNWBqVa2nJGog8RkYQrXQdPJwR3`:
     - Contract name: `TRC20TokenUpgradeable`
     - Subir: `verification/TRC20TokenUpgradeable.sol`
     - Compiler: 0.8.34, Optimization: Yes, Runs: 200
     - Ver pasos detallados: [VERIFICAR_TYqRvxio_PASOS.md](VERIFICAR_TYqRvxio_PASOS.md)
   - **ProxyAdmin** (opcional) — dirección `TVeVPZGiMc9GWQ8sQHvUwhfg19EDZt3UjZ`:
     - Subir: `verification/ProxyAdmin.sol`

3. **Ayuda con CAPTCHA (opcional):**
   - `npm run verify:tronscan:open` — abre Tronscan y sube el archivo; tú resuelves el CAPTCHA y pulsas Verify.
   - `npm run verify:tronscan:2captcha` — igual pero usando 2captcha (requiere `CAPTCHA_2CAPTCHA_API_KEY` en .env).

4. **Comprobar si ya quedó verificado:**  
   `node scripts/check-contract-verified.js`  
   (solo consulta la API de Tronscan; si el Implementation está verificado, sale "VERIFICADO".)

---

## Resumen

- **Obligatorios:** ✅ Verificados sin tocar saldo ni wallets.
- **Perfil:** ✅ Todo listo en el repo; falta solo abrir Tronscan, pegar los datos y guardar.
- **Verificación:** ⏳ Carpeta `verification/` lista; falta verificar los contratos en Tronscan (manual o con verify:tronscan:open / 2captcha).

Cuando termines perfil y verificación, seguimos con listados (Trust Wallet, etc.) y lo demás.
