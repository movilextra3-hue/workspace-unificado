# Las 6 transacciones de contratos — detalle, direcciones, qué está correcto y qué falta

**Cuenta:** [TWYhXqeMMtEePYnk2WdhoyyvHWxA1ay9Gz](https://tronscan.org/#/address/TWYhXqeMMtEePYnk2WdhoyyvHWxA1ay9Gz)  
**Red:** TRON mainnet.

---

## Tabla de las 6 transacciones (hash, contrato, estado, coste, dirección)

| # | Contrato | contractRet | Coste (TRX) | Hash (completo) | Dirección del contrato |
| - | -------- | ----------- | ----------- | --------------- | ---------------------- |
| 1 | ProxyAdmin | **SUCCESS** | 46.20 | `3ee86d18211e8ebaab2b7d8f677e5234a8e1d8c0fa70d599ffbd01887de1af7c` | **TVeVPZGiMc9GWQ8sQHvUwhfg19EDZt3UjZ** |
| 2 | TRC20TokenUpgradeable (Implementation) | **OUT_OF_ENERGY** | 117.02 | `de89dc1f551ac4151fddda237a713708db95e37d20941da05bed9de9059740e8` | — (no existe en mainnet) |
| 3 | ProxyAdmin | **SUCCESS** | 46.20 | `3c8612e831c9619198e607d36e9d90bc73fd85d3600e3f3bdc94f854f95abef4` | **TQJ6f3eczr2rK9x9kN2JMTdDN1zTm46XxE** |
| 4 | TRC20TokenUpgradeable (Implementation) | **OUT_OF_ENERGY** | 117.02 | `5c31fd0eb80616af41b6140c3070dfdfb0d48f7f13ebd620996e1db52a290f87` | — (no existe en mainnet) |
| 5 | ProxyAdmin | **SUCCESS** | 46.20 | `e9ddc21396c0f66cc7b7c7dfe739c0c62dfb5775ea99ddb48b3041deaf6cccf7` | **TTTT4AeRUjJEmTepb9X4uK4f6Pxg8UwwkW** |
| 6 | TRC20TokenUpgradeable (Implementation) | **OUT_OF_ENERGY** | 116.92 | `bcc04dc99aec269d12e5b623ca68f57e017d89cfab72bf75a798e6ce95c24498` | — (no existe en mainnet) |

**Total gastado en las 6:** 489.56 TRX.

---

## Qué hay en cada tx (resumen)

| # | Qué se intentó | Resultado | Qué quedó en mainnet |
| - | -------------- | --------- | -------------------- |
| 1 | Crear contrato ProxyAdmin | SUCCESS | ProxyAdmin en **TVeVPZGiMc9GWQ8sQHvUwhfg19EDZt3UjZ** |
| 2 | Crear contrato TRC20TokenUpgradeable (Implementation) | OUT_OF_ENERGY (falló) | Nada; el contrato no se guardó |
| 3 | Crear contrato ProxyAdmin | SUCCESS | ProxyAdmin en **TQJ6f3eczr2rK9x9kN2JMTdDN1zTm46XxE** |
| 4 | Crear contrato TRC20TokenUpgradeable (Implementation) | OUT_OF_ENERGY (falló) | Nada; el contrato no se guardó |
| 5 | Crear contrato ProxyAdmin | SUCCESS | ProxyAdmin en **TTTT4AeRUjJEmTepb9X4uK4f6Pxg8UwwkW** |
| 6 | Crear contrato TRC20TokenUpgradeable (Implementation) | OUT_OF_ENERGY (falló) | Nada; el contrato no se guardó |

---

## Qué está correcto (reutilizable)

**Las 3 ProxyAdmin desplegadas y sus direcciones:**

| Tx | Hash | Dirección ProxyAdmin (base58) | Tronscan (tx) |
| -- | ---- | ----------------------------- | ------------- |
| 1 | `3ee86d18211e8ebaab2b7d8f677e5234a8e1d8c0fa70d599ffbd01887de1af7c` | **TVeVPZGiMc9GWQ8sQHvUwhfg19EDZt3UjZ** | [Ver tx](https://tronscan.org/#/transaction/3ee86d18211e8ebaab2b7d8f677e5234a8e1d8c0fa70d599ffbd01887de1af7c) |
| 3 | `3c8612e831c9619198e607d36e9d90bc73fd85d3600e3f3bdc94f854f95abef4` | **TQJ6f3eczr2rK9x9kN2JMTdDN1zTm46XxE** | [Ver tx](https://tronscan.org/#/transaction/3c8612e831c9619198e607d36e9d90bc73fd85d3600e3f3bdc94f854f95abef4) |
| 5 | `e9ddc21396c0f66cc7b7c7dfe739c0c62dfb5775ea99ddb48b3041deaf6cccf7` | **TTTT4AeRUjJEmTepb9X4uK4f6Pxg8UwwkW** | [Ver tx](https://tronscan.org/#/transaction/e9ddc21396c0f66cc7b7c7dfe739c0c62dfb5775ea99ddb48b3041deaf6cccf7) |

Cualquiera de estas tres direcciones se puede usar como `PROXY_ADMIN_ADDRESS` en la migración `3_deploy_impl_and_proxy_reuse_admin.js`.

---

## Qué hace falta

| Componente | Estado | Acción |
| ---------- | ------ | ------ |
| **Implementation (TRC20TokenUpgradeable)** | No existe en mainnet (las 3 tx fallaron por OUT_OF_ENERGY) | Desplegar una vez con energía suficiente |
| **Proxy (TransparentUpgradeableProxy)** | Nunca se llegó a desplegar (el script va Impl → ProxyAdmin → Proxy; al fallar Impl no se ejecutó Proxy) | Desplegar después de tener Implementation, apuntando a una ProxyAdmin existente |
| **initialize(name, symbol, decimals, supply, owner)** | No se ejecutó (no hay Proxy) | Llamar tras tener Proxy desplegado |

**Orden para completar el token:**

1. Elegir una ProxyAdmin de la tabla de arriba (ej. `TVeVPZGiMc9GWQ8sQHvUwhfg19EDZt3UjZ`).
2. Poner en `.env`: `PROXY_ADMIN_ADDRESS=TVeVPZGiMc9GWQ8sQHvUwhfg19EDZt3UjZ` (o la que elijas).
3. Asegurar energía/TRX suficientes.
4. Ejecutar **solo** `npm run migrate-3-safe` (compila, verifica sin gastar TRX, y si pasa despliega Implementation + Proxy e inicializa). No usar `tronbox migrate -f 3` directamente.

Ver **`docs/RECUPERAR_DESPLIEGUE.md`** (cómo recuperar y completar en pocos pasos), `docs/REUSAR_PROXY_ADMIN.md` (paso a paso) y `docs/COMPLETAR_DESPLIEGUE_REVISION_Y_CHECKLIST.md`.

---

## Hashes completos (para copiar/API)

```text
3ee86d18211e8ebaab2b7d8f677e5234a8e1d8c0fa70d599ffbd01887de1af7c
de89dc1f551ac4151fddda237a713708db95e37d20941da05bed9de9059740e8
3c8612e831c9619198e607d36e9d90bc73fd85d3600e3f3bdc94f854f95abef4
5c31fd0eb80616af41b6140c3070dfdfb0d48f7f13ebd620996e1db52a290f87
e9ddc21396c0f66cc7b7c7dfe739c0c62dfb5775ea99ddb48b3041deaf6cccf7
bcc04dc99aec269d12e5b623ca68f57e017d89cfab72bf75a798e6ce95c24498
```
