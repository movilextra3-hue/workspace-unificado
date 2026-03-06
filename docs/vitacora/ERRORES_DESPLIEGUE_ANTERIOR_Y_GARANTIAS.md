# Errores del despliegue anterior y garantías para que no se repitan

## 1. Qué falló en el despliegue anterior

Se ejecutaron **6 transacciones** en mainnet:

| # | Contrato        | Resultado   | Motivo |
|---|-----------------|------------|--------|
| 1–3 | **ProxyAdmin** | OK         | Desplegadas correctamente. |
| 4–6 | **Implementation** (TRC20TokenUpgradeable) | **FALLIDAS** | **OUT_OF_ENERGY**. |

Las 3 Implementation fallaron con el mismo error: la red devolvió **OUT_OF_ENERGY**. El TRX usado como fee se consumió y **no se creó ningún contrato** (ni Implementation ni Proxy).

---

## 2. Causas concretas del fallo

### Causa A: feeLimit insuficiente para el deploy de Implementation

- En TRON, desplegar un contrato tiene una fase extra: **"save just created contract code"**, que consume mucha energía.
- Si el **feeLimit** (límite máximo de TRX por tx) es bajo, la red no puede “comprar” toda la energía necesaria y la tx falla con OUT_OF_ENERGY.
- En el despliegue anterior el feeLimit era **bajo** (del orden de 100–150 TRX por tx). La tx de ejemplo [bcc04dc99...](https://tronscan.org/#/transaction/bcc04dc99aec269d12e5b623ca68f57e017d89cfab72bf75a798e6ce95c24498) muestra: **needEnergy ~2.459.000**, **leftEnergy ~977.162** → no alcanzaba la energía y falló.

### Causa B: No había verificación previa obligatoria

- Se podía ejecutar `tronbox migrate -f 3` (o equivalente) **sin comprobar** antes:
  - feeLimit en `tronbox.js`
  - balance y energía (o TRX suficiente para pagar energía)
  - existencia y validez de `PROXY_ADMIN_ADDRESS` en `.env`
- Así se gastaba TRX en txs que iban a fallar.

### Causa C: PROXY_ADMIN_ADDRESS no configurado o mal usado

- La migración 3 reutiliza una ProxyAdmin ya desplegada. Si no se define `PROXY_ADMIN_ADDRESS` en `.env` o se usa una dirección que no es contrato, el flujo puede fallar o desplegar en condiciones incorrectas.

### Causa D: Balance o energía insuficientes

- Aun con feeLimit alto, si la cuenta no tiene **suficiente TRX** (o energía delegada) para pagar las 3 tx (Implementation + Proxy + initialize), alguna tx puede fallar o quedarse sin energía a mitad.

---

## 3. Salvaguardas actuales (para que no vuelva a ocurrir)

Cada causa tiene al menos una salvaguarda en código, configuración o proceso.

| Causa | Salvaguarda | Dónde |
|-------|-------------|--------|
| **A. feeLimit bajo** | 1) **tronbox.js** fija `feeLimit: 300000000` (300 TRX) en mainnet. 2) **verify-before-migrate-3.js** exige feeLimit ≥ 250 TRX (250000000 sun) y no deja seguir si es menor. 3) **Migración 3** al arrancar en mainnet lee `tronbox.js` y si `mainnet.feeLimit` &lt; 250 TRX lanza error y **no envía ninguna tx** (así aunque alguien ejecute `tronbox migrate -f 3` directo con feeLimit bajo, la migración aborta). | `tronbox.js`, `scripts/verify-before-migrate-3.js`, `migrations/3_deploy_impl_and_proxy_reuse_admin.js` |
| **B. Ejecutar migrate sin verificar** | 1) **Solo `npm run migrate-3-safe`** puede gastar TRX en migrate -f 3: el script define `MIGRATE_3_VERIFIED=1` antes de llamar a tronbox. 2) **La migración 3 en mainnet** comprueba esa variable; si no está definida, **lanza error y no envía ninguna tx** — así, si alguien ejecuta `tronbox migrate -f 3` directo, no se gasta TRX. 3) Si la verificación falla, el script termina y no llega a tronbox. | `package.json` (script `migrate-3-safe` con `cross-env MIGRATE_3_VERIFIED=1`), `migrations/3_deploy_impl_and_proxy_reuse_admin.js`, docs |
| **C. PROXY_ADMIN_ADDRESS** | 1) **Migración 3** hace `throw` si no existe `PROXY_ADMIN_ADDRESS` en `.env`. 2) **verify-before-migrate-3.js** comprueba que exista y que la dirección sea un contrato en mainnet; si no, no pasa la verificación. | `migrations/3_deploy_impl_and_proxy_reuse_admin.js`, `scripts/verify-before-migrate-3.js` |
| **D. Balance/energía** | **verify-before-migrate-3.js** comprueba balance (mín. 200 TRX recomendado) y estima coste total en TRX; si no hay energía suficiente ni TRX para pagarla, no pasa y no se ejecuta migrate. | `scripts/verify-before-migrate-3.js` |

---

## 4. Otras garantías de código

- **deploy-upgradeable.js** (deploy completo por script): usa **300000000** (300 TRX) como feeLimit para el deploy de la Implementation; 1e8 para ProxyAdmin, Proxy e initialize.
- **tronbox.js** incluye comentario que explica por qué 300 TRX (fase "save just created contract code", tx bcc04dc99..., OUT_OF_ENERGY).

---

## 5. Resumen

| Error anterior | Garantía para no repetirlo |
|----------------|----------------------------|
| OUT_OF_ENERGY por feeLimit bajo | feeLimit 300 TRX en tronbox.js; verificación ≥ 250 TRX en script; migración 3 lanza error si feeLimit &lt; 250 TRX en mainnet. |
| Gastar TRX sin comprobar antes | `npm run migrate-3-safe` siempre ejecuta la verificación; si falla, no se llama a migrate. |
| PROXY_ADMIN_ADDRESS faltante o inválido | Migración 3 y script de verificación exigen y validan la variable. |
| Balance/energía insuficientes | El script de verificación comprueba balance y coste estimado y no deja seguir si no hay margen. |

Para no volver a tener el mismo u otros errores en este flujo:

1. **Solo usar** `npm run migrate-3-safe` para completar el token (no `tronbox migrate -f 3` directo).
2. **No bajar** `feeLimit` en `tronbox.js` por debajo de 250 TRX (250000000) en mainnet; recomendado 300 TRX (300000000).
3. Tener **.env** con `PROXY_ADMIN_ADDRESS`, `PRIVATE_KEY` y `TRON_PRO_API_KEY`, y **balance/energía** suficientes (~500+ TRX o energía delegada) antes de ejecutar.

Referencias: **[docs/NO_GASTAR_TRX_A_LO_PENDEJO.md](NO_GASTAR_TRX_A_LO_PENDEJO.md)** (resumen y checklist), `docs/RECUPERAR_DESPLIEGUE.md`, `docs/COMPLETAR_DESPLIEGUE_REVISION_Y_CHECKLIST.md`, comentarios en `tronbox.js` y en `scripts/verify-before-migrate-3.js`.
