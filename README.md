# Token TRC-20 Upgradeable (TRON)

Token TRC-20 con proxy upgradeable para la red TRON: pausa, freeze, blacklist, EIP-2612 (permit), cap de supply y ownership en dos pasos.

---

## Empieza aquí (solo mainnet, sin errores)

**Proyecto configurado solo para MAINNET.** Ver **[LISTO_AGREGA_LAS_CLAVES.md](LISTO_AGREGA_LAS_CLAVES.md)**.

1. **Abre `.env`** (si no existe: `npm run setup`) y agrega **PRIVATE_KEY** y **TRON_PRO_API_KEY** (ambas obligatorias en mainnet).
2. **`npm run listo`** — compila y despliega en mainnet.
3. **`npm run post-deploy:perfil`** — datos para pegar en Tronscan.

---

## Requisitos

- **Node.js** >= 18
- **TronBox** (incluido como devDependency)
- Cuenta con TRX en mainnet (para fees de despliegue; estimar con `npm run estimate:deploy`)
- Variables de entorno en `.env` (ver [Configuración](#configuración))

## Instalación

```bash
npm install
```

## Configuración (solo dos claves)

Tras `npm install`, el archivo `.env` se crea solo. **Solo tienes que abrirlo y agregar** `PRIVATE_KEY` y `TRON_PRO_API_KEY`. Ver **[CLAVES_PEGAR.md](CLAVES_PEGAR.md)**.

- Si por algún motivo `.env` no existe: `npm run setup` lo crea.
- El resto de variables (token, símbolo, GitHub) tiene valores por defecto; no hace falta tocarlas.
- **Importante:** Nunca subas `.env` a Git. Ver [SECURITY.md](SECURITY.md).
- Logo y web en Tronscan: `trc20-token.config.json` ya está configurado; `npm run post-deploy:perfil` muestra la URL del logo lista para pegar. **Para que esa URL funcione**, el código debe estar en GitHub (rama `master` en este repo); si aún no has subido: `.\scripts\push-a-github.ps1` (ver [docs/GITHUB_PUSH.md](docs/GITHUB_PUSH.md)).

## Compilación

```bash
npm run compile
# o
npm run compile:tronbox
# o
npx tronbox compile
```

El script de despliegue (`deploy-upgradeable.js`) usa los artefactos de `npm run compile`. Si usas solo TronBox, ejecuta `npm run compile:tronbox` antes de desplegar.

## Tests

```bash
npm test
# o
npx tronbox test
```

Requiere un nodo local o configurar TronBox para testnet (por defecto usa `development`).

## Despliegue

### Despliegue (solo mainnet)

```bash
npm run listo
```

Compila y despliega en **mainnet** (implementación + ProxyAdmin + Proxy + inicialización). La dirección del token es la del **Proxy** (se guarda en `deploy-info.json`). Ver [LISTO_AGREGA_LAS_CLAVES.md](LISTO_AGREGA_LAS_CLAVES.md).

### Con TronBox (opcional)

```bash
npx tronbox migrate --network mainnet
```

Solo mainnet está configurado. Para upgrades usa `npm run upgrade`.

## Actualizar implementación (upgrade)

1. Modifica los contratos en `contracts/` (respeta el [layout de storage](docs/COMPARATIVA_BUENAS_PRACTICAS.md)).
2. Compila: `npm run compile`
3. Ejecuta: `npm run upgrade` (mainnet).
4. Opcional: si la nueva versión expone `initializeV2`: `node scripts/initialize-v2.js [version] [cap]`

## Verificación y perfil en Tronscan

1. Genera el paquete de verificación: `npm run prepare:verification`
2. Sigue [docs/VERIFICATION.md](docs/VERIFICATION.md) para verificar cada contrato en Tronscan (mainnet).
3. Completa el perfil del token (logo, descripción, web) en https://tronscan.org/#/tokens/create/TRC20: [referencia Tronscan](https://tronscan.org/#/token20/TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t). Guía: [docs/TRONSCAN_PERFIL_TOKEN.md](docs/TRONSCAN_PERFIL_TOKEN.md) y [docs/PERFIL_IGUAL_QUE_USDT.md](docs/PERFIL_IGUAL_QUE_USDT.md).

Ver [POST-DEPLOY.md](POST-DEPLOY.md) para el checklist completo post-despliegue.

## Scripts disponibles

| Script | Descripción |
|--------|-------------|
| `npm run setup` | Crea `.env` desde plantilla (solo rellena PRIVATE_KEY y TRON_PRO_API_KEY; ver [CLAVES_PEGAR.md](CLAVES_PEGAR.md)) |
| `npm run compile:tronbox` | Compila contratos con TronBox |
| `npm run lint` | Ejecuta Solhint |
| `npm run test` | Ejecuta tests (TronBox) |
| `npm run listo` | Compila + despliega en mainnet (requiere PRIVATE_KEY y TRON_PRO_API_KEY en .env) |
| `npm run estimate:deploy` | Estima coste de despliegue en tiempo real (recursos cuenta + precio energía) |
| `npm run upgrade` | Actualiza implementación en mainnet |
| `npm run prepare:verification` | Prepara carpeta para verificación en Tronscan (mainnet) |
| `npm run post-deploy:perfil` | Tras el despliegue: imprime tokenAddress y datos para pegar en Tronscan |
| `npm run initialize-v2` | Llama a initializeV2 en el proxy: `node scripts/initialize-v2.js [version] [cap]` |
| `npm run security-check` | Lint (revisión de seguridad básica) |

## Documentación

- **[Checklist para desplegar en mainnet (verificación GitHub)](docs/CHECKLIST_DESPLIEGUE_MAINNET.md)** — responde al checklist solicitado en GitHub (red, contrato, wallet, deploy, post-deploy, seguridad y archivos del repo).
- **[Lo necesario para TRON (resumen único)](LO_NECESARIO_TRON.md)** — requisitos, despliegue y perfil en una página.
- [API del token y proxy](docs/API_TOKEN_Y_PROXY.md)
- [Comparativa y buenas prácticas](docs/COMPARATIVA_BUENAS_PRACTICAS.md)
- [Auditoría e informe de correcciones](docs/AUDITORIA_INFORME.md)
- [Herramientas de auditoría (Slither, MythX)](docs/AUDITORIA.md)
- [Seguridad y variables sensibles](SECURITY.md)
- [Verificación en Tronscan](docs/VERIFICATION.md)
- [Datos listos para pegar en Tronscan (logo, descripción, web)](docs/TRONSCAN_DATOS_PEGAR.md)
- [Alineación GitHub y token (operatividad, push, URL logo)](docs/ALINEAMIENTO_GITHUB_Y_TOKEN.md)
- [Comparativa con mainnet y web Tronscan](docs/COMPARATIVA_MAINNET_WEB.md)
- [Perfil del token en TronScan](docs/TRONSCAN_PERFIL_TOKEN.md)
- [USDT en TRON: panorama mainnet y wallets](docs/USDT_TRON_PANORAMA_MAINNET_Y_WALLETS.md)
- [Mostrar el token en billeteras](docs/WALLET_DISPLAY.md)
- [Referencia USDT en TRON (alineación métodos/procedimientos)](docs/USDT_TRON_REFERENCIA.md)
- [Datos exactos USDT para prueba (nombre y símbolo idénticos)](docs/USDT_TRON_DATOS_EXACTOS.md)
- [Entorno y Dev Container](ENTORNO.md)

## Estructura principal

```
contracts/
  TRC20TokenUpgradeable.sol   # Lógica del token
  Initializable.sol
  TransparentUpgradeableProxy.sol
  ProxyAdmin.sol
  Migrations.sol
migrations/
  1_initial_migration.js
  2_deploy_trc20.js
scripts/
  deploy-upgradeable.js      # Deploy en red pública
  upgrade.js                 # Upgrade de implementación
  initialize-v2.js           # Llamada a initializeV2 tras upgrade
  prepare-verification.js
  respaldar-proyecto.ps1
test/
  TRC20TokenUpgradeable.test.js
docs/
  API_TOKEN_Y_PROXY.md
  COMPARATIVA_BUENAS_PRACTICAS.md
  AUDITORIA.md
  AUDITORIA_INFORME.md
  VERIFICATION.md
  WALLET_DISPLAY.md
  USDT_TRON_REFERENCIA.md
  USDT_TRON_DATOS_EXACTOS.md
tronbox.js
```

## Licencia

MIT
