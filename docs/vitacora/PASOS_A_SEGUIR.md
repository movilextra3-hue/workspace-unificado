# Lista de pasos a seguir (completar el token)

Sigue estos pasos **en orden**. Verifica cada uno antes de pasar al siguiente.

---

## Antes de gastar TRX (verificaciones sin costo)

1. **Tener .env en la raíz del proyecto**  
   Si no existe: `npm run setup` (crea .env desde plantilla con PROXY_ADMIN_ADDRESS ya puesta).

2. **Comprobar .env**  
   Debe tener:
   - `PRIVATE_KEY=` (tu clave privada, 64 caracteres hex, sin 0x)
   - `TRON_PRO_API_KEY=` (API key de https://www.trongrid.io/)
   - `PROXY_ADMIN_ADDRESS=` (una de las 3; si está vacío, el script `migrate-3-safe` la rellena con la recomendada)

3. **Compilar**  
   Ejecutar: `npm run compile`  
   Debe terminar sin errores (Initializable, Migrations, ProxyAdmin, TRC20TokenUpgradeable, TransparentUpgradeableProxy).

4. **Verificación previa (no gasta TRX)**  
   Ejecutar: `npm run verify:before-migrate-3`  
   Revisar la salida:
   - Si hay “FALLOS”: corregir lo que indique (balance, energía, PROXY_ADMIN_ADDRESS, feeLimit) y volver a ejecutar este paso hasta que salga “Verificación OK”.
   - Si sale “Verificación OK”: puedes pasar al paso 5.

5. **Comprobar tronbox.js**  
   En la raíz, en `tronbox.js`, en `networks.mainnet` debe estar: `feeLimit: 300000000`. No bajar ese valor.

---

## Despliegue (gasta TRX)

6. **Ejecutar un solo comando**  
   Cuando los pasos 1–5 estén OK, ejecutar:  
   `npm run migrate-3-safe`  
   Ese comando: compila, verifica de nuevo y, solo si la verificación pasa, ejecuta migrate -f 3 (despliega Implementation + Proxy + initialize).

7. **Comprobar resultado**  
   Al terminar sin error:
   - Se genera `deploy-info.json` en la raíz.
   - La dirección del token es la que aparece como `tokenAddress` (es la del Proxy).
   - Opcional: completar perfil del token en Tronscan (ver `docs/TRONSCAN_PERFIL_TOKEN.md`).

---

## Resumen rápido

| Paso | Qué hacer | ¿Gasta TRX? |
| ---- | --------- | ----------- |
| 1 | Tener .env (`npm run setup` si no existe) | No |
| 2 | Comprobar PRIVATE_KEY, TRON_PRO_API_KEY, PROXY_ADMIN_ADDRESS en .env | No |
| 3 | `npm run compile` | No |
| 4 | `npm run verify:before-migrate-3` hasta que diga OK | No |
| 5 | Comprobar feeLimit 300000000 en tronbox.js | No |
| 6 | `npm run migrate-3-safe` | **Sí** (solo si el paso 4 pasó) |
| 7 | Revisar deploy-info.json y dirección del token | No |

**Importante:** No ejecutes `tronbox migrate -f 3` directo. Solo `npm run migrate-3-safe` después de que el paso 4 salga bien.
