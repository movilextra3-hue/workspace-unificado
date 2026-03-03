# Lo necesario para TRON — Solo mainnet

Proyecto configurado **solo para MAINNET**. Todo lo imprescindible para desplegar el token TRC-20 en mainnet y que se vea correctamente en Tronscan.

---

## Antes del despliegue

| Requisito | Dónde | Acción |
|-----------|--------|--------|
| **Dos claves (obligatorias)** | `.env` | Abre `.env` (si no existe: `npm run setup`) y agrega `PRIVATE_KEY=` y `TRON_PRO_API_KEY=`. Ver [CLAVES_PEGAR.md](CLAVES_PEGAR.md). |
| **TRX en mainnet** | Wallet | La dirección que desplegará (derivada de `PRIVATE_KEY`) debe tener TRX en **mainnet**. |
| **Desplegar** | Terminal | `npm run listo` — compila y despliega en mainnet. |

El resto está configurado (token, símbolo, GitHub en `trc20-token.config.json`).  
Proyecto configurado solo para mainnet. `TRON_PRO_API_KEY` es obligatoria (el script la exige y evita errores de TronGrid).

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

2. **Abrir Tronscan (mainnet):** https://tronscan.org/#/tokens/create/TRC20  

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
| [CLAVES_PEGAR.md](CLAVES_PEGAR.md) | **Solo dos claves:** dónde poner PRIVATE_KEY y TRON_PRO_API_KEY |
| [LO_QUE_FALTA.md](LO_QUE_FALTA.md) | Checklist real: qué falta y en qué orden hacerlo |
| [DESPLIEGUE_TRON_CHECKLIST.md](DESPLIEGUE_TRON_CHECKLIST.md) | Checklist completo pre/post despliegue |
| [docs/TRONSCAN_DATOS_PEGAR.md](docs/TRONSCAN_DATOS_PEGAR.md) | Textos y pasos para pegar en el perfil Tronscan |
| [docs/PERFIL_IGUAL_QUE_USDT.md](docs/PERFIL_IGUAL_QUE_USDT.md) | Cómo dejar el token con el mismo tipo de ficha que USDT |
| [docs/VERIFICATION.md](docs/VERIFICATION.md) | Verificar código de contratos en Tronscan |
| [POST-DEPLOY.md](POST-DEPLOY.md) | Checklist post-despliegue (wallets, metadata, chainId) |
| [docs/TRONSCAN_PERFIL_TOKEN.md](docs/TRONSCAN_PERFIL_TOKEN.md) | Guía del perfil del token en Tronscan |
| [docs/COMPARATIVA_MAINNET_WEB.md](docs/COMPARATIVA_MAINNET_WEB.md) | Comparativa proyecto vs mainnet y web (Tronscan) |
| [docs/ALINEACION_TRON_OFFICIAL.md](docs/ALINEACION_TRON_OFFICIAL.md) | Verificación frente a documentación oficial TRON (TRC-20, TronGrid, Tronscan) |
| [assets/README.md](assets/README.md) | Uso del logo (tether-logo.webp) |
| [docs/LOGO_MAINNET_REQUISITOS.md](docs/LOGO_MAINNET_REQUISITOS.md) | Formato, tamaño y requisitos del logo para mainnet |

---

## Resumen en una línea

**Necesario (solo mainnet):** Abrir `.env` y agregar **PRIVATE_KEY** y **TRON_PRO_API_KEY** ([CLAVES_PEGAR.md](CLAVES_PEGAR.md)) → TRX en mainnet en la wallet → `npm run listo` → `npm run post-deploy:perfil` → pegar datos en https://tronscan.org/#/tokens/create/TRC20
