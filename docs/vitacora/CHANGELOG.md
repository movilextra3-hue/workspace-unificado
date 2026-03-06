# Changelog

Todos los cambios notables del proyecto se documentan aquí.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).

## [1.0.0] - 2026-02-21

### Añadido

- Token TRC-20 upgradeable (Proxy + Implementation + ProxyAdmin)
- Funciones estándar: transfer, approve, transferFrom, allowance, balanceOf, totalSupply
- increaseAllowance, decreaseAllowance (mitigan race condition)
- Pause/Unpause
- Mint, burn, burnFrom, forceBurn
- Ownership en dos pasos: proposeOwnership, acceptOwnership, cancelOwnershipTransfer
- Freeze/Unfreeze, Blacklist, destroyBlackFunds
- recoverTokens, getAddressStatus
- EIP-2612 permit (approve sin gas)
- Bloqueo transfer a address(0) y address(this)
- Scripts: deploy-upgradeable, upgrade, prepare-verification
- Migración TronBox con deploy-info.json
- NatSpec completo
- Tests amplios (40+)
- Documentación: README, UPGRADEABLE, VERIFICATION, POST-DEPLOY, SECURITY
- Solhint, token-metadata.json.example
- deploy-info.json.example
- chain IDs TRON para permit (POST-DEPLOY §6): Mainnet 728126428, Shasta 2494104990, Nile 3448148188

### Cambiado

- upgrade.js: try-catch JSON.parse, normalización hex→base58 para deploy-info.json
- prepare-verification.js: try-catch JSON.parse
- POST-DEPLOY: sección chain IDs permit, referencias documentación TRON
- README: checklist chainId permit

### Corregido

- tronbox.js: typo en compilers.solc.settings

### Actualizado (2026-02-21)

- Node.js: engines >= 18.0.0 (Node 14 EOL)
- Solhint: ^4.0.0 → ^6.0.0
- Script lint: comillas para compatibilidad Windows

### Revisión exhaustiva (2026-02-21)

- tronbox.js: indentación corregida en compilers.solc.settings
- deploy-upgradeable.js: try-catch loadArtifact, validación decimals (0-255), validación PRIVATE_KEY (64 hex)
- upgrade.js: try-catch JSON artifacts, validación PRIVATE_KEY
- compile-with-solc.js: verificación existencia contracts/, findImports robusto

### Actualización final (2026-02-21)

- npm update: dependencias al día
- Verificación: compile, test, lint OK

## [1.0.0] — Flujo único de despliegue y correcciones (2026-03-04)

### Añadido

- **scripts/deploy-complete-token.js** — Flujo único: valida .env, compila si falta, verifica ProxyAdmin y saldo, confirmación (o `--yes`/AUTO_CONFIRM), despliega Impl + Proxy + initialize. Sin TronBox migrate.
- **npm run deploy:complete** y **npm run deploy:complete:dry** — Comando recomendado para completar el token reutilizando ProxyAdmin.
- **scripts/initialize-proxy-once.js** — Llama `initialize()` en un Proxy ya desplegado (para completar si el deploy falló en ese paso).
- **docs/DESPLIEGUE_FLUJO_UNICO.md** — Documentación del flujo con deploy:complete.
- **docs/COMPLETAR_INITIALIZE_SI_FALLO.md** — Cómo completar initialize por Tronscan o con el script si falló tras desplegar Proxy.
- **docs/DIAGNOSTICO_PROBLEMA_REAL.md** — Causa del fallo con TronBox migrate (estado Migrations) y opciones.
- **docs/ESTADO_SISTEMA_Y_RED.md** — Verificación de procesos, puertos, caché y conexión a Trongrid.
- **scripts/check-tronbox-config.js** y **npm run check:tronbox-config** — Comprueba lo que ve TronBox (claves, fullHost, feeLimit) sin mostrar valores.

### Cambiado

- **deploy-complete-token.js:** flag `--yes` y variable AUTO_CONFIRM para omitir la pregunta SÍ; espera a confirmación del Proxy (hasta ~60 s) antes de llamar initialize; mensaje si no se detecta confirmación.
- **README:** Completar token recomendado vía `deploy:complete:dry` y `deploy:complete`; tabla de scripts actualizada.
- **tronbox.js:** Carga de .env por ruta fija; normalización de PRIVATE_KEY (64 hex) y TRON_PRO_API_KEY en fullHost con encodeURIComponent.
- **scripts/verify-before-migrate-3.js** y **deploy-upgradeable.js:** Carga de .env con path explícito (no dependen del cwd).
- **ENV_TEMPLATE.txt:** Formato esperado de PRIVATE_KEY y TRON_PRO_API_KEY; errores frecuentes.
- **.eslintignore:** tronbox.js excluido para evitar que el IDE abra el archivo por lint.
- **package.json:** lint:js sin tronbox.js en la lista.

---

## [1.0.0] — Actualización y guardado (2026-03-04)

### Cambiado

- **tronbox.js:** feeLimit de 300 a **450 TRX** (450000000) para que verify-before-migrate-3 pase con 0 energía delegada y el deploy complete sin OUT_OF_ENERGY.
- **scripts/desplegar-completar-token.js:** Variable `MIGRATE_3_VERIFIED` pasada directamente en `env` de execSync (sin cross-env) para que TronBox la reciba correctamente en Windows. Comprobación tras migrate: si `deploy-info.json` no existe o tiene direcciones placeholder (TXXX...), el script sale con código 1 y mensaje claro (no se da el despliegue por válido).
- **.cursor/rules/workspace-unificado.mdc:** Regla para no abrir ni poner foco en `tronbox.js` salvo que el usuario lo pida (evita que la ventana se abra sola).

### Añadido

- **docs/CONTRATOS_DESPLIEGUE_Y_VERIFICACION.md** — Cuántos contratos se despliegan (2) y cuántos verificar en Tronscan (3), con procedimiento paso a paso.
- **docs/PENDIENTE_ORDEN_Y_PROCEDIMIENTO.md** — (2026-03-06: consolidado en VITACORA.md; archivo eliminado.)
- **docs/CHECKLIST_PRE_DESPLIEGUE.md** — Checklist pre-despliegue (env, claves, verify, comando).
- **docs/SI_DEPLOY_INFO_QUEDA_PLACEHOLDER.md** — Qué hacer si deploy-info.json sigue con placeholders tras migrate-3-safe.
- **docs/COMPROBACIONES_FINALES_SIN_GASTAR.md**, **docs/VERIFICACION_SIN_GASTAR.md** — Resultados de comprobaciones sin gastar TRX.
- **docs/CONTEXTO_DESPLIEGUE_ACTUAL.md** — Contexto para el agente y el usuario sobre el despliegue pendiente.
- **scripts/check-env-safe.js** y script **npm run check:env** — Comprueba .env sin mostrar valores sensibles.
- **docs/CURSOR_ABRE_TRONBOX_Y_VENTANA.md** — Actualizado con la regla añadida y causas del comportamiento.

### Actualizado

- **docs/CHECKLIST_PRE_DESPLIEGUE.md:** feeLimit esperado 450000000 (450 TRX).
- **docs/EJEMPLIFICACION_FUNCIONAMIENTO_Y_PENDIENTE.md:** Sección de ajustes realizados para evitar fallos en el despliegue.
- **docs/NO_GASTAR_TRX_A_LO_PENDEJO.md:** Tabla de lo que fallaba antes y correcciones; garantías saldo/API/claves.
- **deploy-upgradeable.js:** MIN_BALANCE_TRX 200 TRX; varias fuentes de balance y toSun() para no confundir TRX/SUN.
- **verify-before-migrate-3.js:** Timeout 15 s en peticiones; mensajes claros cuando balance = 0; sugerencia VERIFY_BALANCE_TRX.

---

## [1.0.0] — Actualización documentación y auditorías (2026-03-02)

### Añadido

- **docs/AUDITORIA_PROFESIONAL_COMPLETA.md** — Auditoría vs estándar TRC-20 oficial y [Smart Contract Security](https://developers.tron.network/docs/smart-contract-security) TRON.
- **docs/AUDITORIA_MAXIMO_NIVEL_SIN_OMISIONES.md** — Auditoría exhaustiva sin exclusiones (contratos línea a línea, scripts, configs, migraciones, documentación y enlaces).
- **docs/WALLET_ADAPTER_OFICIAL.md** — Referencia a [tronweb3/tronwallet-adapter](https://github.com/tronweb3/tronwallet-adapter) (repo oficial; tronprotocol/tronwallet-adapter archivado).
- **docs/TRONBOX_INSTALACION.md** — Requisitos e instalación TronBox alineados con [tronbox.io/docs/guides/installation](https://tronbox.io/docs/guides/installation).
- Referencias en SECURITY.md a uso seguro de `approve` (clientes/DApps) y enlace a Smart Contract Security TRON.
- Enlaces en ALINEACION_TRON_OFFICIAL a TRC-20 Protocol Interface, Smart Contract Security y TIP-20.
- Entradas de auditorías y VERIFICACION_PRE_DESPLIEGUE en checklist mainnet (raíz y trc20-token/docs).

### Cambiado

- **deploy-info.json.example:** `network` de `"nile"` a `"mainnet"` (proyecto mainnet-only).
- **VERIFICACION_PRE_DESPLIEGUE.md:** URL del logo genérica (`{githubUser}/{githubRepo}/{branch}/{logoPathInRepo}`); enlace a auditorías.
- **VERIFICACION_FINAL.md, AUDITORIA_INFORME.md:** Fecha actualizada a 2026.
- **AUDITORIA_E_COMPLETA.md:** Enlace a auditoría profesional y auditoría máximo nivel.
- **LO_NECESARIO_TRON.md:** Tabla de documentación con AUDITORIA_PROFESIONAL_COMPLETA y AUDITORIA_MAXIMO_NIVEL_SIN_OMISIONES.
- **docs/ALINEACION_TRON_OFFICIAL.md:** Texto "estado actual (actualizado marzo 2026)".

### Verificado

- Compilación (`npm run compile`) y lint (`npm run lint`) sin errores.
- Documentación referenciada existente; script `scripts/push-a-github.ps1` presente.
- Sin vocablo "tether" en el proyecto (sustituido por "colateral").

## [1.0.0] — Actualización y correcciones (2026-03-02)

### Corregido

- **TronWeb v6:** En todos los scripts que usan TronWeb (`deploy-upgradeable.js`, `upgrade.js`, `estimate-deploy-cost.js`, `initialize-v2.js`) se cambió `require('tronweb')` por `const { TronWeb } = require('tronweb')` para compatibilidad con el export nombrado de TronWeb v6 (evita "TronWeb is not a constructor").
- **post-deploy-perfil.js:** try/catch en lectura de `deploy-info.json` y validación de que exista `tokenAddress` (evita fallo con JSON corrupto o incompleto).
- **Referencias a CLAVES_PEGAR.md:** Corregido en checklist (archivo está en raíz del proyecto, no en `docs/`).

### Añadido

- **docs/VERIFICACION_PRE_DESPLIEGUE_TIEMPO_REAL.md** — Verificación en tiempo real (build, tests, lint, contratos, scripts, configs).
- **docs/VERIFICACION_FUNCIONAMIENTO_ESTABILIDAD.md** — Verificación de flujos deploy/upgrade, reentrancy, proxy, conexiones.
- **docs/EJEMPLIFICACIONES_Y_PRUEBAS_COMPLETAS.md** — Ejemplificaciones y pruebas de todo; corrección TronWeb v6 documentada.
- Entradas de estos documentos en checklist de documentación.

### Actualizado

- CHANGELOG con esta sección; referencias cruzadas en checklist al día.
- **README.md:** Enlace bare URL (MD034) → enlace con texto; tabla scripts (MD060) con espacios; bloque de código (MD040) con lenguaje `text`.
- **.markdownlint.json** (raíz workspace): MD037, MD051, MD056 desactivados; ESLint strict y markdownlint en 0 errores.

### Última comprobación (2026-03)

- Compilación, lint (Solhint + ESLint), tests y markdownlint (79 .md) sin errores. Proyecto listo para despliegue en mainnet.

## [1.0.0] — Revisión exhaustiva y correcciones (2026-03-03)

### Añadido

- **docs/REPORTE_REVISION_AGENTE_Y_CORRECCIONES.md** — Análisis del trabajo previo de otro agente y correcciones (compile vs compile:tronbox, flujo TVM).
- **docs/AUDITORIA_PROFESIONAL_COMPLETA.md** — Auditoría de máximo nivel: contratos, migraciones, scripts, configuración.
- **docs/AVISO_AL_AGENTE_ANTERIOR.md** — Resumen de errores detectados y buenas prácticas para no repetirlos.
- **docs/REVISION_EXHAUSTIVA_SIN_OMISIONES.md** — Revisión sin exclusiones: cada contrato, migración, script, config y flujo documentado con detalle.

### Corregido

- **Flujo compile en mainnet:** En `desplegar-completar-token.js`, `verify-before-migrate-3.js`, `upgrade.js`, `deploy-upgradeable.js`, `estimate-deploy-cost.js` se unifica el uso y mensajes a **npm run compile:tronbox** (bytecode TVM para TRON).
- **deploy-upgradeable.js:** Validación dry-run del Proxy usa direcciones de contrato como placeholder (no EOA) en `validateBuild`; mensaje de artefactos a compile:tronbox; `deployInfo.deployedVia` añadido.
- **Migraciones 2 y 3:** Validación de env con `parseEnvDecimals()` (0–255) y `parseEnvSupply()` (entero positivo); fallo claro antes de gastar TRX.
- **ENV_TEMPLATE.txt:** Comentario aclarando que TOKEN_SYMBOL=USDT es solo ejemplo.
- **upgrade.js:** Comprobación de que `implTx.contract_address` exista tras el deploy; mensaje de error explícito si falta.
- **initialize-v2.js:** Validación de formato de `tokenAddress` (base58 o hex TRON) antes de usar TronWeb; salida con mensaje claro si es inválido.

### Actualizado

- CHANGELOG con esta sección.
- Documentación de auditoría y revisión exhaustiva enlazada desde los informes generados.
