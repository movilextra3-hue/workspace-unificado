# Token TRC-20 Upgradeable (TRON)

Token TRC-20 con proxy upgradeable para la red TRON: pausa, freeze, blacklist, EIP-2612 (permit), cap de supply y ownership en dos pasos.

---

## Empieza aquí (solo mainnet, sin errores)

**Proyecto configurado solo para MAINNET.** Ver **[LISTO_AGREGA_LAS_CLAVES.md](LISTO_AGREGA_LAS_CLAVES.md)**. Antes del primer deploy: [docs/VERIFICACION_PRE_DESPLIEGUE.md](docs/VERIFICACION_PRE_DESPLIEGUE.md). **Procedimiento comprobado** (despliegue + verificación en Tronscan sin gastar TRX en vano): [docs/PROCEDIMIENTO_DESPLIEGUE_VERIFICACION.md](docs/PROCEDIMIENTO_DESPLIEGUE_VERIFICACION.md). **Verificación de contratos + metadata/logo para billeteras:** [docs/GUIA_VERIFICACION_Y_PERFIL_TOKEN.md](docs/GUIA_VERIFICACION_Y_PERFIL_TOKEN.md).

**Completar el token (reutilizar ProxyAdmin) — forma recomendada:** 1) `npm run setup` si no tienes `.env`. 2) Rellena en `.env`: **PRIVATE_KEY**, **TRON_PRO_API_KEY** y **PROXY_ADMIN_ADDRESS** (ya viene en la plantilla). 3) Ejecuta **`npm run deploy:complete:dry`** (comprueba todo sin gastar TRX). 4) Si todo OK: **`npm run deploy:complete`** (compila si falta, verifica saldo y ProxyAdmin, pide SÍ y despliega). Un solo flujo, sin TronBox migrate ni estado de migraciones. [docs/NO_GASTAR_TRX_A_LO_PENDEJO.md](docs/NO_GASTAR_TRX_A_LO_PENDEJO.md).

1. **Abre `.env`** (si no existe: `npm run setup`) y agrega **PRIVATE_KEY** y **TRON_PRO_API_KEY** (ambas obligatorias en mainnet).
2. **`npm run deploy:dry-run`** — valida que las 3 transacciones se construyen bien; **no gasta TRX**.
3. **`npm run estimate:deploy`** — comprueba saldo y energía en mainnet.
4. **`npm run listo`** — compila, valida de nuevo, comprueba saldo, pide escribir **SÍ** y despliega en mainnet.
5. **`npm run post-deploy:perfil`** — datos para pegar en Tronscan.

---

## Requisitos

- **Node.js** >= 18 (alineado con [TronBox Installation](https://tronbox.io/docs/guides/installation); resumen en [docs/TRONBOX_INSTALACION.md](docs/TRONBOX_INSTALACION.md))
- **TronBox** (incluido como devDependency; no hace falta instalación global)
- Cuenta con TRX en mainnet (para fees de despliegue; estimar con `npm run estimate:deploy`)
- Variables de entorno en `.env` (ver [Configuración](#configuración-solo-dos-claves))

*Opcional:* Docker Engine >=17 si usas funcionalidades que lo requieran. En Windows, si TronBox falla por conflictos de nombres, ver [Resolve naming conflicts on Windows](https://tronbox.io/docs/reference/configuration#resolve-naming-conflicts-on-windows).

## Instalación

```bash
npm install
```

Comprobar que TronBox responde (usa la versión local del proyecto):

```bash
npx tronbox version
```

## Configuración (solo dos claves)

Tras `npm install`, el archivo `.env` se crea solo. **Solo tienes que abrirlo y agregar** `PRIVATE_KEY` y `TRON_PRO_API_KEY`. Ver **[CLAVES_PEGAR.md](CLAVES_PEGAR.md)**.

- Si por algún motivo `.env` no existe: `npm run setup` lo crea.
- El resto de variables (token, símbolo, GitHub) tiene valores por defecto; no hace falta tocarlas.
- **Importante:** Nunca subas `.env` a Git. Ver [SECURITY.md](SECURITY.md).
- Logo y web en Tronscan: logo en `assets/colateral-logo.webp`; `trc20-token.config.json` tiene `logoPathInRepo`. `npm run post-deploy:perfil` muestra la URL del logo para pegar. Para Trust Wallet (listado): `npm run generate:logo` genera `colateral-logo.png` 256×256. Ver [assets/README.md](assets/README.md). **Para que la URL funcione**, el código debe estar en GitHub (rama `main` o `master`); si aún no has subido: `.\scripts\push-a-github.ps1` (ver [docs/GITHUB_PUSH.md](docs/GITHUB_PUSH.md)).

## Compilación

- **`npm run compile`** — compila con solc (EVM). Artefactos en `build/contracts/` son bytecode EVM. Sirve para revisar código o entornos que no usen TronBox; **no** uses esos artefactos para desplegar o hacer upgrade en TRON.
- **`npm run compile:tronbox`** (o `npx tronbox compile`) — compila con TronBox (TVM). **Obligatorio** para `npm run listo`, `npm run upgrade`, `npm run migrate-3-safe` y `npm run estimate:deploy` en mainnet. Los scripts de despliegue y la verificación previa a migrate-3 usan estos artefactos.

```bash
npm run compile:tronbox
# o
npx tronbox compile
```

## Tests

```bash
npm test
# o
npx tronbox test
```

Este proyecto está configurado solo para mainnet; los tests con TronBox pueden requerir ajuste de red si se ejecutan localmente.

## Despliegue

### Despliegue (solo mainnet)

El script **no envía ninguna transacción** hasta que: (1) las 3 tx se construyen bien, (2) hay al menos 80 TRX y margen de energía, (3) escribes **SÍ** para confirmar.

```bash
npm run deploy:dry-run   # opcional: validar sin gastar TRX
npm run estimate:deploy # ver saldo y energía
npm run listo           # desplegar (pide confirmación SÍ)
```

Compila y despliega en **mainnet** (implementación + ProxyAdmin + Proxy + inicialización). La dirección del token es la del **Proxy** (se guarda en `deploy-info.json`). Ver [LISTO_AGREGA_LAS_CLAVES.md](LISTO_AGREGA_LAS_CLAVES.md).

### Completar token reutilizando ProxyAdmin (recomendado — flujo único)

Si ya tienes ProxyAdmin desplegada y solo quieres desplegar Implementation + Proxy, usa **un solo comando** que hace todo en orden (valida .env, compila si falta, verifica ProxyAdmin y saldo, pide confirmación y despliega):

```bash
npm run deploy:complete:dry   # 1. Comprueba todo sin gastar TRX
npm run deploy:complete       # 2. Despliega (compila si falta, pide SÍ, escribe deploy-info.json)
```

- **Sin TronBox migrate**: no depende del estado del contrato Migrations.
- **Un solo script**: comprobaciones, compilación y despliegue en orden; mensajes claros y salida con los siguientes pasos.
- Opcional: `npm run deploy:complete -- --yes` o `AUTO_CONFIRM=1 npm run deploy:complete` para no pedir SÍ (útiles en CI).

### Con TronBox (opcional)

```bash
npx tronbox migrate --network mainnet
```

Solo mainnet está configurado. Para upgrades usa `npm run upgrade`.

## Actualizar implementación (upgrade)

1. Modifica los contratos en `contracts/` (respeta el [layout de storage](docs/COMPARATIVA_BUENAS_PRACTICAS.md)).
2. Compila: `npm run compile:tronbox` (mainnet requiere bytecode TVM).
3. Ejecuta: `npm run upgrade` (mainnet).
4. Opcional: si la nueva versión expone `initializeV2`: `node scripts/initialize-v2.js [version] [cap]`

## Verificación y perfil en Tronscan

**Flujo automatizado (Implementation):** `npm run verify:implementation` — genera el paquete, comprueba estado en Tronscan, intenta OKLink API y escribe `verification/reporte-verificacion-implementation.txt` con pasos manuales si la API no soporta TRX. Ver [docs/VERIFICACION_AUTOMATIZADA.md](docs/VERIFICACION_AUTOMATIZADA.md).

1. Genera el paquete de verificación: `npm run prepare:verification`
2. Sigue [docs/VERIFICATION.md](docs/VERIFICATION.md) y [docs/VERIFICAR_TYqRvxio_PASOS.md](docs/VERIFICAR_TYqRvxio_PASOS.md). **Referencia oficial TRON:** [developers.tron.network/docs/contract-verification](https://developers.tron.network/docs/contract-verification); resumen en [docs/VERIFICACION_OFICIAL_TRON.md](docs/VERIFICACION_OFICIAL_TRON.md).
3. Completa el perfil del token (logo, descripción, web) en [Tronscan](https://tronscan.org/#/tokens/create/TRC20). Checklist: [docs/PERFIL_TOKEN_CHECKLIST_COMPLETO.md](docs/PERFIL_TOKEN_CHECKLIST_COMPLETO.md). Guía: [docs/TRONSCAN_PERFIL_TOKEN.md](docs/TRONSCAN_PERFIL_TOKEN.md) y [docs/PERFIL_IGUAL_QUE_USDT.md](docs/PERFIL_IGUAL_QUE_USDT.md).

Ver [POST-DEPLOY.md](POST-DEPLOY.md) para el checklist completo post-despliegue.

## Etapas y fases del proyecto

**Documento maestro (orden de fases y qué hacer en cada una):** [docs/ETAPAS_Y_FASES_DEL_PROYECTO.md](docs/ETAPAS_Y_FASES_DEL_PROYECTO.md).

Tras el despliegue, ejecuta **`npm run post-deploy:steps`** para actualizar ABI/artefactos e imprimir los datos para Tronscan; luego completa perfil y verificación en Tronscan (pasos manuales).

## Siguientes pasos (tras el despliegue)

| Paso | Descripción |
| ------ | ----------- |
| **Post-despliegue** | `npm run post-deploy:steps` (actualiza abi/, imprime datos para perfil). Luego: guardar deploy-info.json, completar perfil en Tronscan, verificar contratos. |
| **Perfil en Tronscan** | [docs/PERFIL_TOKEN_CHECKLIST_COMPLETO.md](docs/PERFIL_TOKEN_CHECKLIST_COMPLETO.md) — checklist completo. Datos con `post-deploy:perfil`; pasos en [docs/TRONSCAN_PERFIL_TOKEN.md](docs/TRONSCAN_PERFIL_TOKEN.md). |
| **Verificación del Implementation** | Proxy (token) y ProxyAdmin ya verificables. Si el Implementation no pasa: [docs/REDESPLIEGUE_IMPLEMENTATION_RECOMENDACION.md](docs/REDESPLIEGUE_IMPLEMENTATION_RECOMENDACION.md). |
| **Código en GitHub** | Transparencia; la URL del logo sale de ahí. [docs/GITHUB_PUSH.md](docs/GITHUB_PUSH.md). |
| **Listado en wallets** | [docs/LISTADO_WALLETS_IGUAL_QUE_USDT.md](docs/LISTADO_WALLETS_IGUAL_QUE_USDT.md). |
| **¿Se muestra en billeteras con todos los datos?** | [docs/TOKEN_EN_BILLETERAS_RESUMEN.md](docs/TOKEN_EN_BILLETERAS_RESUMEN.md) — cuándo sí (al añadirlo) y cuándo no (lista automática como USDT). |

## Scripts disponibles

| Script | Descripción |
| ------ | ----------- |
| `npm run setup` | Crea `.env` desde plantilla (solo rellena PRIVATE_KEY y TRON_PRO_API_KEY; ver [CLAVES_PEGAR.md](CLAVES_PEGAR.md)) |
| `npm run compile:tronbox` | Compila contratos con TronBox |
| `npm run lint` | Ejecuta Solhint |
| `npm run test` | Ejecuta tests (TronBox) |
| `npm run listo` | Compila + despliega en mainnet (requiere PRIVATE_KEY y TRON_PRO_API_KEY en .env) |
| `npm run estimate:deploy` | Estima coste de despliegue en tiempo real (recursos cuenta + precio energía) |
| **`npm run deploy:complete`** | **Completar token (recomendado).** Flujo único: valida .env, compila si falta, verifica ProxyAdmin y saldo, pide SÍ y despliega Impl + Proxy. TronWeb solo; sin TronBox migrate. |
| **`npm run deploy:complete:dry`** | Mismas comprobaciones que deploy:complete sin enviar ninguna tx. Usar antes del despliegue real. |
| `npm run deploy:reuse-admin` | Completar token solo despliegue (sin comprobaciones previas). Requiere compilado y .env listo. |
| `npm run migrate-3-safe` | Alternativa vía TronBox migrate -f 3 (puede fallar si la migración ya está marcada ejecutada). |
| `npm run prepare:migrate-3` | Crea .env desde plantilla si no existe (PROXY_ADMIN_ADDRESS ya puesta) y ejecuta la verificación; no gasta TRX. Usar antes del primer migrate-3-safe. |
| `npm run verify:before-migrate-3` | Solo verificación previa (balance, energía, PROXY_ADMIN_ADDRESS, feeLimit); no gasta TRX. |
| `npm run upgrade` | Actualiza implementación en mainnet |
| `npm run prepare:verification` | Prepara carpeta para verificación en Tronscan (mainnet) |
| `npm run verify:tronscan:open` | Abre Tronscan, rellena formulario y sube archivo; solo resolver CAPTCHA y pulsar Verify |
| `npm run verify:tronscan:2captcha` | Igual que open + resuelve reCAPTCHA con 2captcha (requiere CAPTCHA_2CAPTCHA_API_KEY en .env) |
| `npm run verify:contract:check` | Comprueba si el contrato Implementation está verificado en Tronscan |
| `npm run verify:oklink` | Comprueba estado en Tronscan, intenta OKLink API, escribe informe en verification/ |
| `npm run verify:implementation` | prepare:verification + verify:oklink (flujo completo con informe) |
| `npm run post-deploy:perfil` | Tras el despliegue: imprime tokenAddress y datos para pegar en Tronscan |
| **`npm run post-deploy:steps`** | **Tras el deploy:** actualiza ABI + imprime datos perfil + recordatorio de pasos manuales |
| `npm run check:perfil` | Valida que esté todo listo para el perfil (deploy-info, config, logo en assets/) |
| `npm run generate:logo` | Genera `colateral-logo.png` 256×256 desde `colateral-logo.webp` (para Trust Wallet). Tronscan usa el .webp. Ver [assets/README.md](assets/README.md). |
| `npm run perfil:tronscan:open` | Abre Tronscan perfil del token y rellena dirección, descripción, logo URL y web; tú conectas wallet y guardas |
| `npm run initialize-v2` | Llama a initializeV2 en el proxy: `node scripts/initialize-v2.js [version] [cap]` |
| `npm run security-check` | Lint (revisión de seguridad básica) |

## Documentación

- **[No gastar TRX sin verificar](docs/NO_GASTAR_TRX_A_LO_PENDEJO.md)** — reglas en código y checklist para no gastar TRX a lo pendejo (solo migrate-3-safe para completar token; no bajar feeLimit).
- **[Etapas y fases del proyecto (maestro)](docs/ETAPAS_Y_FASES_DEL_PROYECTO.md)** — orden de fases (pre-despliegue, despliegue, post-despliegue, perfil/verificación, opcional) y qué completar en cada una.
- **[Checklist para desplegar en mainnet (verificación GitHub)](docs/CHECKLIST_DESPLIEGUE_MAINNET.md)** — responde al checklist solicitado en GitHub (red, contrato, wallet, deploy, post-deploy, seguridad y archivos del repo).
- **[Garantía post-despliegue (sin inconvenientes)](docs/GARANTIA_POST_DESPLIEGUE.md)** — qué está comprobado y los 4 pasos obligatorios tras el deploy (incl. verificación y perfil para logo y sin alertas).
- **[¿Token listo para mostrarse en billeteras con todos los datos?](docs/TOKEN_EN_BILLETERAS_RESUMEN.md)** — resumen: al añadirlo por dirección sí (con perfil + verificación); en lista automática como USDT no (hay que solicitar listado).
- **[Evitar problemas en wallets](docs/EVITAR_PROBLEMAS_WALLETS.md)** — por qué no aparece automáticamente, por qué no hay logo o hay alertas, y qué hacer (verificar + perfil + instrucciones para usuarios).
- **[Listado en wallets (igual que USDT)](docs/LISTADO_WALLETS_IGUAL_QUE_USDT.md)** — cómo solicitar que el token esté en la lista por defecto de Trust Wallet, TronLink y otras para que aparezca sin que el usuario lo añada.
- **[Adapter oficial para DApps (wallets)](docs/WALLET_ADAPTER_OFICIAL.md)** — [tronweb3/tronwallet-adapter](https://github.com/tronweb3/tronwallet-adapter): conectar TronLink, Trust, WalletConnect, etc. desde tu web; `wallet_watchAsset` para añadir el token con un clic.
- **[Vitácora (resumen único)](docs/vitacora/VITACORA.md)** — requisitos, procedimientos, estado y registro.
- **[Detalles y valores del token](docs/DETALLES_Y_VALORES_DEL_TOKEN.md)** — dónde se definen nombre, símbolo, decimales, supply y metadata; cómo actualizarlos.
- [API del token y proxy](docs/API_TOKEN_Y_PROXY.md)
- [ABI y artefactos (abi/, token-info.json, cómo actualizar y usar en DApps)](docs/ABI_Y_ARTIFACTS.md)
- [Comparativa y buenas prácticas](docs/COMPARATIVA_BUENAS_PRACTICAS.md)
- [Auditoría e informe de correcciones](docs/AUDITORIA_INFORME.md)
- [Herramientas de auditoría (Slither, MythX)](docs/AUDITORIA.md)
- [Seguridad y variables sensibles](SECURITY.md)
- [Verificación en Tronscan](docs/VERIFICATION.md)
- [¿Redesplegar Implementation para verificar? (recomendación y pasos)](docs/REDESPLIEGUE_IMPLEMENTATION_RECOMENDACION.md)
- [Perfil del token — checklist completo](docs/PERFIL_TOKEN_CHECKLIST_COMPLETO.md)
- [Datos listos para pegar en Tronscan (logo, descripción, web)](docs/TRONSCAN_DATOS_PEGAR.md)
- [Alineación GitHub y token (operatividad, push, URL logo)](docs/ALINEAMIENTO_GITHUB_Y_TOKEN.md)
- [Verificación frente a documentación oficial (TRON, TronGrid, TronScan, GitHub)](docs/VERIFICACION_OFICIAL_PLATAFORMAS.md)
- [Verificación de flujos de todos los contratos](docs/VERIFICACION_FLUJOS_CONTRATOS.md) — revisión de cada función y correcciones (mint, recoverToken, initializeV2).
- [**Auditoría profesional completa**](docs/AUDITORIA_PROFESIONAL_COMPLETA.md) — vs estándar TRC-20 oficial y [Smart Contract Security](https://developers.tron.network/docs/smart-contract-security) TRON.
- [**Auditoría máximo nivel (sin omisiones)**](docs/AUDITORIA_MAXIMO_NIVEL_SIN_OMISIONES.md) — revisión exhaustiva de cada contrato, script, config y documento.
- [Comparativa con mainnet y web Tronscan](docs/COMPARATIVA_MAINNET_WEB.md)
- [Perfil del token en TronScan](docs/TRONSCAN_PERFIL_TOKEN.md)
- [USDT en TRON: panorama mainnet y wallets](docs/USDT_TRON_PANORAMA_MAINNET_Y_WALLETS.md)
- [Mostrar el token en billeteras](docs/WALLET_DISPLAY.md)
- [Referencia USDT en TRON (alineación métodos/procedimientos)](docs/USDT_TRON_REFERENCIA.md)
- [Datos exactos USDT para prueba (nombre y símbolo idénticos)](docs/USDT_TRON_DATOS_EXACTOS.md)
- [Entorno y Dev Container](ENTORNO.md)

## Estructura principal

```text
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
