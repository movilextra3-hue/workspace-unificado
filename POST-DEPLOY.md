# Post-despliegue — Checklist y complementos

## 1. Verificación del contrato

- [ ] Ejecutar `npm run prepare:verification`
- [ ] Ir a Tronscan → Contract Verify: **https://tronscan.org** (mainnet)
- [ ] Verificar **Token (Proxy)** — dirección `tokenAddress`, contrato TransparentUpgradeableProxy
- [ ] Opcional: verificar Implementation y ProxyAdmin

**Nota:** `deploy-info.json` se genera con `npm run listo` (deploy mainnet) o `tronbox migrate --network mainnet`. Ver `docs/VERIFICATION.md` para parámetros exactos.

## 2. Añadir token a wallets

**Dirección a compartir:** `tokenAddress` de `deploy-info.json` (es la del Proxy; la única que deben usar usuarios y wallets).

### TronLink
- **Manual:** TronLink → Añadir token → pegar `tokenAddress`. Nombre, símbolo y decimales se rellenan desde el contrato.
- **Desde una DApp:** para que el usuario añada el token con un clic, el frontend puede llamar:
  ```javascript
  await tronWeb.request({
    method: 'wallet_watchAsset',
    params: {
      type: 'trc20',
      options: { address: tokenAddress, symbol: 'USDT', decimals: 6 }
    }
  });
  ```
  (Sustituir `tokenAddress`, `symbol` y `decimals` por los de tu token.)

### Otras wallets
- Trust Wallet, Klever, etc.: añadir token personalizado con la dirección del contrato (`tokenAddress`). Ver [docs/WALLET_DISPLAY.md](docs/WALLET_DISPLAY.md).

## 3. Perfil del token en TronScan (alineado con USDT en mainnet)

Para que el token se muestre con **logo, descripción y web** como USDT:

1. **Verificar contratos** (ver sección 1 y [docs/VERIFICATION.md](docs/VERIFICATION.md)).
2. **Completar perfil del token:** logo (URL de `assets/tether-logo.webp` subido a tu web/GitHub), descripción, project website, redes sociales.  
   **Datos listos para copiar/pegar:** [docs/TRONSCAN_DATOS_PEGAR.md](docs/TRONSCAN_DATOS_PEGAR.md). Tras el despliegue ejecuta `npm run post-deploy:perfil` para imprimir tokenAddress y textos.  
   Guía paso a paso: [docs/TRONSCAN_PERFIL_TOKEN.md](docs/TRONSCAN_PERFIL_TOKEN.md).  
   URL (mainnet): **https://tronscan.org/#/tokens/create/TRC20**  
   Siempre usar **tokenAddress** (Proxy) de `deploy-info.json` como dirección del contrato.

## 4. Monitoreo

- **Tronscan:** Ver transacciones del contrato
- **TronGrid API:** `v1/accounts/{address}/transactions/trc20` para historial TRC-20

## 5. Metadata para CoinGecko / CoinMarketCap

- Copiar `token-metadata.json.example` a `token-metadata.json`
- Rellenar: name, symbol, description, website, logo (URL; en el proyecto: `assets/tether-logo.webp`), contractAddress (tokenAddress del deploy)
- Usar al solicitar listing en [CoinGecko](https://www.coingecko.com/en/coins/new) o CoinMarketCap

## 6. EIP-2612 permit — chain IDs para firma off-chain

Si integras `permit` en una DApp o backend que firma mensajes off-chain, usa el **chainId** correcto al construir el mensaje EIP-712:

| Red | chainId (decimal) | chainId (hex) |
|-----|-------------------|---------------|
| Mainnet | 728126428 | 0x2b6653dc |
| Shasta | 2494104990 | 0x94a9059e |
| Nile | 3448148188 | 0xcd8690dc |

El contrato usa `block.chainid` dinámicamente; el firmante off-chain debe usar el mismo valor. Ver [TIP-474/TIP-527](https://medium.com/tronnetwork/how-to-adapt-to-optimization-of-the-return-value-of-chainid-opcode-in-tvm-6160029b64a0).

## 7. Documentación a guardar

Tras el despliegue, conservar en `deploy-info.json` (o copia de seguridad):
- tokenAddress (Proxy — dirección del token)
- implementationAddress
- proxyAdminAddress
- Red (mainnet)

`deploy-info.json` se genera automáticamente con `npm run listo` o `tronbox migrate --network mainnet`.

---

**Checklist pre-despliegue:** compile → lint → `npm run estimate:deploy` → `npm run listo` → verify → token-metadata

**Referencias web:** [TRON Smart Contract Security](https://developers.tron.network/docs/smart-contract-security) · [TRC-20 Protocol](https://developers.tron.network/docs/trc20-protocol-interface) · [Upgradeable TRON (TRON DAO)](https://trondao.medium.com/building-upgradable-tron-smart-contracts-with-a-transparent-proxy-pattern-c4025006cdf0)
