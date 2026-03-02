# USDT en TRON — Panorama completo en mainnet y alineación con tu token local

Referencia para tener **todo lo que hace USDT en mainnet** (cómo se muestra en wallets, cómo marca precio estable, qué está completo) y **alinear tu proyecto local** con eso.

---

## 1. Datos oficiales USDT en TRON mainnet

| Campo | Valor |
|-------|--------|
| **Dirección del contrato** | `TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t` |
| **Nombre (name)** | `Tether USD` |
| **Símbolo (symbol)** | `USDT` |
| **Decimales (decimals)** | `6` |
| **Tipo** | TRC-20 |
| **Nombre del contrato (TronScan)** | `TetherToken` |
| **Emisión** | Abril 2019 |

Fuentes: Tether oficial, TronScan, CoinGecko, CoinMarketCap.

---

## 2. Cómo muestran los tokens las wallets (automático)

### 2.1 On-chain (obligatorio)

Las wallets leen **directamente al contrato** estas funciones TRC-20:

| Función | Retorno | Uso |
|---------|---------|-----|
| `name()` | string | Nombre visible (ej. "Tether USD") |
| `symbol()` | string | Símbolo (ej. "USDT") |
| `decimals()` | uint8 | Decimales (6 en USDT) |
| `totalSupply()` | uint256 | Supply total |
| `balanceOf(address)` | uint256 | Balance del usuario |

Si el contrato expone esas funciones, la wallet puede **mostrar nombre, símbolo, decimales y balance** sin listas externas. Tu contrato ya las tiene; la dirección que debe usarse es la del **Proxy** (no la de la implementación).

### 2.2 Añadir token manualmente (wallet_watchAsset)

Si el token no está en la lista de la wallet, el usuario lo añade con la **dirección del contrato**. TronLink (y estándares similares) permiten:

```javascript
await tronWeb.request({
  method: 'wallet_watchAsset',
  params: {
    type: 'trc20',
    options: { address: 'TR7NHq...', symbol: 'USDT', decimals: 6 }
  }
});
```

La wallet suele rellenar nombre/símbolo/decimales leyendo el contrato; a veces pide logo (URL). Para que “se vea como USDT” en mainnet, lo crítico es que **name, symbol y decimals** coincidan en criterio (nombre completo, ticker, 6 para stablecoin).

### 2.3 Listas de tokens (Trust Wallet, etc.)

Las wallets grandes mantienen **listas propias** (whitelist). Para que un token aparezca “solo” sin que el usuario lo añada, hay que estar en esa lista (por ejemplo Trust Wallet: proceso de listing en su repo). USDT está en todas; un token nuevo normalmente se **añade manualmente** por dirección y la wallet lee name/symbol/decimals del contrato.

**Resumen:** Para que tu token se comporte como USDT a nivel de **detección automática de nombre, símbolo y balance**, basta con:

- Contrato TRC-20 con `name()`, `symbol()`, `decimals()`, `balanceOf()` (ya lo tienes).
- Dar a los usuarios la **dirección del Proxy**.
- Opcional: verificación en TronScan y perfil (logo, web) para que exploradores y wallets que usen TronScan muestren más datos.

---

## 3. Cómo se marca el precio estable (1 USD)

### 3.1 Origen del precio

El “precio estable” (1 USDT ≈ 1 USD) **no viene del contrato**. Viene de:

- **TronScan / API TronScan:** campo `priceInUsd` (ej. ~1.000177699841053200 para USDT).
- **Agregadores:** CoinGecko, CoinMarketCap, etc., que marcan USDT como stablecoin y fijan precio ≈ 1 USD.
- **Wallets:** suelen usar una de esas fuentes (TronScan, CoinGecko, etc.) para mostrar el valor en USD.

En la API de TronScan (token overview), USDT aparece con algo como:

- `priceInUsd`: ~1.0  
- `priceInTrx`: valor en TRX  
- `marketcap`, `volume24hInTrx`, etc.

### 3.2 Cómo “marcar” un token como estable en la práctica

- **On-chain:** no hay un campo “soy stablecoin”. El contrato solo expone name, symbol, decimals, balances.
- **TronScan:** el perfil del token (descripción, categoría, etc.) y el hecho de que el precio lo calculen ellos o lo reciban de fuentes externas hace que se muestre como ~1 USD si así está en su sistema.
- **CoinGecko / CoinMarketCap:** listan el token y lo etiquetan como “stablecoin” o “pegged to USD”; las wallets que usan esas APIs mostrarán entonces el precio estable.

Para **alinear lo tuyo con USDT** a nivel de “precio estable”:

1. **Contrato:** mismo criterio que USDT: `decimals = 6`, nombre/símbolo claros (ej. “Mi Stable USD” / “MUSD” si es estable).
2. **TronScan:** verificar contrato y completar perfil (descripción, web, logo). El precio en TronScan dependerá de si tienen par en DEX o lo marcan manualmente.
3. **Listados:** si quieres que wallets muestren “1 USD” automáticamente como USDT, a largo plazo conviene listing en CoinGecko/CMC y marcar como stablecoin donde permitan.

---

## 4. Qué está “completamente completo” en mainnet para USDT

Resumen de todo lo que hace que USDT se vea “completo” en mainnet y en wallets:

| Aspecto | Estado USDT mainnet | Cómo replicarlo en tu token |
|--------|----------------------|------------------------------|
| Contrato TRC-20 | Desplegado, verificable | Desplegar implementación + proxy; verificar en TronScan |
| name / symbol / decimals | "Tether USD", "USDT", 6 | Usar `.env`: TOKEN_NAME, TOKEN_SYMBOL, TOKEN_DECIMALS=6 (si es stable) |
| Dirección pública | Una sola (contrato) | En tu caso: **dirección del Proxy** como “dirección del token” |
| Verificación TronScan | Código verificado | Ver [VERIFICATION.md](VERIFICATION.md) |
| Perfil TronScan | Logo, descripción, web, redes sociales | Completar en TronScan tras verificación |
| Precio en USD | ~1.0 (TronScan, CoinGecko, etc.) | TronScan + listados externos; establecoin en las APIs |
| Listas de wallets | Incluido en Trust, TronLink, etc. | Para token nuevo: añadir por dirección; listing oficial es aparte |
| Supply / holders / volumen | Visibles en TronScan | Automático al usar la misma red y explorador |

---

## 5. Alineación de tu proyecto local con USDT

### 5.1 Variables de entorno (mismo criterio que USDT)

En `.env` (o `ENV_CONSOLIDADO_COMPLETO.env`), para un token tipo stablecoin como USDT:

```env
TOKEN_NAME=Tether USD
TOKEN_SYMBOL=USDT
TOKEN_DECIMALS=6
TOKEN_SUPPLY=1000000
```

Para **tu propio token** (no Tether): cambia nombre y símbolo; si es stablecoin, mantén `TOKEN_DECIMALS=6`.

### 5.2 Contrato

Tu `TRC20TokenUpgradeable.sol` ya expone:

- `name`, `symbol`, `decimals`, `totalSupply`, `balanceOf`, `allowance`, `transfer`, `approve`, `transferFrom`, eventos `Transfer` y `Approval`.

Eso es suficiente para que las wallets muestren el token **igual que USDT** a nivel de nombre, símbolo, decimales y balances. La única dirección que debe usarse es la del **Proxy** (`tokenAddress` en `deploy-info.json`).

### 5.3 Después del despliegue en mainnet

1. **Verificar contrato** en TronScan (código fuente público).
2. **Completar perfil del token** en TronScan: logo (imgUrl), descripción, projectSite, redes sociales si aplica.
3. **Compartir con usuarios:** dirección del **Proxy**, no de la implementación.
4. (Opcional) Si quieres precio estable en agregadores/wallets: gestionar listing y etiqueta “stablecoin” en CoinGecko/CMC según sus procesos.

### 5.4 API TronScan de referencia (token por contrato)

Para un token por dirección (como USDT):

```
https://apilist.tronscanapi.com/api/token_trc20?contract=TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t&showAll=1
```

Para listado general (tokens con precio, logo, etc.):

```
https://apilist.tronscanapi.com/api/tokens/overview?start=0&limit=20&verifier=all&filter=top&showAll=1
```

En la respuesta de overview, USDT incluye: `name`, `abbr` (símbolo), `decimal`, `contractAddress`, `imgUrl`, `priceInUsd`, `priceInTrx`, `description`, `projectSite`, `verifier` (ej. "robot" = verificado). Todo eso es lo que hace que en mainnet se vea “completo” (nombre, precio estable, logo, web).

---

## 6. Checklist de alineación con USDT en mainnet

- [x] Contrato con name, symbol, decimals, balanceOf, transfer, approve, transferFrom, eventos.
- [x] Uso de la dirección del **Proxy** como dirección del token (`tokenAddress` en deploy-info.json).
- [x] .env con TOKEN_NAME, TOKEN_SYMBOL, TOKEN_DECIMALS (6 si es stable), TOKEN_SUPPLY.
- [x] ENV_TEMPLATE.txt y deploy-info.json.example alineados con criterio USDT (name, symbol, decimals 6).
- [x] Documentación: verificación ([VERIFICATION.md](VERIFICATION.md)), perfil TronScan ([TRONSCAN_PERFIL_TOKEN.md](TRONSCAN_PERFIL_TOKEN.md)), post-despliegue ([POST-DEPLOY.md](../POST-DEPLOY.md)), wallets ([WALLET_DISPLAY.md](WALLET_DISPLAY.md)).
- [ ] Desplegar en mainnet y verificar contrato en TronScan.
- [ ] Completar perfil del token en TronScan (logo, descripción, web) según [TRONSCAN_PERFIL_TOKEN.md](TRONSCAN_PERFIL_TOKEN.md).
- [ ] (Opcional) Listing / etiqueta stablecoin en CoinGecko/CMC para precio estable en todas las wallets.

Con esto tienes el **panorama completo** de cómo USDT está en mainnet (muestra en wallets, precio estable, qué está completo) y cómo alinear tu token local con eso.
