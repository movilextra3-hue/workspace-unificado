# Checklist de comprobaciones finales – Evitar errores

Este documento concentra **todas las comprobaciones y análisis** realizados para asegurar que no vuelvan a producirse errores. Usarlo antes de desplegar en mainnet o después de tocar contratos/scripts/migraciones.

---

## 1. Comprobaciones automáticas (ejecutar en orden)

Desde la raíz del proyecto (`blockchain/trc20-token`):

| # | Comando | Qué comprueba | Si falla |
|---|---------|----------------|----------|
| 1 | `npm run compile:tronbox` | Contratos compilan; se generan `build/contracts/*.json` (TVM). | Corregir errores de Solidity; no usar `npm run compile` para mainnet. |
| 2 | `npm run lint` | Solhint en `contracts/**/*.sol`. | Corregir avisos/errores en contratos. |
| 3 | `npm test` | Tests TronBox (deploy impl+admin+proxy, initialize, transfer, pause, mint, etc.). | Corregir tests o lógica del contrato. |
| 4 | `npm run lint:js` | ESLint en scripts, migrations, test, tronbox.js. | Opcional; corregir si el proyecto exige 0 errores. |

**Recomendación:** Antes de cualquier deploy o migrate en mainnet, ejecutar al menos 1, 2 y 3. Si algo falla, no desplegar.

---

## 2. Variables de entorno (.env)

Comprobar que existan y sean válidas según el flujo que vayas a usar:

| Variable | Obligatoria para | Formato / valor |
|----------|------------------|------------------|
| PRIVATE_KEY | deploy, upgrade, migrate, initialize-v2, estimate, verify-before-migrate-3 | 64 caracteres hex, sin 0x |
| TRON_PRO_API_KEY | mainnet (deploy, upgrade, migrate, verify, estimate, initialize-v2, check-api) | API key de https://www.trongrid.io/ |
| PROXY_ADMIN_ADDRESS | Solo migrate-3-safe (migración 3) | Una de las 3 ProxyAdmin en docs, o la que hayas desplegado |
| TOKEN_NAME, TOKEN_SYMBOL, TOKEN_DECIMALS, TOKEN_SUPPLY | deploy / migrate | Decimals 0–255; supply entero positivo (string) |
| MIGRATE_3_VERIFIED | Solo si ejecutas migrate -f 3 a mano | Debe ser `1` (lo pone `migrate-3-safe`) |
| AUTO_CONFIRM | deploy sin preguntar | `1` para omitir confirmación |
| DRY_RUN | deploy sin enviar tx | `1` o `--dry-run` |
| VERIFY_BALANCE_TRX | Opcional en verify-before-migrate-3 | Número TRX si la API devuelve balance bajo |

**Comprobación:** Los scripts que usan mainnet validan PRIVATE_KEY (64 hex) y TRON_PRO_API_KEY antes de gastar TRX. Las migraciones 2 y 3 validan TOKEN_DECIMALS (0–255) y TOKEN_SUPPLY (entero positivo).

---

## 3. Flujos y archivos correctos

| Flujo | Qué se ejecuta | Archivos que debe haber / usar |
|-------|----------------|----------------------------------|
| Deploy completo (migración 2) | `tronbox migrate` (o migrate -f 2) | build/contracts de TronBox; deploy-info.json se escribe al final. |
| Deploy completo (script) | `npm run listo` o `node scripts/deploy-upgradeable.js` | Antes: `npm run compile:tronbox`. Lee build/contracts (TRC20TokenUpgradeable, ProxyAdmin, TransparentUpgradeableProxy). Escribe deploy-info.json. |
| Completar token (migración 3) | `npm run migrate-3-safe` | Crea/rellena .env, compile:tronbox, verify-before-migrate-3, luego migrate -f 3. Requiere PROXY_ADMIN_ADDRESS en .env. |
| Upgrade | `npm run upgrade` | Lee deploy-info.json (tokenAddress, proxyAdminAddress). Requiere compile:tronbox. Lee build/contracts (TRC20TokenUpgradeable, ProxyAdmin). |
| initializeV2 | `node scripts/initialize-v2.js [version] [cap]` | Lee deploy-info.json (tokenAddress). Requiere compile:tronbox. tokenAddress debe ser proxy (dirección del token). |

**Regla:** Para cualquier operación en mainnet que use bytecode (deploy, upgrade, verify de energía), los artefactos deben ser de **TronBox** (`npm run compile:tronbox`), no de `npm run compile` (solc/EVM).

---

## 4. deploy-info.json

- **tokenAddress** = siempre la dirección del **proxy** (dirección permanente del token).
- **implementationAddress** = implementación actual (cambia en cada upgrade).
- **proxyAdminAddress** = ProxyAdmin que controla el upgrade.

Los scripts que leen deploy-info usan estas claves así; no hay intercambio impl/token. Si editas deploy-info a mano, mantener estos nombres. Las direcciones pueden ser base58 (T...) o hex (41... o 0x41...); upgrade.js e initialize-v2 normalizan.

---

## 5. Rutas y artefactos

- **build/contracts:** Siempre `path.join(__dirname, '..', 'build', 'contracts')` en scripts (desde `scripts/`). Coincide con `contracts_build_directory` en tronbox.js.
- **deploy-info.json:** Siempre en la raíz del proyecto.
- **Nombres de artefactos:** TRC20TokenUpgradeable, TransparentUpgradeableProxy, ProxyAdmin, Migrations. Deben coincidir con el nombre del contrato en Solidity (no del archivo .sol).

---

## 6. Delegaciones (ABI vs dirección)

- Llamadas al **token** (initialize, initializeV2, transfer, etc.): usar **ABI de TRC20TokenUpgradeable** con la **dirección del proxy**. Correcto en migraciones, deploy-upgradeable e initialize-v2.
- Llamada **upgrade**: usar **ABI de ProxyAdmin** con la **dirección del ProxyAdmin**; método `upgrade(proxyAddr, newImplAddress)`. Correcto en upgrade.js.
- Constructor del **Proxy**: orden `(impl, admin, '0x')`. Correcto en migraciones, deploy-upgradeable y tests.

Ver detalle en `docs/COMPROBACION_ARCHIVOS_Y_DELEGACIONES.md`.

---

## 7. Validaciones ya aplicadas en código

- **Migraciones 2 y 3:** TOKEN_DECIMALS 0–255, TOKEN_SUPPLY entero positivo; si no, throw antes de desplegar.
- **Migración 3:** En mainnet exige MIGRATE_3_VERIFIED=1 y PROXY_ADMIN_ADDRESS; comprueba feeLimit en tronbox.js.
- **deploy-upgradeable.js:** PRIVATE_KEY 64 hex, TOKEN_DECIMALS 0–255, TOKEN_SUPPLY entero positivo; placeholder del Proxy con dirección de contrato en dry-run.
- **upgrade.js:** deploy-info con tokenAddress y proxyAdminAddress; formato dirección TRON (base58 o hex con/sin 0x); comprobación de implTx.contract_address tras deploy.
- **initialize-v2.js:** tokenAddress con formato TRON válido (base58 o hex).
- **verify-before-migrate-3.js:** PRIVATE_KEY, TRON_PRO_API_KEY, PROXY_ADMIN_ADDRESS; build/contracts con Impl y Proxy; feeLimit y balance/energía.

---

## 8. Antes de mainnet (resumen)

1. Ejecutar: `npm run compile:tronbox`, `npm run lint`, `npm test`. Todo en verde.
2. Tener .env con PRIVATE_KEY y TRON_PRO_API_KEY (y PROXY_ADMIN_ADDRESS si vas a usar migrate-3-safe).
3. Para migrate-3: ejecutar **solo** `npm run migrate-3-safe` (no `tronbox migrate -f 3` directo).
4. Para deploy con script: usar `npm run compile:tronbox` antes; opcionalmente `npm run deploy:dry-run` para validar sin enviar.
5. Para upgrade: tener deploy-info.json de un deploy previo y `npm run compile:tronbox` antes de `npm run upgrade`.

Si se siguen estos pasos y el checklist, se reducen al mínimo los errores por artefactos equivocados, env mal configurado o delegaciones incorrectas.
