# Protección de información sensible

## Qué está protegido

- **PRIVATE_KEY:** Solo se lee desde `process.env.PRIVATE_KEY` (archivo `.env`). No hay claves por defecto ni hardcodeadas en el código.
- **TRON_PRO_API_KEY:** Solo desde `process.env.TRON_PRO_API_KEY` (opcional, para Mainnet).
- **.env** está en `.gitignore` y no se sube a Git. También se ignoran `.env.local`, `.env.*.local`, `deploy-info.json`, `*.pem`, `*.key`, `secrets/`, **`archivos_delicados/`** (copia local de archivos .env del equipo; no subir ni exponer).

## Dónde se usa cada variable

| Variable           | Uso                                      | Archivos                    |
|-------------------|------------------------------------------|-----------------------------|
| PRIVATE_KEY       | Firma de transacciones (deploy, migrate) | tronbox.js, deploy-upgradeable.js, upgrade.js |
| TRON_PRO_API_KEY  | Cabecera con TronGrid (mainnet)          | deploy-upgradeable.js, upgrade.js |
| TOKEN_*           | Parámetros del token al desplegar        | deploy-upgradeable.js       |

## Qué debes hacer

1. **Crear `.env`** a partir de `.env.example` o `ENV_TEMPLATE.txt` y rellenar solo en tu máquina.
2. **No subir** `.env` a ningún repositorio ni compartirlo por correo/chat.
3. **No pegar** PRIVATE_KEY ni API keys en el código, en issues ni en commits.
4. Si usas respaldos o nube, guarda `.env` cifrado o en un lugar restringido; no lo incluyas en copias públicas.

## Revisión realizada

- Eliminada cualquier clave por defecto en `tronbox.js` (la red `development` exige PRIVATE_KEY en `.env`).
- Scripts de deploy y upgrade usan solo `process.env`; no hay secretos en el código.
- `.gitignore` incluye `.env`, variantes de `.env.*` y archivos de claves/respaldo sensibles.
