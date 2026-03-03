# Datos listos para pegar en Tronscan (perfil idéntico a USDT)

Tras el despliegue, abre la URL según tu red y pega estos datos en el perfil del token. La **dirección del contrato** la obtienes de `deploy-info.json` → `tokenAddress` (o ejecutando `node scripts/post-deploy-perfil.js`).

---

## 1. URLs de Tronscan (crear/editar perfil)

**Este proyecto está configurado solo para mainnet.**

| Red     | URL |
|---------|-----|
| Mainnet | https://tronscan.org/#/tokens/create/TRC20 |

---

## 2. Descripción (Description / token_desc)

Copia y pega este texto en el campo **Description** (o adapta a tu proyecto):

```
Token TRC-20 estable vinculado a USD en la red TRON. Compatible con wallets y exploradores estándar.
```

Versión más corta (estilo USDT):

```
Token estable oficial en la red TRON.
```

---

## 3. Logo (imgUrl / icon_url)

Tronscan **no permite subir archivos**; pide una **URL** de la imagen. El formato, tamaño y uso del logo actual cumplen lo que mainnet/Tronscan requieren ([LOGO_MAINNET_REQUISITOS.md](LOGO_MAINNET_REQUISITOS.md)).

- **Logo:** `assets/tether-logo.webp`
- **URL real:** Rellena `trc20-token.config.json` (githubUser, githubRepo, branch, y opcionalmente logoPathInRepo). Después de desplegar, ejecuta `npm run post-deploy:perfil` y se imprimirá la **URL del logo** lista para pegar en Tronscan.
- Si no usas la config, sube el archivo a tu web o GitHub y construye la URL:
  - GitHub raw: `https://raw.githubusercontent.com/TU_USUARIO/TU_REPO/RAMA/blockchain/trc20-token/assets/tether-logo.webp` (sustituye TU_USUARIO, TU_REPO y **RAMA**: en este repo es `master`).
  - Tu web: `https://tudominio.com/tether-logo.webp`

---

## 4. Project website (home_page / projectSite)

Pega la URL de tu proyecto. Si rellenaste `websiteUrl` en `trc20-token.config.json`, esa misma URL se muestra al ejecutar `npm run post-deploy:perfil`. Si no:

```
https://tudominio.com
```

---

## 5. Redes sociales (opcional)

Si el formulario de Tronscan lo pide:

| Campo   | Ejemplo |
|---------|---------|
| Twitter | https://twitter.com/tuproyecto |
| Telegram| https://t.me/tuproyecto |

---

## 6. Checklist rápido

1. [ ] Despliegue hecho; tienes `deploy-info.json` con `tokenAddress`.
2. [ ] Abres la URL de Tronscan (tabla del punto 1) según tu red.
3. [ ] Conectas wallet (owner/desplegador).
4. [ ] Introduces la **dirección del contrato** = `tokenAddress` de `deploy-info.json`.
5. [ ] Pegas **Description** (punto 2).
6. [ ] Pegas **URL del logo** (punto 3; antes sube `assets/tether-logo.webp` a tu web o GitHub).
7. [ ] Pegas **Project website** (punto 4).
8. [ ] Guardas el perfil.

Con esto el token se verá **idéntico** en tipo de ficha a [USDT en Tronscan](https://tronscan.org/#/token20/TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t) (logo, descripción, web).
