# Solo mainnet — agrega las claves

El proyecto está configurado **solo para MAINNET**. No hay opción de testnet; así se evitan errores de red o de API.

---

## 1. Crea `.env` (solo la primera vez)

En la carpeta del proyecto (`blockchain/trc20-token`):

```bash
npm run setup
```

(Si ya hiciste `npm install`, `.env` puede haberse creado solo.)

---

## 2. Abre `.env` y agrega las dos claves (obligatorias)

Ambas son **obligatorias** para mainnet:

```env
PRIVATE_KEY=tu_clave_privada_64_hex_sin_0x
TRON_PRO_API_KEY=tu_api_key_de_trongrid_io
```

| Clave | Dónde |
|-------|--------|
| **PRIVATE_KEY** | Clave privada de la wallet (64 hex, sin `0x`). La wallet debe tener TRX en mainnet. |
| **TRON_PRO_API_KEY** | [trongrid.io](https://www.trongrid.io/) — crear cuenta y API key. Sin ella TronGrid limita las peticiones y el deploy puede fallar. |

No cambies el resto del archivo.

---

## 3. Desplegar

```bash
npm run listo
```

Compila y despliega en mainnet. Después:

```bash
npm run post-deploy:perfil
```

para obtener la dirección del token y los textos para Tronscan.

---

## Resumen

| Paso | Acción |
|------|--------|
| 1 | `npm run setup` (si no tienes `.env`) |
| 2 | Abrir `.env` y agregar **PRIVATE_KEY** y **TRON_PRO_API_KEY** |
| 3 | `npm run listo` |
| 4 | `npm run post-deploy:perfil` → pegar en https://tronscan.org/#/tokens/create/TRC20 |

**Importante:** No subas `.env` a Git. No compartas tus claves.
