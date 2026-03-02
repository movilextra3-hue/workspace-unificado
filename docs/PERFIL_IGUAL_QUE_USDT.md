# Cómo hacer que tu token se vea igual que USDT en Tronscan

**Referencia:** [USDT en Tronscan (mainnet)](https://tronscan.org/#/token20/TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t)

Para que tu token se muestre **tal cual** al despliegue y en billeteras (con logo, descripción, web y mismo tipo de ficha):

---

## 1. Al desplegar (datos on-chain)

El contrato debe tener **nombre, símbolo y decimales** igual que la referencia. En tu `.env`:

| Variable        | Valor (estilo USDT) | Descripción        |
|-----------------|---------------------|---------------------|
| `TOKEN_NAME`    | Tether USD          | Nombre completo     |
| `TOKEN_SYMBOL`  | USDT                | Símbolo (ticker)    |
| `TOKEN_DECIMALS`| 6                   | Decimales (6 para stablecoin) |
| `TOKEN_SUPPLY`  | 1000000             | Supply inicial en unidades |

`ENV_TEMPLATE.txt` ya trae estos valores. Solo necesitas definir `PRIVATE_KEY` y, si quieres, `TRON_PRO_API_KEY`.

Despliegue:

```bash
npm run deploy:mainnet
# o deploy:nile / deploy:shasta
```

Tras el despliegue, **la dirección del token** es la del Proxy (la que imprime el script y guarda en `deploy-info.json` → `tokenAddress`). Esa es la que se usa en Tronscan y en billeteras.

---

## 2. En Tronscan (perfil = logo, descripción, web)

En la referencia USDT, Tronscan muestra:

| Campo (API)     | Ejemplo USDT | Tú debes poner |
|-----------------|--------------|----------------|
| **Logo (icon_url)** | URL del logo oficial | **URL** de tu logo: sube `assets/tether-logo.webp` a tu web o GitHub y pega la URL. Ver [assets/README.md](../assets/README.md) y [TRONSCAN_DATOS_PEGAR.md](TRONSCAN_DATOS_PEGAR.md). |
| **Description (token_desc)** | "USDT is the official stablecoin issued by Tether on the TRON network." | Tu descripción corta (1–2 frases). |
| **Project website (home_page)** | https://tether.to/ | Tu web (ej. https://tudominio.com). |
| **Social media** | Twitter, etc. | Tus redes si las tienes. |
| **White paper** | URL opcional | Opcional. |

**Dónde completarlo:**

- Mainnet: https://tronscan.org/#/tokens/create/TRC20  
- Nile: https://nile.tronscan.org/#/tokens/create/TRC20  
- Shasta: https://shasta.tronscan.org/#/tokens/create/TRC20  

Pasos: conectar wallet (owner/desplegador) → abrir la URL → introducir la **dirección del contrato** = `tokenAddress` de `deploy-info.json` → rellenar Logo (URL), Description, Project website, redes → guardar.

Tronscan **no sube archivos**: el logo es siempre una **URL** (tu imagen en tu web, GitHub raw, etc.).

---

## 3. Resumen

| Fase        | Dónde              | Qué hacer |
|------------|--------------------|------------|
| **Despliegue** | `.env` + `npm run deploy:mainnet` | Name = Tether USD, Symbol = USDT, Decimals = 6 (ya en ENV_TEMPLATE). |
| **Perfil** | Tronscan → tokens/create/TRC20 | Logo (URL), descripción, web, redes. |
| **Verificación** | Tronscan → Contract Verify | Opcional pero recomendado antes de dar por cerrado el perfil. |

Con esto, tu token se ve **tal cual** al despliegue (mismo nombre/símbolo/decimales) y en Tronscan/billeteras con el mismo tipo de ficha (logo, descripción, web) que la referencia USDT.
