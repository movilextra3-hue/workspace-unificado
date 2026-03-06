# Cuánto se gastó en las 6 transacciones de contratos (deploy a lo pendejo)

Consultando cada tx con la API oficial (TronGrid: `POST /wallet/gettransactioninfobyid`), el **costo en TRX** (net_fee + energy_fee, en SUN, ÷ 1e6) de las 6 transacciones de contratos es el de la tabla. Referencia: [GetTransactionInfoById](https://developers.tron.network/reference/gettransactioninfobyid) y [transactions by contract](https://developers.tron.network/reference/get-transaction-info-by-contract-address).

| # | Hash (primeros 16) | Contrato | contractRet | net_fee (SUN) | energy_fee (SUN) | TRX |
| - | ------------------ | -------- | ----------- | ------------- | ---------------- | --- |
| 1 | 3ee86d18211e8eba... | ProxyAdmin | SUCCESS | 3,075,000 | 43,123,700 | **46.20** |
| 2 | de89dc1f551ac415... | TRC20TokenUpgradeable | **OUT_OF_ENERGY** | 17,024,000 | 99,999,900 | **117.02** |
| 3 | 3c8612e831c96191... | ProxyAdmin | SUCCESS | 3,075,000 | 43,123,700 | **46.20** |
| 4 | 5c31fd0eb80616af... | TRC20TokenUpgradeable | **OUT_OF_ENERGY** | 17,024,000 | 99,999,800 | **117.02** |
| 5 | e9ddc21396c0f66c... | ProxyAdmin | SUCCESS | 3,075,000 | 43,123,700 | **46.20** |
| 6 | bcc04dc99aec269d... | TRC20TokenUpgradeable | **OUT_OF_ENERGY** | 17,024,000 | 99,900,700 | **116.92** |

**Suma de las 6:**

| Concepto | TRX |
| -------- | --- |
| Tx 1 (ProxyAdmin) | 46.20 |
| Tx 2 (Implementation, falló) | 117.02 |
| Tx 3 (ProxyAdmin) | 46.20 |
| Tx 4 (Implementation, falló) | 117.02 |
| Tx 5 (ProxyAdmin) | 46.20 |
| Tx 6 (Implementation, falló) | 116.92 |
| **TOTAL** | **489.56 TRX** |

Cálculo: 46.20 + 117.02 + 46.20 + 117.02 + 46.20 + 116.92 = **489.56 TRX**

- Las 3 de **ProxyAdmin** salieron bien (SUCCESS) y costaron ~46.2 TRX cada una.
- Las 3 de **TRC20TokenUpgradeable** (Implementation) fallaron por **OUT_OF_ENERGY** (“Not enough energy for 'save just created contract code'”) pero **igual se cobró**: se quemó hasta el fee_limit que se usaba entonces por tx en energía, más net_fee ~17 TRX. Por eso ~117 TRX cada una. Para nuevos deploys el proyecto usa **feeLimit 300 TRX** (300000000 sun) en tronbox.js.

Tu balance pasó de ~754 TRX a ~1.91 TRX (**~752 TRX en total**). De esos, **~490 TRX** corresponden solo a estas 6 tx; el resto salió en otras salidas de la misma dirección (otras 6+ tx que aparecen en el historial de 19).

No hay forma de recuperar ese TRX; las comisiones ya se consumieron en mainnet.

---

## Reutilizar las ProxyAdmin que sí se desplegaron

Las **3 ProxyAdmin** están en mainnet y se pueden usar. Solo falta desplegar **Implementation + Proxy** y enlazarlos a una de esas admin.

1. **Obtener la dirección de una ProxyAdmin**  
   En Tronscan, abre una de las tx exitosas de ProxyAdmin (ej. la primera: `3ee86d18211e8eba...`). El contrato creado está en **`contract_address`** en la respuesta de `POST /wallet/gettransactioninfobyid` (TronGrid) o en la página de la tx en Tronscan (Contract Created). Ver `docs/TRON_API_REFERENCIAS.md`.

2. **Ponerla en `.env`**  
   `PROXY_ADMIN_ADDRESS=TU_DIRECCION_PROXY_ADMIN` (base58 tipo `T...` o hex `0x...`).

3. **Desplegar solo Implementation + Proxy** (con energía suficiente):

   ```bash
   npm run migrate-3-safe
   ```

   Eso ejecuta solo la migración `3_deploy_impl_and_proxy_reuse_admin.js`: despliega Implementation, despliega Proxy apuntando a esa Implementation y a la ProxyAdmin existente, e inicializa el token. No vuelve a desplegar ProxyAdmin.

Detalle: ver `docs/REUSAR_PROXY_ADMIN.md`.
