# Alineación GitHub y token TRON (operatividad)

Para que el despliegue, el perfil en Tronscan y la URL del logo funcionen correctamente, todo debe estar alineado con GitHub.

---

## 1. Repositorio y rama

| Concepto | Valor en este proyecto |
|----------|------------------------|
| **Repo** | `movilextra3-hue/workspace-unificado` (monorepo) |
| **Rama** | `master` (el script de push y `trc20-token.config.json` usan `master`) |
| **Carpeta del token** | `blockchain/trc20-token` |

El **.git** suele estar en la raíz del workspace (`e:\workspace-unificado`). Al ejecutar `.\scripts\push-a-github.ps1` desde `blockchain/trc20-token`, Git usa ese repositorio y sube los cambios a `origin master`.

---

## 2. Configuración que usa GitHub

**Archivo:** `trc20-token.config.json` (en la raíz del token).

- **githubUser** / **githubRepo**: usuario y nombre del repo (para construir la URL del logo).
- **branch**: rama donde está el código (`master` en este repo).
- **logoPathInRepo**: ruta del logo **desde la raíz del repo**. En este repo (master = raíz del token) es `assets/colateral-logo.webp`.

La URL del logo que imprime `npm run post-deploy:perfil` es:

```
https://raw.githubusercontent.com/movilextra3-hue/workspace-unificado/master/assets/colateral-logo.webp
```

Esa URL **solo funciona** si el código está subido a GitHub en la rama `master` y el archivo existe en esa ruta.

---

## 3. Push a GitHub (PAT, no contraseña)

GitHub **no acepta contraseña** para `git push`; solo **Personal Access Token (PAT)**.

1. Crear PAT: [GitHub → Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens) → "Generate new token (classic)", permiso **repo**.
2. En la carpeta del token: **`.\scripts\push-a-github.ps1`**
3. Cuando pida **Password**, pegar el **PAT** (no la contraseña de la cuenta).

Ver [GITHUB_PUSH.md](GITHUB_PUSH.md) y [PASOS_TOKEN_GITHUB.md](PASOS_TOKEN_GITHUB.md).

---

## 4. Orden recomendado (operatividad)

| Orden | Acción | Motivo |
|-------|--------|--------|
| 1 | Rellenar `.env` con **PRIVATE_KEY** y **TRON_PRO_API_KEY** | Obligatorio para deploy en mainnet. |
| 2 | (Opcional pero recomendado) **`.\scripts\push-a-github.ps1`** | Así la URL del logo ya existe cuando completes el perfil en Tronscan. |
| 3 | **`npm run listo`** | Compila y despliega en mainnet. |
| 4 | **`npm run post-deploy:perfil`** | Imprime tokenAddress, descripción y **URL del logo** para pegar en Tronscan. |
| 5 | Completar perfil en https://tronscan.org/#/tokens/create/TRC20 | Pegar dirección del contrato (Proxy), descripción, URL del logo. |

Si despliegas antes de hacer push, la URL del logo solo funcionará **después** de que subas el código a GitHub (misma rama y ruta).

---

## 5. Qué no subir a Git

- **.env** (claves y API key) — está en `.gitignore`.
- **deploy-info.json** (direcciones del deploy) — está en `.gitignore`.
- **PAT de GitHub** — no guardarlo en ningún archivo del proyecto.

**Sí** se sube: `trc20-token.config.json` con usuario/repo/rama/ruta del logo (son datos públicos del repo).

---

## 6. Resumen de archivos clave

| Archivo | Uso |
|---------|-----|
| `trc20-token.config.json` | GitHub user/repo, branch, logoPathInRepo; lo usa `post-deploy-perfil.js` para la URL del logo. |
| `scripts/push-a-github.ps1` | Push a `origin master`; al pedir password usar PAT. |
| `docs/GITHUB_PUSH.md` | Instrucciones PAT y push. |
| `docs/PASOS_TOKEN_GITHUB.md` | Pasos visuales para crear el PAT. |
| `.gitignore` | Incluye `.env`, `deploy-info.json`, `*.key`, `secrets/`, etc. |

Con esta alineación, el token desplegado en mainnet y el perfil en Tronscan (con logo vía GitHub) quedan operativos de forma coherente.
