# Revisión exhaustiva verificada (web oficial, sin omisiones)

Todo lo siguiente está contrastado con documentación oficial TRON/TronGrid. Fuentes enlazadas al final.

---

## 1. API TronGrid y FullNode

### 1.1 Transacciones por cuenta (lista)

- **Endpoint:** `GET https://api.trongrid.io/v1/accounts/{address}/transactions`
- **Parámetros de query (oficiales):**
  - `limit`: número por página (default 20, **máx. 200**)
  - `order_by`: `block_timestamp,asc` o `block_timestamp,desc` (default)
  - `min_timestamp`, `max_timestamp`: filtro de tiempo
  - `only_confirmed`, `only_unconfirmed`, `only_to`, `only_from`: boolean
  - `fingerprint`: paginación
  - `search_internal`: incluir internas (default true)
- **Dirección:** base58 o hex (0x... o 41...) en el path.
- **Respuesta:** `success`, `meta`, `data` (array); propiedades en **snake_case** (p. ej. `tx_id`, `block_timestamp`).
- **Fuente:** [Get transaction info by account address](https://developers.tron.network/v4.0.0/reference/transaction-information-by-account-address).

### 1.2 Detalle de una transacción por ID

- **Endpoint:** `POST https://api.trongrid.io/wallet/gettransactioninfobyid`
- **Body:** `{"value": "txIdHex"}` — **value** es obligatorio, string hex del hash (64 caracteres).
- **Opcional:** `"visible": false` (default) para hex; `true` para Base58 en request/response.
- **Respuesta (campos relevantes):**
  - `id`, `fee` (sun), `blockNumber`, `blockTimeStamp`
  - `contract_address`, `contractResult[]`
  - `receipt`: `result` (omitido si éxito; `FAILED` si fallo), `net_fee`, `energy_fee`, `energy_usage_total`, `net_usage`, etc.
  - Nivel superior: `result` omitido si éxito; `FAILED` si fallo. `resMessage` (hex) si falló.
- **Fuente:** [GetTransactionInfoById](https://developers.tron.network/reference/gettransactioninfobyid).

### 1.3 Transacciones por dirección de contrato

- **Endpoint:** `GET https://api.trongrid.io/v1/contracts/{contractAddress}/transactions`
- **Fuente:** [Get transaction info by contract address](https://developers.tron.network/reference/get-transaction-info-by-contract-address).

---

## 2. Fee limit y energía (mainnet)

### 2.1 Fee limit

- **Unidad:** SUN (1 TRX = 1.000.000 SUN).
- **Máximo permitido en red:** **1.5e10 sun** = 15.000 TRX. Valores mayores dan error. **Si no se envía, el default es 0** (FAQ oficial).
- **Uso:** Límite máximo que el caller acepta pagar por energía en esa tx. Si el consumo supera fee_limit × precio unidad de energía → se para la ejecución y **OUT_OF_ENERGY**.
- **Casos en que se deduce todo el fee_limit:** instrucción ilegal, OUT_OF_TIME (límite 80 ms), índice de array inválido, división por cero, assert false, overflow, OutofMem, etc. (FAQ Q1.)
- **Recomendación oficial:** Fijar un fee limit adecuado antes de desplegar o ejecutar en mainnet.
- **Fuentes:** [FAQ — fee_limit](https://developers.tron.network/docs/faq) (Q1), [Fee Limit on Deploy/Execution](https://developers.tron.network/v4.0/docs/setting-a-fee-limit-on-deployexecution), [Feelimit](https://developers.tron.network/docs/feelimit).

### 2.2 OUT_OF_ENERGY

- **Qué es:** La tx consume más energía que el máximo permitido (EnergyLimit).
- **EnergyLimit** = función de (energía del caller + energía del deployer si aplica; y del fee_limit).
- **Cuando ocurre OUT_OF_ENERGY:** La tx **falla** y la energía/TRX descontados **no se reembolsan** (se queman).
- **Excepción:** Si el límite viene del “tope” de energía congelada (modelo dinámico), en ese caso concreto puede indicarse “without burning TRX” en docs; en el caso típico (fee_limit insuficiente) **sí se quema** el TRX usado hasta el límite.
- **Causas típicas:** Poca energía (staking), contratos que consumen mucha energía, fee_limit bajo.
- **Fuentes:** [Frozen Energy and OUT_OF_ENERGY](https://developers.tron.network/v4.0/docs/frozen-energy-and-fee-limit-model), [Energy Consumption Mechanism](https://developers.tron.network/docs/energy-consumption-mechanism), [FAILED – OUT OF ENERGY](https://tr.energy/en/blog/failed-out-of-energy-in-tron-network-causes-and-solutions/).

### 2.3 Energía y TRX

- **Pagar con TRX:** Se quema TRX a un precio por unidad de energía (orden de magnitud ~100 sun/energía en documentación).
- **Congelar TRX:** Da derecho a energía asignada dinámicamente (proporción de la red).

---

## 3. TronBox y mainnet

### 3.1 Configuración mainnet

- **fullHost:** `https://api.trongrid.io` (mainnet).
- **network_id:** `"1"` (mainnet).
- **privateKey:** desde variable de entorno (no en código).
- **feeLimit:** en SUN; debe ser suficiente para el deploy/ejecución (hasta 15.000 TRX = 15e9 SUN).
- **userFeePercentage:** porcentaje de consumo de recursos (ej. 50 o 100 según docs).
- **Fuente:** [TronBox Configuration](https://tronbox.io/docs/reference/configuration), [Smart Contract Deployment](https://developers.tron.network/v4.0/docs/tron-box-contract-deployment), [TronBox Command Line](https://developers.tron.network/v4.7.2/reference/tronbox-command-line).

### 3.2 Migraciones

- **Comando:** `tronbox migrate [--network <name>]`
- **Mainnet:** `tronbox migrate --network mainnet` o `-f N` para ejecutar desde la migración N.
- **Fuente:** [Deploy contracts](https://tronbox.io/docs/guides/deploy-contracts).

---

## 4. Cuentas y activación

- **Cuentas nuevas:** No existen on-chain hasta que se **activan**; no aparecen en APIs ni explorador hasta entonces.
- **Activación estándar:** Enviar TRX o TRC-10 desde una cuenta existente a la nueva dirección, o usar `wallet/createaccount` (crear tx, firmar, broadcast).
- **Coste:** **1 TRX** por activar una cuenta. El iniciador debe tener Bandwidth (staking); si no, **0,1 TRX** quemados por Bandwidth.
- **Activación desde contrato:** Si un contrato envía TRX o TRC-10 a una dirección no activada, esa cuenta se activa pero se consumen **25.000 Energy** extra.
- **Errores:** CONTRACT_VALIDATE_ERROR *"account does not exist"* = cuenta iniciadora no activada (FAQ Q12).
- **Fuente:** [Accounts — Account Activation](https://developers.tron.network/docs/account#account-activation).

---

## 5. TRC-20 y despliegue de token

- **Requisitos:** Cuenta con TRX suficiente, código del contrato, parámetros (name, symbol, decimals, supply).
- **Verificación en TRONSCAN:** Optimización, versión del compilador, nombre del contrato, dirección.
- **Fuente:** [Issuing a TRC-20 Token](https://developers.tron.network/docs/issuing-trc20-tokens-tutorial), [TRC-20 Contract Interaction](https://developers.tron.network/docs/trc20-contract-interaction).

---

## 6. Comprobaciones en este proyecto (alineadas con lo anterior)

| Elemento | Verificación |
| -------- | ------------- |
| **tronbox.js** | fullHost `https://api.trongrid.io`, network_id `"1"`, feeLimit 300.000.000 SUN (300 TRX) para deploy Implementation ("save just created contract code" ~2,5M Energy) ✓ |
| **verify-transaction-history.js** | GET `/v1/accounts/{address}/transactions` con query oficial; POST gettransactioninfobyid con `value` (hash hex) ✓ |
| **verify-before-migrate-3.js** | POST getcontract, getaccountresource, getaccount, getenergyprices; host api.trongrid.io ✓ |
| **estimate-deploy-cost.js** | getaccountresource, getenergyprices, getaccount/v1/accounts; energía por byte heurística ✓ |
| **TRON_PRO_API_KEY** | Cabecera `TRON-PRO-API-KEY` en requests a TronGrid; recomendada para mainnet ✓ |
| **gettransactioninfobyid body** | Solo `value` obligatorio; `visible: false` opcional para hex ✓ |
| **order_by (account transactions)** | Valores válidos: `block_timestamp,desc` o `block_timestamp,asc` ✓ |

---

## 7. FAQ oficial (resolución de errores)

- **[FAQ](https://developers.tron.network/docs/faq)** — Preguntas 1 (fee_limit), 2 (OUT_OF_TIME), 4 (revert / contractResult), 5 (cálculo Bandwidth/Energy), **7 (cómo resolver OUT_OF_ENERGY: subir feeLimit o más energía)**, 10 (TronGrid 503 / usar API Key), 12 (códigos de broadcast). Consulta obligatoria para no cometer errores.

## 8. Fuentes oficiales citadas

- [TRON Developer Hub](https://developers.tron.network/)
- [Accounts — Account Activation](https://developers.tron.network/docs/account#account-activation)
- [FAQ](https://developers.tron.network/docs/faq)
- [Get transaction info by account address](https://developers.tron.network/v4.0.0/reference/transaction-information-by-account-address)
- [Get transaction info by contract address](https://developers.tron.network/reference/get-transaction-info-by-contract-address)
- [GetTransactionInfoById](https://developers.tron.network/reference/gettransactioninfobyid)
- [Fee Limit / Setting](https://developers.tron.network/docs/feelimit), [Setting a fee limit on deploy/execution](https://developers.tron.network/v4.0/docs/setting-a-fee-limit-on-deployexecution)
- [Frozen Energy and OUT_OF_ENERGY](https://developers.tron.network/v4.0/docs/frozen-energy-and-fee-limit-model)
- [Energy Consumption Mechanism](https://developers.tron.network/docs/energy-consumption-mechanism)
- [TronBox Configuration](https://tronbox.io/docs/reference/configuration), [Deploy contracts](https://tronbox.io/docs/guides/deploy-contracts)
- [Issuing a TRC-20 Token](https://developers.tron.network/docs/issuing-trc20-tokens-tutorial)

Esta revisión se ha hecho contrastando cada punto con la documentación enlazada; no se incluyen suposiciones sin fuente.
