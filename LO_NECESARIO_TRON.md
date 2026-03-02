# Lo necesario para TRON — Resumen único

Todo lo imprescindible para desplegar el token TRC-20 en TRON y que se vea correctamente en Tronscan y billeteras.

---

## Antes del despliegue

| Requisito | Dónde | Acción |
|-----------|--------|--------|
| **Clave privada** | `.env` | Crear `.env` desde `ENV_TEMPLATE.txt` y rellenar `PRIVATE_KEY=` (64 caracteres hex, sin 0x). |
| **TRX en la wallet** | Red elegida | La dirección que desplegará (derivada de `PRIVATE_KEY`) debe tener TRX (Nile/Shasta testnet o mainnet). |
| **Compilación** | Terminal | `npm run compile` (genera `build/contracts/` que usa el script de deploy). |

Opcional en `.env`: `TRON_PRO_API_KEY`, `TOKEN_NAME`, `TOKEN_SYMBOL`, `TOKEN_DECIMALS`, `TOKEN_SUPPLY` (por defecto ya vienen tipo USDT en la plantilla).

---

## Despliegue

```bash
npm run deploy:nile     # Testnet Nile
npm run deploy:shasta   # Testnet Shasta
npm run deploy:mainnet  # Mainnet
```

Al terminar se imprime la **dirección del token (Proxy)** y se crea `deploy-info.json` con `tokenAddress`, `implementationAddress`, `proxyAdminAddress`. La dirección que usan usuarios y billeteras es **tokenAddress**.

---

## Después del despliegue (perfil en Tronscan)

1. **Ejecutar:** `npm run post-deploy:perfil`  
   → Imprime la dirección del token, la URL de Tronscan y los textos para copiar/pegar.

2. **Abrir Tronscan** (según red):
   - Mainnet: https://tronscan.org/#/tokens/create/TRC20  
   - Nile: https://nile.tronscan.org/#/tokens/create/TRC20  
   - Shasta: https://shasta.tronscan.org/#/tokens/create/TRC20  

3. **Completar el perfil** con los datos de [docs/TRONSCAN_DATOS_PEGAR.md](docs/TRONSCAN_DATOS_PEGAR.md):
   - Dirección del contrato = `tokenAddress` de `deploy-info.json`
   - Description (texto listo en ese doc)
   - Logo: subir `assets/tether-logo.webp` a tu web o GitHub y pegar la URL (formato/tamaño válidos para mainnet: [docs/LOGO_MAINNET_REQUISITOS.md](docs/LOGO_MAINNET_REQUISITOS.md))
   - Project website

4. **Opcional pero recomendado:** Verificar contratos en Tronscan (`npm run prepare:verification` y [docs/VERIFICATION.md](docs/VERIFICATION.md)).

---

## Lo que falta (obligatorio revisar)

Ver **[LO_QUE_FALTA.md](LO_QUE_FALTA.md)** — lista real de lo que tienes que hacer: `.env`, `trc20-token.config.json` (URL del logo y web), repo en GitHub, TRX, deploy, perfil Tronscan.

---

## Documentación TRON (referencia rápida)

| Documento | Para qué |
|-----------|----------|
| [LO_QUE_FALTA.md](LO_QUE_FALTA.md) | Checklist real: qué falta y en qué orden hacerlo |
| [DESPLIEGUE_TRON_CHECKLIST.md](DESPLIEGUE_TRON_CHECKLIST.md) | Checklist completo pre/post despliegue |
| [docs/TRONSCAN_DATOS_PEGAR.md](docs/TRONSCAN_DATOS_PEGAR.md) | Textos y pasos para pegar en el perfil Tronscan |
| [docs/PERFIL_IGUAL_QUE_USDT.md](docs/PERFIL_IGUAL_QUE_USDT.md) | Cómo dejar el token con el mismo tipo de ficha que USDT |
| [docs/VERIFICATION.md](docs/VERIFICATION.md) | Verificar código de contratos en Tronscan |
| [POST-DEPLOY.md](POST-DEPLOY.md) | Checklist post-despliegue (wallets, metadata, chainId) |
| [docs/TRONSCAN_PERFIL_TOKEN.md](docs/TRONSCAN_PERFIL_TOKEN.md) | Guía del perfil del token en Tronscan |
| [docs/COMPARATIVA_MAINNET_WEB.md](docs/COMPARATIVA_MAINNET_WEB.md) | Comparativa proyecto vs mainnet y web (Tronscan) |
| [assets/README.md](assets/README.md) | Uso del logo (tether-logo.webp) |
| [docs/LOGO_MAINNET_REQUISITOS.md](docs/LOGO_MAINNET_REQUISITOS.md) | Formato, tamaño y requisitos del logo para mainnet |

---

## Resumen en una línea

**Necesario:** `.env` con `PRIVATE_KEY` + TRX en la wallet → `npm run compile` → `npm run deploy:<red>` → `npm run post-deploy:perfil` → pegar datos en Tronscan según [docs/TRONSCAN_DATOS_PEGAR.md](docs/TRONSCAN_DATOS_PEGAR.md).
