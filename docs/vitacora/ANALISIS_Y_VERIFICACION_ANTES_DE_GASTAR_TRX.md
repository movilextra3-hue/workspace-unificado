# Análisis y verificación antes de gastar TRX (migrate -f 3)

**Objetivo:** No enviar ninguna transacción hasta que todas las comprobaciones pasen. Evitar repetir fallos por energía insuficiente o configuración incorrecta.

---

## Qué salió mal antes (para no repetirlo)

1. **OUT_OF_ENERGY en el deploy de Implementation:** La cuenta no tenía suficiente energía; se quemó el fee_limit por tx y la tx falló igual. El contrato no se guardó.
2. **feeLimit por tx:** En TRON, si la energía que necesita la tx supera lo que puedes pagar con ese límite (fee_limit × precio energía), la tx falla y el TRX se consume. En este proyecto **tronbox.js** usa **300 TRX** (300000000 sun) por tx para deploy.
3. **No se comprobó antes:** No había verificación obligatoria de balance, energía y validez de ProxyAdmin antes de ejecutar.

---

## Comprobaciones que se hacen ahora (sin gastar TRX)

El script **`npm run verify:before-migrate-3`** hace lo siguiente. **No envía ninguna transacción.**

| Comprobación | Qué hace |
| ------------ | -------- |
| **PRIVATE_KEY** | Existe en .env y es 64 caracteres hex. |
| **TRON_PRO_API_KEY** | Existe (recomendado en mainnet). |
| **PROXY_ADMIN_ADDRESS** | Existe en .env. |
| **ProxyAdmin es contrato** | Llama a la API getcontract en mainnet; si la dirección no es un contrato, falla. |
| **Compilación** | Existen build de TRC20TokenUpgradeable y TransparentUpgradeableProxy (npm run compile). |
| **Balance** | Balance ≥ 200 TRX (recomendado). |
| **Energía / feeLimit** | Estima energía necesaria para Implementation + Proxy + initialize. Si no tienes energía suficiente, comprueba que con el feeLimit actual (300 TRX/tx en tronbox.js) se pueda pagar el deploy de Implementation; si no, el script falla y pide subir feeLimit o delegar energía. |
| **Energía + TRX** | Si no hay energía libre suficiente, exige balance suficiente para pagar la energía estimada + margen. |

Si **cualquiera** de estas comprobaciones falla, el script termina con **código de salida 1** y no se debe ejecutar `tronbox migrate -f 3`.

---

## Cómo completar el deploy sin malgastar TRX

**Un solo comando** hace compilación + verificación (sin gastar) + deploy. Si la verificación falla, el deploy no se ejecuta y no se gasta TRX.

```bash
npm run migrate-3-safe
```

1. Compila (`npm run compile`).
2. Ejecuta **todas** las comprobaciones (`verify:before-migrate-3`). Si algo falla, el comando termina ahí. **Cero TRX gastados.**
3. Solo si todo pasó: ejecuta `npm run migrate-3-safe` (compila, verifica y luego ejecuta la migración 3).

**No uses `tronbox migrate -f 3` por tu cuenta.** Usa siempre `npm run migrate-3-safe`. Así se evita volver a gastar TRX sin comprobaciones. Antes de añadir esto, se desplegó varias veces sin verificar energía/balance y se perdió TRX.

---

## feeLimit y energía

- **tronbox.js** tiene `feeLimit: 300000000` (300 TRX por tx), necesario para el deploy de Implementation (fase "save just created contract code" ~2,5M Energy); con menos fallaba OUT_OF_ENERGY.
- El deploy de **TRC20TokenUpgradeable** (Implementation) es el que más energía consume. En los intentos fallidos se quemó el fee_limit por tx y aun así falló (fase "save just created contract code"). Ahora tronbox.js usa 300 TRX por tx.
- Si en el futuro necesitas más margen, puedes subir el feeLimit en `tronbox.js` (máx. 15.000 TRX) o **delegar energía** a la cuenta.

El script `verify:before-migrate-3` lee el feeLimit de tronbox.js y comprueba que sea suficiente.

---

## Resumen

| Comando | Qué hace | Gasta TRX |
| ------- | -------- | --------- |
| Editar .env (PROXY_ADMIN_ADDRESS, etc.) | Configuración | No |
| **npm run migrate-3-safe** | Compila → Verifica todo → Si pasa, migrate -f 3 | Solo si la verificación pasó |

No hay que recordar dos pasos. Un solo comando: si la verificación falla, no se envía ninguna transacción.
