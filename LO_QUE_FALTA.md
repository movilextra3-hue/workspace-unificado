# Lo que falta (checklist real)

Qué está **ya hecho** y qué **solo tú** puedes hacer (datos privados).  
**Resumen:** Solo tienes que poner en `.env` la **PRIVATE_KEY** y la **TRON_PRO_API_KEY**. Ver **[CLAVES_PEGAR.md](CLAVES_PEGAR.md)**.

---

## 1. `.env` — solo dos claves

- **Hecho:** Plantilla lista (`ENV_TEMPLATE.txt`). Ejecuta `npm run setup` y se crea `.env` con todos los valores por defecto (token, símbolo, GitHub desde config, etc.).
- **Solo tú:** Abre `.env` y rellena **solo**:
  - `PRIVATE_KEY=` — tu clave privada (64 caracteres hex, sin `0x`)
  - `TRON_PRO_API_KEY=` — tu API key de trongrid.io (recomendado para mainnet)
  Nadie más puede hacerlo (son tus credenciales).

---

## 2. Cuenta GitHub (URL real del logo)

- **Hecho:** `trc20-token.config.json` ya tiene `githubUser`, `githubRepo`, `branch` y `logoPathInRepo`. El script `post-deploy:perfil` usa ese config (o .env o git remote si no está).
- **Solo tú:** No hace falta rellenar nada más para el logo si usas el repo actual; la URL del logo saldrá sola. Si cambias de repo, edita `trc20-token.config.json`.

---

## 3. Repo en GitHub — HECHO

- **Hecho:** Repo https://github.com/movilextra3-hue/workspace-unificado con el código del token. **Push completado.** La URL del logo para Tronscan es válida.

---

## 4. TRX en la wallet

- **Solo tú:** La dirección que sale de tu `PRIVATE_KEY` debe tener TRX en la red donde vayas a desplegar. Envía TRX a esa dirección antes de `npm run deploy:mainnet` (o la red que uses).

---

## 5. Desplegar

- **Hecho:** Scripts listos (`npm run compile`, `npm run deploy:mainnet`, etc.).
- **Solo tú:** Ejecutar `npm run compile` y luego `npm run deploy:nile` / `deploy:shasta` / `deploy:mainnet`. Se crea `deploy-info.json` con `tokenAddress`.

---

## 6. Perfil en Tronscan

- **Hecho:** Textos y pasos en `docs/TRONSCAN_DATOS_PEGAR.md`. Tras el deploy, `npm run post-deploy:perfil` imprime todo (incluida la URL del logo si rellenaste `trc20-token.config.json`).
- **Solo tú:** Abrir Tronscan, conectar wallet, pegar dirección del contrato, descripción, URL del logo y web.

---

## Resumen

**Ya hecho:** Todo implementado. Tras `npm install` se crea `.env`; config (GitHub, logo, web) en `trc20-token.config.json`; scripts `listo`, `listo:nile`, `listo:shasta` (compilan + despliegan).  
**Solo tú (solo mainnet):** Agregar **PRIVATE_KEY** y **TRON_PRO_API_KEY** en `.env` (ambas obligatorias) → tener TRX en mainnet en la wallet → `npm run listo` → `npm run post-deploy:perfil` → perfil en Tronscan. Ver [CLAVES_PEGAR.md](CLAVES_PEGAR.md).
