# Comparativa: proyecto vs mainnet y web (Tronscan)

Datos de **USDT en TRON mainnet** obtenidos de la API de Tronscan (`apilist.tronscanapi.com`) comparados con lo que proporciona este proyecto.

---

## 1. USDT en mainnet (referencia real)

**Contrato:** `TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t`  
**Página:** https://tronscan.org/#/token20/TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t

| Campo (API Tronscan) | Valor en mainnet (USDT) |
|----------------------|-------------------------|
| **name** (ref. USDT) | Nombre tipo USDT |
| **symbol** | USDT |
| **decimals** | 6 |
| **token_desc** | Descripción del token (ej. colateral en TRON). |
| **icon_url** | https://static.tronscan.org/production/logo/usdtlogo.png |
| **home_page** | URL web del proyecto (ej. https://tudominio.com) |
| **contract_address** | TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t |
| **contract_name** | Nombre del contrato (ej. TRC20TokenUpgradeable) |
| **social_media_list** | Redes sociales del proyecto |
| **white_paper** | URL del whitepaper si aplica |
| **issue_time** | 2019-04-16 12:41:20 |
| **tokenType** | trc20 |

*Precio (priceInUsd, volume24h, etc.) lo aporta Tronscan/agregadores, no el perfil del token.*

---

## 2. Dónde se define cada cosa en nuestro proyecto

| Campo | On-chain (contrato) | Nuestro proyecto | Coincide con mainnet |
|-------|----------------------|------------------|----------------------|
| **name** | Sí (initialize) | `.env` → `TOKEN_NAME=Colateral USD` | ✅ Igual |
| **symbol** | Sí (initialize) | `.env` → `TOKEN_SYMBOL=USDT` | ✅ Igual |
| **decimals** | Sí (initialize) | `.env` → `TOKEN_DECIMALS=6` | ✅ Igual |
| **token_desc** | No (perfil Tronscan) | [TRONSCAN_DATOS_PEGAR.md](TRONSCAN_DATOS_PEGAR.md) — texto listo para pegar | ✅ Estilo equivalente |
| **icon_url** | No (perfil Tronscan) | `assets/colateral-logo.webp` — subir a web/GitHub y pegar URL en Tronscan; formato/tamaño OK mainnet ([LOGO_MAINNET_REQUISITOS.md](LOGO_MAINNET_REQUISITOS.md)) | ✅ Mismo tipo (URL) |
| **home_page** | No (perfil Tronscan) | TRONSCAN_DATOS_PEGAR → "Project website" | ✅ Mismo tipo |
| **contract_address** | Se obtiene al desplegar | `deploy-info.json` → `tokenAddress` (Proxy) | ✅ Uso correcto |
| **social_media_list** | No (perfil Tronscan) | TRONSCAN_DATOS_PEGAR → redes opcionales | ✅ Opcional |
| **white_paper** | No (perfil Tronscan) | Opcional; añadir URL si se tiene | ✅ Opcional |

---

## 3. URLs de la web (mainnet)

| Uso | URL |
|-----|-----|
| Ver token USDT (referencia) | https://tronscan.org/#/token20/TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t |
| Crear/editar perfil token TRC20 | https://tronscan.org/#/tokens/create/TRC20 |
| Verificar contratos | https://tronscan.org/#/contracts/verify |
| API token TRC20 (ejemplo) | https://apilist.tronscanapi.com/api/token_trc20?contract=DIRECCION |

Las mismas rutas en **Nile** y **Shasta** usan `nile.tronscan.org` y `shasta.tronscan.org`.

---

## 4. Resumen

- **On-chain (al desplegar):** name, symbol, decimals y supply los fijamos con `.env` (ENV_TEMPLATE ya trae Colateral USD, USDT, 6, 1000000). Eso coincide con lo que muestra mainnet para USDT.
- **Perfil en la web (Tronscan):** token_desc, icon_url, home_page, redes y white_paper se rellenan en Tronscan tras el despliegue. En el proyecto están listos los textos y el logo (`assets/colateral-logo.webp`); solo falta subir el logo a una URL y pegar todos los datos según [TRONSCAN_DATOS_PEGAR.md](TRONSCAN_DATOS_PEGAR.md).
- **Dirección del token:** En mainnet la dirección pública del token es la del contrato (en nuestro caso el Proxy). Nosotros usamos `tokenAddress` de `deploy-info.json`; Tronscan y la API usan ese mismo valor como `contract_address`.

Con el flujo actual (deploy + perfil con TRONSCAN_DATOS_PEGAR) el token queda alineado con lo que exige la web y mainnet para mostrarse como USDT (mismo tipo de ficha: nombre, símbolo, decimales, descripción, logo, web).
