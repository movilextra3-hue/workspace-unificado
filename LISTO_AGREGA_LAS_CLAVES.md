# ✅ TODO ESTÁ COMPLETADO Y LISTO (solo mainnet)

**El proyecto está configurado solo para MAINNET.** Sin testnets, sin errores de red.

La única acción que falta es la tuya:

---

## 1. Abre el archivo `.env`

Ruta: `e:\workspace-unificado\blockchain\trc20-token\.env`

(Si no existe, ejecuta en esa carpeta: `npm run setup`.)

---

## 2. Agrega estas dos claves (ambas obligatorias)

Pega tus valores en estas dos líneas:

```
PRIVATE_KEY=tu_clave_privada_64_caracteres_hex_sin_0x
TRON_PRO_API_KEY=tu_api_key_de_trongrid_io
```

- **PRIVATE_KEY:** clave privada de la wallet que desplegará (64 hex, sin `0x`). Esa wallet debe tener **TRX en mainnet**.
- **TRON_PRO_API_KEY:** API key de [trongrid.io](https://www.trongrid.io/). Obligatoria en mainnet (evita errores de límite).

---

## 3. Despliega

En la carpeta `blockchain/trc20-token`:

```bash
npm run listo
```

Compila y despliega en mainnet. Luego:

```bash
npm run post-deploy:perfil
```

para ver los datos listos para pegar en Tronscan (https://tronscan.org/#/tokens/create/TRC20).

---

**Resumen:** Abre `.env` → agrega **PRIVATE_KEY** y **TRON_PRO_API_KEY** → ejecuta **`npm run listo`**. Nada más.

---

## Opcional (para que el logo se vea en Tronscan)

La URL del logo que imprime `npm run post-deploy:perfil` apunta a GitHub. Para que funcione, el código debe estar subido en la rama correcta (`master` en este repo):

1. En la carpeta `blockchain/trc20-token`: **`.\scripts\push-a-github.ps1`**
2. Cuando pida **Password**, pega tu **Personal Access Token** (PAT) de GitHub, no la contraseña. Ver [docs/GITHUB_PUSH.md](docs/GITHUB_PUSH.md) y [docs/PASOS_TOKEN_GITHUB.md](docs/PASOS_TOKEN_GITHUB.md).
