# Solución: contratos en mainnet

**Un comando.** Cuando tengas TRX en la wallet (mínimo ~80 TRX líquidos; si no tienes energía, unos ~520 TRX):

```bash
npm run deploy:mainnet
```

Eso compila, valida, comprueba saldo y despliega (Implementation + ProxyAdmin + Proxy + initialize). No pide escribir SÍ; despliega directo.

La dirección del token queda en consola y en `deploy-info.json`. Luego: `npm run post-deploy:perfil` y completar perfil en Tronscan.

---

**Alternativa (con confirmación):** `npm run listo` — te pide escribir SÍ antes de enviar nada.

**Solo validar (no gasta TRX):** `npm run deploy:dry-run`
