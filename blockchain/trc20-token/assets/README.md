# Logo del token

## Estructura

| Archivo | Tamaño | Uso |
|---------|--------|-----|
| `colateral-logo.png` | fuente | Original. No eliminar. |
| `logo.png` | 256×256 | Tronscan, Trust Wallet, Pinata |
| `logo-200.png` | 200×200 | CoinGecko, CoinMarketCap |
| `logo-128.png` | 128×128 | Iconos pequeños |
| `logo.webp` | 256×256 | Web, CDN |

## Comandos (solo logo)

```bash
npm run generate:logo      # Genera formatos desde colateral-logo.png
npm run upload:logo:pinata  # Sube logo.png a IPFS (requiere PINATA_JWT en .env)
```

## URLs públicas

- **Pinata:** `trc20-token.config.json` → `logoUrlPinata`
- **GitHub raw:** `.../blockchain/trc20-token/assets/logo.png`
- **Perfil:** `token-profile.json` (solo datos públicos)

## Seguridad

- `PINATA_JWT` solo en `.env` (gitignored). Nunca en commits.
