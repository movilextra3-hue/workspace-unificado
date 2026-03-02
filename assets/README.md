# Logo del token

## Logo

**`tether-logo.webp`** — Logo del token para TronScan y billeteras. Formato y tamaño están alineados con lo que mainnet/Tronscan requieren (solo piden URL; ver [docs/LOGO_MAINNET_REQUISITOS.md](../docs/LOGO_MAINNET_REQUISITOS.md)).

## Uso en TronScan

TronScan pide una **URL** del logo (no subir archivo). Sube `tether-logo.webp` a tu web o a GitHub y pega esa URL en el perfil del token.

- Tu web: `https://tudominio.com/tether-logo.webp`
- GitHub raw: `https://raw.githubusercontent.com/TU_USUARIO/TU_REPO/main/blockchain/trc20-token/assets/tether-logo.webp`

URLs Tronscan: Mainnet https://tronscan.org/#/tokens/create/TRC20 — Nile https://nile.tronscan.org/#/tokens/create/TRC20 — Shasta https://shasta.tronscan.org/#/tokens/create/TRC20

Datos listos para pegar: [docs/TRONSCAN_DATOS_PEGAR.md](../docs/TRONSCAN_DATOS_PEGAR.md). Tras el despliegue: `npm run post-deploy:perfil`.
