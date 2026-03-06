# Ejemplificación de funcionamiento y estado para lo pendiente

Comprobaciones ejecutadas para verificar que todo está correcto antes de continuar con el despliegue o tareas pendientes.

---

## Ajustes realizados para evitar fallos en el despliegue

- **desplegar-completar-token.js:** Comprobación al inicio: si faltan `PRIVATE_KEY` o `TRON_PRO_API_KEY` en .env, el script sale con error **antes** de ejecutar la compilación (evita esperar ~1 min de compile para luego fallar en verify).
- **deploy-upgradeable.js:** `MIN_BALANCE_TRX` subido de 80 a **200 TRX**, alineado con `verify-before-migrate-3.js`, para no permitir despliegue con margen justo.
- **Flujo migrate-3-safe:** Compile → verify (obligatorio) → migrate -f 3 solo si verify pasa; si verify falla, no se ejecuta migrate (no se gasta TRX).

---

## 1. Comprobaciones realizadas (sin gastar TRX)

| Paso | Comando | Resultado |
|------|---------|-----------|
| Compilación TVM | `npm run compile:tronbox` | OK — artefactos en `build/contracts/` (TRC20TokenUpgradeable, ProxyAdmin, TransparentUpgradeableProxy). |
| Tests | `npm test` | OK — tests de TronBox pasan. |
| Dry-run deploy | `npm run deploy:dry-run` o `node scripts/deploy-upgradeable.js --dry-run` | OK — construye las 3 transacciones (Implementation, ProxyAdmin, Proxy) sin enviar ninguna; mensaje: "DRY-RUN correcto. Las 3 transacciones se construyeron sin errores. No se gastó TRX." |
| Verificación previa a migrate -f 3 | `npm run verify:before-migrate-3` | Ejecuta correctamente: comprueba PRIVATE_KEY, TRON_PRO_API_KEY, PROXY_ADMIN_ADDRESS, balance (varias fuentes), energía, feeLimit. Si algo falla (ej. energía insuficiente), sale con código 1 y no se ejecuta migrate. |

---

## 2. Flujo correcto para no gastar TRX

1. **Preparar:** `npm run prepare:migrate-3` — crea/rellena .env y ejecuta la verificación.
2. **Verificar:** `npm run verify:before-migrate-3` — debe pasar (balance ≥ 200 TRX recomendado, energía o feeLimit suficientes, ProxyAdmin válido).
3. **Desplegar (completar token):** solo `npm run migrate-3-safe` — compila, verifica y, si la verificación pasa, ejecuta `tronbox migrate -f 3` con `MIGRATE_3_VERIFIED=1`.

No ejecutar nunca `tronbox migrate -f 3` (o `migrate -f 3 --network mainnet`) a mano en mainnet: la migración 3 comprueba `MIGRATE_3_VERIFIED === '1'` y lanza error si no está definida, así no se gasta TRX sin haber pasado la verificación.

---

## 3. Ejemplo de salida de verificación

```
=== VERIFICACIÓN PREVIA A tronbox migrate -f 3 (no se envía ninguna tx) ===

  [OK] PROXY_ADMIN_ADDRESS es un contrato en mainnet.
  Dirección wallet: T...
  Balance (máx. de 5 fuentes): XXXX.XX TRX
  Energía libre: ...
  Energía necesaria (migrate -f 3): 4,576,240 (Impl + Proxy + init)
  Coste estimado si pagas con TRX: XXX.XX TRX
  feeLimit en tronbox.js: 300 TRX por tx
```

Si hay fallos (balance bajo, energía/feeLimit insuficientes), se listan y el script sale con código 1. No se debe ejecutar `migrate -f 3` hasta corregir.

---

## 4. Ejemplo de salida de dry-run (deploy upgradeable)

```
Token: Colateral USD (USDT), owner: T...

=== DRY-RUN (no se envía ninguna transacción) ===
  1. Implementation: OK
  2. ProxyAdmin: OK
  3. Proxy (parámetros validados): OK

DRY-RUN correcto. Las 3 transacciones se construyeron sin errores. No se gastó TRX.
```

---

## 5. Checklist antes de lo pendiente (completar token en mainnet)

- [ ] `.env` con `PRIVATE_KEY`, `TRON_PRO_API_KEY`, `PROXY_ADMIN_ADDRESS` (y opcional `VERIFY_BALANCE_TRX` si la API muestra menos saldo del real).
- [ ] `npm run compile:tronbox` ejecutado (artefactos TVM en `build/contracts/`).
- [ ] `npm run verify:before-migrate-3` pasa sin errores (balance, energía/feeLimit, ProxyAdmin).
- [ ] `tronbox.js` con `mainnet.feeLimit: 300000000` (no bajar).
- [ ] Para ejecutar el despliegue que gasta TRX: solo `npm run migrate-3-safe` (no `tronbox migrate -f 3` directo).

---

## 6. Lo pendiente (a partir de aquí)

Una vez cumplido el checklist anterior:

1. **Si quieres completar el token (Implementation + Proxy reutilizando ProxyAdmin):**  
   Asegurar energía suficiente (delegada o TRX para quemar) y ejecutar `npm run migrate-3-safe`. El script hará compile → verify → migrate -f 3 solo si verify pasa.

2. **Después del despliegue:**  
   Inicializar el token si aplica (`initialize-v2.js`), verificar en Tronscan, preparar verificación de contrato y perfilar el token según `docs/CHECKLIST_DESPLIEGUE_MAINNET.md` y `POST-DEPLOY.md`.

Referencias: [NO_GASTAR_TRX_A_LO_PENDEJO.md](NO_GASTAR_TRX_A_LO_PENDEJO.md), [CHECKLIST_DESPLIEGUE_MAINNET.md](CHECKLIST_DESPLIEGUE_MAINNET.md), [RECUPERAR_DESPLIEGUE.md](RECUPERAR_DESPLIEGUE.md).
