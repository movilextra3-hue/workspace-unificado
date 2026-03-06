# Reutilizar ProxyAdmin ya desplegada (solo subir Implementation + Proxy)

Si en mainnet ya tienes **ProxyAdmin** desplegada(s) pero **Implementation** falló (ej. OUT_OF_ENERGY), puedes usar una de esas ProxyAdmin y desplegar **solo** Implementation + Proxy. Así no repites el deploy de ProxyAdmin ni gastas de más.

## Pasos

### 1. Dirección de una ProxyAdmin existente

**Ya tienes 3 ProxyAdmin en mainnet.** Puedes usar cualquiera de estas direcciones (copy-paste en `.env`):

| Tx | Dirección (base58) |
| -- | ------------------ |
| 1 | `TVeVPZGiMc9GWQ8sQHvUwhfg19EDZt3UjZ` |
| 3 | `TQJ6f3eczr2rK9x9kN2JMTdDN1zTm46XxE` |
| 5 | `TTTT4AeRUjJEmTepb9X4uK4f6Pxg8UwwkW` |

Recomendación: usar la primera. Listado completo y hashes en `docs/LAS_6_TX_DETALLE_ESTADO_Y_DIRECCIONES.md`.

Si quisieras obtener la dirección desde Tronscan: entra a tu dirección, localiza una tx de creación de ProxyAdmin (tx 1, 3 o 5 en el doc de coste); en la página de la tx verás "Contract Created" con la dirección, o en la API `contract_address` (hex).

### 2. Configurar .env

En la raíz del proyecto:

```env
PROXY_ADMIN_ADDRESS=TVeVPZGiMc9GWQ8sQHvUwhfg19EDZt3UjZ
```

(Puedes usar cualquiera de las 3 direcciones de la tabla anterior.) El resto de variables (TOKEN_NAME, TOKEN_SYMBOL, PRIVATE_KEY, etc.) igual que para un deploy normal.

### 3. Energía y TRX

El paso que más consume es el deploy de **TRC20TokenUpgradeable** (Implementation). Asegúrate de tener:

- **Energía** suficiente (delegada/stake o cuenta con banda), **o**
- **TRX** suficiente para pagar energía: **feeLimit en tronbox.js debe ser al menos 300 TRX** por tx de deploy (la fase "save just created contract code" requiere ~2,5M Energy; con menos falla OUT_OF_ENERGY).

Si no tienes energía y feeLimit bajo, la Implementation puede fallar otra vez por OUT_OF_ENERGY (ver tx ejemplo [bcc04dc99...](https://tronscan.org/#/transaction/bcc04dc99aec269d12e5b623ca68f57e017d89cfab72bf75a798e6ce95c24498)).

### 4. Completar el deploy (único comando que gasta TRX)

**Un solo comando:** compila, verifica todo (sin gastar TRX) y, solo si la verificación pasa, ejecuta la migración 3. Si la verificación falla, no se envía ninguna transacción.

```bash
npm run migrate-3-safe
```

- **Verificación previa (automática):** .env, ProxyAdmin en mainnet, balance, energía, feeLimit. Si algo falla, el comando termina y **no se gasta TRX**.
- **No uses** `tronbox migrate -f 3` por tu cuenta: así se evitó gastar TRX sin comprobaciones. Usa solo `npm run migrate-3-safe`.

`migrate-3-safe` compila, verifica y luego ejecuta la migración 3, que:

1. Despliega **TRC20TokenUpgradeable** (Implementation).
2. Usa la **ProxyAdmin** indicada en `PROXY_ADMIN_ADDRESS` (no despliega otra).
3. Despliega **TransparentUpgradeableProxy** con (Implementation, ProxyAdmin).
4. Llama **initialize** del token en el proxy.

Al terminar tendrás el token en mainnet (la dirección del token es la del **Proxy**) y se generará `deploy-info.json` como en un deploy normal.

### 5. Resumen

| Qué | Acción |
| --- | ------ |
| ProxyAdmin | Reutilizada (ya estaba en mainnet) |
| Implementation | Nueva (1 tx, la que antes fallaba) |
| Proxy | Nueva (1 tx) |
| initialize | 1 tx |

Coste aproximado: ~1 deploy Implementation + 1 deploy Proxy + initialize, mucho menos que repetir las 3 ProxyAdmin.
