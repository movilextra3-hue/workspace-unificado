# Revisión: qué está completo, correcto y sirve para completar el token

Después de las 6 transacciones (3 ProxyAdmin OK, 3 Implementation fallidas por OUT_OF_ENERGY), esta es la revisión de lo que **sí está listo** y lo que **hay que hacer** para tener el token en mainnet.

---

## Lo que está completo y correcto (reutilizable)

| Elemento | Estado | Dónde / Cómo |
| -------- | ------ | ------------- |
| **3 contratos ProxyAdmin en mainnet** | ✅ Listos para usar | Direcciones en la tabla siguiente. Cualquiera sirve para la migración 3. |
| **Migración que reutiliza ProxyAdmin** | ✅ Lista | `migrations/3_deploy_impl_and_proxy_reuse_admin.js`. Despliega solo Implementation + Proxy + initialize. |
| **Configuración TronBox** | ✅ Correcta | `tronbox.js`: mainnet, feeLimit 300000000 (300 TRX). La migración 3 usa la misma config. |
| **Contratos compilados** | ✅ | `npm run compile` ya compila TRC20TokenUpgradeable, Proxy, ProxyAdmin. |
| **Documentación de las 6 tx** | ✅ | `docs/LAS_6_TX_DETALLE_ESTADO_Y_DIRECCIONES.md`: hashes, direcciones, qué falta. |
| **Guía paso a paso para completar** | ✅ | `docs/REUSAR_PROXY_ADMIN.md`: pasos 1–5. |

### Direcciones ProxyAdmin (copy-paste para .env)

Puedes usar **cualquiera** de estas tres (ya desplegadas en mainnet):

```text
TVeVPZGiMc9GWQ8sQHvUwhfg19EDZt3UjZ
TQJ6f3eczr2rK9x9kN2JMTdDN1zTm46XxE
TTTT4AeRUjJEmTepb9X4uK4f6Pxg8UwwkW
```

Recomendación: usar la primera (`TVeVPZGiMc9GWQ8sQHvUwhfg19EDZt3UjZ`) y dejar las otras dos como respaldo.

---

## Lo que hace falta hacer (para completar)

| Paso | Qué | Comentario |
| ---- | --- | ---------- |
| 1 | **Energía o TRX suficiente** | El deploy de Implementation consume mucha energía. Sin energía suficiente volverá OUT_OF_ENERGY. Opciones: delegar energía (stake), o tener TRX para pagar (fee_limit 300 TRX/tx en tronbox.js). |
| 2 | **Variable PROXY_ADMIN_ADDRESS en .env** | Añadir una de las 3 direcciones de arriba. Ver `ENV_TEMPLATE.txt` (variable opcional para este flujo). |
| 3 | **Ejecutar solo la migración 3** | `npm run migrate-3-safe` (compila, verifica y luego ejecuta migrate -f 3). No uses `tronbox migrate -f 3` directo ni `tronbox migrate` sin `-f 3`. |
| 4 | **Post-despliegue** | Igual que deploy normal: `deploy-info.json`, perfil en Tronscan, etc. Ver `POST-DEPLOY.md` y `docs/TRONSCAN_PERFIL_TOKEN.md`. |

---

## Checklist rápido para completar

- [ ] Cuenta con **energía suficiente** o **TRX** para ~2–3 tx (Implementation + Proxy + initialize).
- [ ] `.env` tiene `PRIVATE_KEY`, `TRON_PRO_API_KEY` y el resto (TOKEN_NAME, TOKEN_SYMBOL, etc.).
- [ ] `.env` tiene **`PROXY_ADMIN_ADDRESS=`** una de las 3 direcciones (ej. `TVeVPZGiMc9GWQ8sQHvUwhfg19EDZt3UjZ`).
- [ ] **Único comando que gasta TRX:** `npm run migrate-3-safe`. Compila, verifica todo (sin gastar) y solo si pasa ejecuta la migración 3. **No ejecutes** `tronbox migrate -f 3` directamente.
- [ ] Comprobar que se generó `deploy-info.json`; la dirección del token es **tokenAddress** (Proxy).
- [ ] Completar perfil del token en Tronscan con ese tokenAddress.

---

## Referencias

| Doc | Para qué |
| --- | -------- |
| **`docs/ANALISIS_Y_VERIFICACION_ANTES_DE_GASTAR_TRX.md`** | Por qué falló antes, qué comprueba el script, orden obligatorio. **Leer antes de migrate -f 3.** |
| `docs/LAS_6_TX_DETALLE_ESTADO_Y_DIRECCIONES.md` | Hashes, direcciones, qué está correcto y qué falta. |
| `docs/REUSAR_PROXY_ADMIN.md` | Pasos detallados (energía, .env, verificación, comando, resumen). |
| `docs/COSTO_6_TX_CONTRATOS.md` | Coste de las 6 tx y sección “Reutilizar las ProxyAdmin”. |
| `POST-DEPLOY.md` | Después del deploy: backup, Tronscan, verificación. |
