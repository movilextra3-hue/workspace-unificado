# Contexto actual para el despliegue

Resumen para que el agente y el usuario estén alineados al ejecutar lo que falta del despliegue.

---

## Qué se va a realizar

**Completar el token en TRON mainnet** usando la **migración 3**: desplegar solo **Implementation** + **Proxy**, reutilizando una **ProxyAdmin** ya existente en mainnet. La dirección que importa para el token es la del **Proxy** (permanente).

- **No** se vuelve a desplegar ProxyAdmin (se reutiliza la de `PROXY_ADMIN_ADDRESS` en .env).
- Se despliegan: 1) TRC20TokenUpgradeable (Implementation), 2) TransparentUpgradeableProxy (apuntando a Implementation y a ProxyAdmin), 3) se llama `initialize(name, symbol, decimals, initialSupply, owner)` en el token vía Proxy.
- Coste estimado: ~450–500 TRX (o energía delegada equivalente). feeLimit por tx: 300 TRX (tronbox.js).

---

## Comando único para desplegar (lo que falta)

```bash
npm run migrate-3-safe
```

Ese comando hace en orden:

1. Comprueba que existan `PRIVATE_KEY` y `TRON_PRO_API_KEY` en .env (si faltan, falla sin compilar).
2. `npm run compile:tronbox` (genera artefactos TVM).
3. `node scripts/verify-before-migrate-3.js` (balance, energía, ProxyAdmin, feeLimit; **no envía ninguna tx**).
4. Si la verificación pasa: `tronbox migrate -f 3 --network mainnet` con `MIGRATE_3_VERIFIED=1`.

Si el paso 3 falla, **no** se ejecuta el paso 4 (no se gasta TRX). No usar nunca `tronbox migrate -f 3` a mano en mainnet.

---

## Estado previo (lo que ya está listo)

- **.env:** Comprobado con `npm run check:env`: PRIVATE_KEY, TRON_PRO_API_KEY, PROXY_ADMIN_ADDRESS presentes y con formato válido (sin exponer valores).
- **tronbox.js:** mainnet con feeLimit 300000000, fullHost api.trongrid.io.
- **Contratos y scripts:** Compilación, tests, lint y dry-run OK. Verificación previa (verify-before-migrate-3) configurada con varias fuentes de balance, timeout 15s, mensajes claros si falla la API.
- **Garantías:** No se gasta TRX sin pasar verify; migración 3 exige MIGRATE_3_VERIFIED y feeLimit ≥ 250 TRX.

---

## Posible bloqueo antes de ejecutar migrate-3-safe

La **verificación previa** puede fallar si:

- **Energía insuficiente:** El deploy de Implementation necesita ~4,5M de energía (Impl + Proxy + init). Con 0 energía delegada, se queman TRX (feeLimit 300 TRX por tx). Si el coste estimado (~450 TRX) supera el margen que permite el feeLimit o el balance, verify avisa y no deja seguir.
- **Balance &lt; 200 TRX:** Verify exige al menos 200 TRX (recomendado ~500 para margen).
- **PROXY_ADMIN_ADDRESS no es contrato en mainnet:** Verify comprueba con getcontract; si falla, no sigue.

Si verify muestra “balance bajo” pero en Tronscan ves más saldo, en .env se puede añadir `VERIFY_BALANCE_TRX=tu_balance_en_TRX` (solo número).

---

## Después del despliegue (cuando migrate-3-safe termine bien)

1. **deploy-info.json** se genera en la raíz con: `tokenAddress` (Proxy), `implementationAddress`, `proxyAdminAddress`.
2. **Verificación en Tronscan:** `npm run prepare:verification` y verificar Token (Proxy) e Implementation en https://tronscan.org (ver POST-DEPLOY.md y docs/VERIFICATION.md).
3. **Perfil del token:** Completar logo, descripción y web en Tronscan para que el token se vea bien en wallets (docs/TRONSCAN_PERFIL_TOKEN.md, `npm run post-deploy:perfil`).
4. **Opcional:** Si en el futuro se hace upgrade y se usa `initializeV2`: `node scripts/initialize-v2.js [version] [cap]`.

---

## Cómo puede apoyar el agente

- Indicar los pasos exactos (check:env, verify:before-migrate-3, migrate-3-safe) y en qué orden.
- Interpretar la salida de verify (por qué falla: balance, energía, feeLimit, ProxyAdmin) y proponer correcciones (por ejemplo VERIFY_BALANCE_TRX o más TRX/energía).
- Recordar que no se debe usar `tronbox migrate -f 3` directo y que el único comando que gasta TRX para “completar token” es `npm run migrate-3-safe` tras pasar verify.
- Después del deploy: guiar verificación en Tronscan, perfil del token y uso de deploy-info.json.

Referencias rápidas: [CHECKLIST_PRE_DESPLIEGUE.md](CHECKLIST_PRE_DESPLIEGUE.md), [NO_GASTAR_TRX_A_LO_PENDEJO.md](NO_GASTAR_TRX_A_LO_PENDEJO.md), [POST-DEPLOY.md](../POST-DEPLOY.md).
