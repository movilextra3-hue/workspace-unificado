# Token TRC-20 Upgradeable (TRON)

Token TRC-20 con proxy upgradeable para la red TRON: pausa, freeze, blacklist, EIP-2612 (permit), cap de supply y ownership en dos pasos.

## Requisitos

- **Node.js** >= 18
- **TronBox** (incluido como devDependency)
- Cuenta con TRX (Nile/Shasta para testnet, Mainnet para producción)
- Variables de entorno en `.env` (ver [Configuración](#configuración))

## Instalación

```bash
npm install
```

## Configuración

1. Copia las variables de entorno:

   ```bash
   # Windows (PowerShell)
   Copy-Item ENV_TEMPLATE.txt .env
   # o crea .env manualmente con el contenido de ENV_TEMPLATE.txt
   ```

2. Edita `.env` y define al menos:

   - `PRIVATE_KEY`: clave privada de la wallet (64 caracteres hex, sin `0x`)
   - Opcional: `TRON_PRO_API_KEY` (TronGrid), `TOKEN_NAME`, `TOKEN_SYMBOL`, `TOKEN_DECIMALS`, `TOKEN_SUPPLY`

**Importante:** Nunca subas `.env` a Git. Ver [SEGURIDAD.md](SEGURIDAD.md).

3. **(Opcional pero recomendado)** Rellena `trc20-token.config.json` con tu usuario y repo de GitHub, rama y URL de tu web. Así `npm run post-deploy:perfil` mostrará la **URL real del logo** para pegar en Tronscan. Ver [LO_QUE_FALTA.md](LO_QUE_FALTA.md).

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

### Con script (recomendado)

Despliega implementación + ProxyAdmin + Proxy e inicializa el token en una red pública:

```bash
npm run deploy:nile    # Testnet Nile
npm run deploy:shasta  # Testnet Shasta
npm run deploy:mainnet # Mainnet
```

La **dirección del token** que deben usar los usuarios es la del **Proxy** (se muestra al final y se guarda en `deploy-info.json`). Para que el token se muestre en billeteras con nombre, símbolo y decimales correctos, ver [Mostrar el token en billeteras](docs/WALLET_DISPLAY.md).

### Con TronBox migrate

```bash
npx tronbox migrate --network nile
# o shasta / mainnet
```

Genera `deploy-info.json` en Nile/Shasta/Mainnet para usar con `npm run upgrade:*`.

## Actualizar implementación (upgrade)

1. Modifica los contratos en `contracts/` (respeta el [layout de storage](docs/COMPARATIVA_BUENAS_PRACTICAS.md)).
2. Compila: `npm run compile:tronbox`
3. Ejecuta el upgrade:

   ```bash
   npm run upgrade:nile
   # o upgrade:shasta / upgrade:mainnet
   ```

4. Opcional: si la nueva versión usa `initializeV2` (p. ej. para fijar `cap` o versión), llámala una vez desde el proxy:

   ```bash
   node scripts/initialize-v2.js nile
   ```

   (Requiere `deploy-info.json` y que el contrato tenga `initializeV2`.)

## Verificación y perfil en Tronscan

1. Genera el paquete de verificación: `npm run prepare:verification`
2. Sigue las instrucciones en [docs/VERIFICATION.md](docs/VERIFICATION.md) para verificar cada contrato en Tronscan (Nile/Shasta/Mainnet).
3. Tras verificar, completa el perfil del token (logo, descripción, web) para que **se vea igual que USDT** en mainnet: [referencia Tronscan](https://tronscan.org/#/token20/TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t). Guía: [docs/TRONSCAN_PERFIL_TOKEN.md](docs/TRONSCAN_PERFIL_TOKEN.md) y [docs/PERFIL_IGUAL_QUE_USDT.md](docs/PERFIL_IGUAL_QUE_USDT.md).

Ver [POST-DEPLOY.md](POST-DEPLOY.md) para el checklist completo post-despliegue.

## Scripts disponibles

| Script | Descripción |
|--------|-------------|
| `npm run compile:tronbox` | Compila contratos con TronBox |
| `npm run lint` | Ejecuta Solhint |
| `npm run test` | Ejecuta tests (TronBox) |
| `npm run deploy:nile` | Despliega en Nile |
| `npm run deploy:shasta` | Despliega en Shasta |
| `npm run deploy:mainnet` | Despliega en Mainnet |
| `npm run upgrade:nile` | Actualiza implementación en Nile |
| `npm run upgrade:shasta` | Actualiza implementación en Shasta |
| `npm run upgrade:mainnet` | Actualiza implementación en Mainnet |
| `npm run prepare:verification` | Prepara carpeta para verificación en Tronscan |
| `npm run post-deploy:perfil` | Tras el despliegue: imprime tokenAddress y datos para pegar en Tronscan |
| `npm run initialize-v2` | Llama a initializeV2 en el proxy (uso: `npm run initialize-v2 -- nile [version] [cap]`) |
| `npm run security-check` | Lint (revisión de seguridad básica) |

## Documentación

- **[Lo necesario para TRON (resumen único)](LO_NECESARIO_TRON.md)** — requisitos, despliegue y perfil en una página.
- [API del token y proxy](docs/API_TOKEN_Y_PROXY.md)
- [Comparativa y buenas prácticas](docs/COMPARATIVA_BUENAS_PRACTICAS.md)
- [Auditoría e informe de correcciones](docs/AUDITORIA_INFORME.md)
- [Herramientas de auditoría (Slither, MythX)](docs/AUDITORIA.md)
- [Seguridad y variables sensibles](SEGURIDAD.md)
- [Verificación en Tronscan](docs/VERIFICATION.md)
- [Datos listos para pegar en Tronscan (logo, descripción, web)](docs/TRONSCAN_DATOS_PEGAR.md)
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
