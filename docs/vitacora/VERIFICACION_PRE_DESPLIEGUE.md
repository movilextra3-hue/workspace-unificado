# Verificación pre-despliegue (mainnet)

Lista de comprobación antes de ejecutar `npm run listo`. Todo debe estar ✅ para desplegar sin errores.

---

## 1. Configuración

| Comprobación | Cómo verificar |
| --- | --- |
| **Solo mainnet** | `tronbox.js` tiene una sola red `mainnet`; scripts usan `https://api.trongrid.io`. |
| **.env existe** | En `blockchain/trc20-token` existe el archivo `.env` (si no: `npm run setup`). |
| **PRIVATE_KEY** | En `.env`, línea `PRIVATE_KEY=` con 64 caracteres hex (sin `0x`). |
| **TRON_PRO_API_KEY** | En `.env`, línea `TRON_PRO_API_KEY=` con tu API key de [trongrid.io](https://www.trongrid.io/). |
| **trc20-token.config.json** | Tiene `githubUser`, `githubRepo`, `branch` (main o master), `logoPathInRepo` (para URL del logo en Tronscan). |

---

## 2. Código y compilación

| Comprobación | Cómo verificar |
| --- | --- |
| **Contratos** | Existen `contracts/TRC20TokenUpgradeable.sol`, `TransparentUpgradeableProxy.sol`, `ProxyAdmin.sol`. |
| **Compilación** | `npm run compile` termina sin errores (Initializable, Migrations, ProxyAdmin, TRC20TokenUpgradeable, TransparentUpgradeableProxy). |
| **Lint** | `npm run lint` termina sin errores. |
| **Build** | Existe `build/contracts/` con los `.json` de los contratos (se crea al compilar). |

---

## 3. Wallet y red

| Comprobación | Cómo verificar |
| --- | --- |
| **TRX en mainnet** | La dirección derivada de tu `PRIVATE_KEY` tiene TRX en mainnet. |
| **Estimación** | (Opcional) `npm run estimate:deploy` para ver coste estimado y recursos; recomendado 400–500 TRX. |

---

## 4. GitHub (para el logo en Tronscan)

| Comprobación | Cómo verificar |
| --- | --- |
| **Código en GitHub** | El repo está subido en la rama `main` o `master` (o la indicada en `trc20-token.config.json`). |
| **Logo en el repo** | La ruta `assets/colateral-logo.webp` (o la de `logoPathInRepo`) existe en el repo. |
| **URL raw** | Abre en el navegador: `https://raw.githubusercontent.com/{githubUser}/{githubRepo}/{branch}/{logoPathInRepo}` (valores de `trc20-token.config.json`) y comprueba que carga la imagen. |

---

## 5. Seguridad — Datos sensibles no expuestos

| Comprobación | Cómo verificar |
| --- | --- |
| **.env no en Git** | `.env` está en `.gitignore`. Ejecuta `git status` y confirma que **no** aparecen `.env`, `deploy-info.json` ni archivos con `*credential*`, `*secret*`, `*.pat`, `GITHUB_TOKEN` en la lista de archivos a subir. |
| **Sin claves en código ni en docs** | Ningún archivo del repo contiene valores reales de PRIVATE_KEY (64 hex) ni TRON_PRO_API_KEY. Solo se usan nombres de variables (p. ej. `process.env.PRIVATE_KEY`) o plantillas vacías (`ENV_TEMPLATE.txt`). |
| **deploy-info.json no se sube** | Tras el despliegue se genera `deploy-info.json` (direcciones del proxy/impl/admin); está en `.gitignore`. No hacer `git add deploy-info.json`. |
| **PAT / tokens** | Si usas GitHub, el PAT no debe estar guardado en ningún archivo del proyecto; solo en el gestor de credenciales o al teclearlo cuando Git lo pida. Ver [SECURITY.md](../SECURITY.md). |

---

## Orden recomendado para desplegar

1. Completar todas las comprobaciones anteriores.
2. `npm run listo` (compila y despliega).
3. Anotar la dirección del token (Proxy) que imprime el script.
4. `npm run post-deploy:perfil` (datos para Tronscan).
5. Completar perfil en <https://tronscan.org/#/tokens/create/TRC20>.
6. (Opcional) `npm run prepare:verification` y verificar contratos en Tronscan.

---

**Última revisión:** marzo 2026 — configuración solo mainnet, documentos alineados, compilación y lint correctos. Auditorías: [AUDITORIA_PROFESIONAL_COMPLETA.md](AUDITORIA_PROFESIONAL_COMPLETA.md), [AUDITORIA_MAXIMO_NIVEL_SIN_OMISIONES.md](AUDITORIA_MAXIMO_NIVEL_SIN_OMISIONES.md).
