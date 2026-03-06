# Cómo recuperar el despliegue (reutilizar lo que ya está en mainnet)

Tras las 6 transacciones anteriores: **3 ProxyAdmin OK**, **3 Implementation fallidas por OUT_OF_ENERGY**. No hay que repetir nada de lo que ya salió bien. Este documento resume qué se recupera y cómo completar el token.

---

## Qué está ya en mainnet (recuperado)

| Componente | Estado | Direcciones |
| ---------- | ------ | ----------- |
| **ProxyAdmin** (x3) | ✅ Desplegadas | `TVeVPZGiMc9GWQ8sQHvUwhfg19EDZt3UjZ`, `TQJ6f3eczr2rK9x9kN2JMTdDN1zTm46XxE`, `TTTT4AeRUjJEmTepb9X4uK4f6Pxg8UwwkW` |
| **Implementation** | ❌ No existe | Las 3 tx fallaron por OUT_OF_ENERGY |
| **Proxy** | ❌ No desplegado | Se despliega al completar con migrate-3 |

Detalle de las 6 tx: `docs/LAS_6_TX_DETALLE_ESTADO_Y_DIRECCIONES.md`.

---

## Por qué falló Implementation (OUT_OF_ENERGY)

El deploy de un contrato en TRON tiene una fase extra: **"save just created contract code"**. Si la energía (o el fee_limit) no alcanza para esa fase, la tx falla con OUT_OF_ENERGY y se quema el fee sin crear el contrato.

- Ejemplo: [tx bcc04dc99...](https://tronscan.org/#/transaction/bcc04dc99aec269d12e5b623ca68f57e017d89cfab72bf75a798e6ce95c24498) — mensaje: `needEnergy[2459000], leftEnergy[977162]`.
- **Solución:** `feeLimit` en `tronbox.js` **≥ 300 TRX** (300.000.000 sun) por tx de deploy, para cubrir ~2,5M Energy de esa fase.

---

## Pasos para completar el token (recuperar y desplegar solo lo que falta)

1. **Elegir una ProxyAdmin** de la tabla de arriba (recomendado: `TVeVPZGiMc9GWQ8sQHvUwhfg19EDZt3UjZ`).

2. **Configurar `.env`:**
   ```env
   PROXY_ADMIN_ADDRESS=TVeVPZGiMc9GWQ8sQHvUwhfg19EDZt3UjZ
   PRIVATE_KEY=...
   TRON_PRO_API_KEY=...
   ```
   (TOKEN_NAME, TOKEN_SYMBOL, etc. opcionales.)

3. **Comprobar `tronbox.js`:** debe tener `feeLimit: 300000000` (300 TRX) o superior para mainnet.

4. **Ejecutar un solo comando (verifica sin gastar TRX y luego despliega):**
   ```bash
   npm run migrate-3-safe
   ```
   - Compila, verifica .env, ProxyAdmin, balance, energía y feeLimit.
   - Si algo falla, **no se envía ninguna tx**.
   - Si todo pasa: despliega Implementation → Proxy (con ProxyAdmin existente) → initialize.

5. Al terminar: la **dirección del token** es la del **Proxy**; `deploy-info.json` se genera en la raíz.

---

## Resumen

| Acción | Qué hace |
| ------ | -------- |
| **Recuperar** | Usar una de las 3 ProxyAdmin ya desplegadas (no volver a desplegar ProxyAdmin). |
| **Resolver OUT_OF_ENERGY** | feeLimit ≥ 300 TRX en tronbox.js; verificación previa con `npm run migrate-3-safe`. |
| **Completar** | `npm run migrate-3-safe` despliega solo Implementation + Proxy + initialize. |

**Hay 3 ProxyAdmin en mainnet.** Para completar **un** token: pon una de las 3 direcciones en `PROXY_ADMIN_ADDRESS` y ejecuta `npm run migrate-3-safe` **una vez**. Eso despliega 1 Implementation + 1 Proxy y llama initialize.

Más detalle: `docs/REUSAR_PROXY_ADMIN.md`, `docs/COMPLETAR_DESPLIEGUE_REVISION_Y_CHECKLIST.md`.

---

## Alcance de lo que se puede afirmar

Lo anterior es **todo lo que, con la información disponible, se puede afirmar**:

- **Fuentes:** [FAQ oficial TRON](https://developers.tron.network/docs/faq) (Q1: en situaciones de error se deduce el fee_limit; no se describe reembolso). Documentación y artículos sobre OUT_OF_ENERGY (p. ej. [tr.energy](https://tr.energy/en/blog/failed-out-of-energy-in-tron-network-causes-and-solutions/), [CatFee](https://docs.catfee.io/en/energy/how-to-fix-out-of-energy-error-on-tron-transfers)) indican que **no existe mecanismo automático de reembolso** y que los fees consumidos en tx fallidas **no se pueden recuperar**; la única vía es prevenir (energía/TRX/fee_limit adecuados).

- **Las 3 transacciones fallidas (Implementation):** no hay reembolso de TRX, no hay contrato creado on-chain. No se ha encontrado en la documentación oficial ni en fuentes consultadas ningún procedimiento de TRON para devolver fees o “recuperar” esas tx.

- **Tampoco se pueden "completar" esas 3 tx:** cada una ya está finalizada en un bloque (resultado FAILED). No existe en el protocolo forma de reanudar, retry o completar lo que les faltó; el TRX gastado en ellas está perdido. Lo que evita perder todo el avance es: (1) reutilizar las 3 ProxyAdmin que sí se desplegaron, y (2) hacer **una** deploy nueva (Implementation + Proxy + initialize) con feeLimit suficiente; esa nueva deploy consumirá TRX nuevo, pero es la única forma de dejar el token operativo.

- **Recuperación posible:** solo la descrita en este doc: reutilizar las 3 ProxyAdmin ya desplegadas y completar el token con una nueva deploy (Implementation + Proxy + initialize), con feeLimit suficiente para no repetir OUT_OF_ENERGY. No se afirma que exista otra forma de recuperación más allá de lo aquí documentado.
