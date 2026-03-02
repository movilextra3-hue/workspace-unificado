# Lo que falta (checklist real)

Qué está **ya hecho** por el asistente y qué **solo tú** puedes hacer (datos privados o cuentas).

---

## 1. `.env` — YA CREADO

- **Hecho:** El archivo `.env` existe en la raíz con todas las variables. `PRIVATE_KEY=` está vacío.
- **Solo tú:** Pega tu clave privada (64 caracteres hex, sin `0x`) después de `PRIVATE_KEY=` en `.env`. Nadie más puede hacerlo (es tu clave).

---

## 2. Cuenta GitHub (URL real del logo)

- **Hecho:** El script `post-deploy:perfil` usa la cuenta de **.env** (`GITHUB_USER`, `GITHUB_REPO`, `GITHUB_BRANCH`, `WEBSITE_URL`) o, si no están, la de **git remote origin** (este repo o la carpeta padre). Así usas la misma cuenta que en Cursor/Git.
- **Solo tú:** En `.env` rellena `GITHUB_USER=` y `GITHUB_REPO=` con tu usuario y repo de GitHub (o añade `git remote add origin https://github.com/USUARIO/REPO.git` y el script los tomará de ahí). Opcional: `trc20-token.config.json` con los mismos datos.

---

## 3. Repo en GitHub — YA CONFIGURADO

- **Hecho:** Git inicializado, **commit creado**, **remote añadido** (`origin` → https://github.com/movilextra3-hue/workspace-unificado.git). Usuario y repo en `.env` y `trc20-token.config.json`.
- **Solo tú:** Crear el repo en GitHub (una vez): abre https://github.com/new?name=workspace-unificado, inicia sesión, clic en **Create repository** (sin README). Luego ejecuta `.\scripts\push-a-github.ps1` o `git push -u origin master`.

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

**Ya hecho:** `.env` creado (solo falta pegar PRIVATE_KEY), Git inicializado, config y scripts listos.  
**Solo tú:** Pegar PRIVATE_KEY, rellenar config (usuario/repo/web), añadir remote y push a GitHub, TRX, deploy, pegar datos en Tronscan.
