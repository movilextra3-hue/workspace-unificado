# Reporte de revisión del trabajo del agente anterior y correcciones

**Fecha:** 3 de marzo de 2025  
**Alcance:** Migraciones, scripts de despliegue (migrate-3-safe, verify-before-migrate-3, desplegar-completar-token), compilación y flujo TRON.

---

## 1. Resumen ejecutivo

Se revisaron las migraciones `2_deploy_trc20.js` y `3_deploy_impl_and_proxy_reuse_admin.js`, los scripts `desplegar-completar-token.js`, `verify-before-migrate-3.js`, `upgrade.js`, `package.json` y el flujo de compilación. La lógica de las migraciones y de la verificación previa es correcta en general, pero hay **errores importantes** en el flujo de compilación que pueden llevar a estimaciones de energía incorrectas y a confusión sobre qué comando usar.

---

## 2. Errores detectados y estado

### 2.1 (CRÍTICO) Compilación equivocada en el flujo `migrate-3-safe`

**Qué hace el agente:**  
`desplegar-completar-token.js` ejecuta `npm run compile`, que corre `scripts/compile-with-solc.js`. Ese script compila con **solc (EVM)** y escribe en `build/contracts/` artefactos con **bytecode EVM**.

**Problema:**  
- `tronbox migrate -f 3` usa **TronBox**, que compila a **TVM** (TRON Virtual Machine). Al ejecutar `migrate`, TronBox recompila y sobrescribe `build/contracts/` con artefactos TVM.  
- Pero **antes** del migrate se ejecuta `verify-before-migrate-3.js`, que lee el tamaño del bytecode desde `build/contracts/*.json`. En ese momento los archivos son los generados por `npm run compile`, es decir **EVM**.  
- El tamaño del bytecode EVM no coincide con el TVM; la estimación de energía (p. ej. `energyImpl = implBytes * 320`) queda basada en bytes EVM y puede ser **incorrecta** para el despliegue real en TRON.

**Corrección:**  
En `desplegar-completar-token.js` debe usarse **`npm run compile:tronbox`** (es decir, `tronbox compile`) en lugar de `npm run compile`, para que tanto la verificación como la migración usen artefactos TVM en `build/contracts/`.

---

### 2.2 Mensaje de error engañoso en `verify-before-migrate-3.js`

**Qué hace el agente:**  
Si faltan artefactos en `build/contracts/`, el script dice: *"Falta compilar: ejecuta npm run compile"*.

**Problema:**  
Para el flujo de la migración 3 (TronBox), los artefactos deben ser los de **TronBox** (TVM). `npm run compile` genera artefactos EVM; quien siga el mensaje y ejecute solo `npm run compile` tendrá archivos en `build/contracts/` pero con bytecode EVM, y la verificación seguirá siendo incoherente con el despliegue real.

**Corrección:**  
En el mensaje de error, indicar que para este flujo se debe ejecutar **`npm run compile:tronbox`** (o `tronbox compile`).

---

### 2.3 Inconsistencia en `upgrade.js`

**Qué hace el agente:**  
`upgrade.js` pide "Ejecutar npm run compile primero" y usa los artefactos de `build/contracts/` para desplegar la nueva implementación con TronWeb en mainnet.

**Problema:**  
En TRON el bytecode debe ser **TVM**. Si el usuario solo ejecutó `npm run compile` (solc), el bytecode en `build/contracts/` es EVM y el despliegue en mainnet **fallará o será inválido**. El script debería exigir explícitamente artefactos generados por TronBox.

**Corrección:**  
Cambiar el mensaje y la documentación del script a: ejecutar **`npm run compile:tronbox`** antes de correr `upgrade.js`.

---

### 2.4 Documentación y scripts: mezcla de `compile` y `compile:tronbox`

**Problema:**  
- Varios scripts (deploy-upgradeable, estimate-deploy-cost, etc.) piden `npm run compile`.  
- `initialize-v2.js` correctamente pide `npm run compile:tronbox`.  
- Para **cualquier despliegue o upgrade en TRON** (migrate, deploy-upgradeable, upgrade) los artefactos deben ser de TronBox. El uso de `compile` (solc) solo tiene sentido como alternativa cuando TronBox no está disponible para compilar, pero entonces no se deben usar esos artefactos para estimar energía de migrate-3 ni para desplegar en mainnet.

**Corrección:**  
- En el flujo **migrate-3-safe** y en **verify-before-migrate-3**: usar y recomendar siempre `compile:tronbox`.  
- En **upgrade.js**: recomendar `compile:tronbox`.  
- Dejar documentado en README o en este reporte que:  
  - `npm run compile` = artefactos EVM (solc), útiles para verificación de código o entornos que no usen TronBox.  
  - `npm run compile:tronbox` = artefactos TVM, **necesarios** para migrate, upgrade y despliegue en TRON.

---

## 3. Lo que está bien (sin cambios)

- **Migración 2** (`2_deploy_trc20.js`): despliegue completo Proxy + Implementation + ProxyAdmin y generación de `deploy-info.json` correctos.  
- **Migración 3** (`3_deploy_impl_and_proxy_reuse_admin.js`): reutilización de ProxyAdmin, comprobación de `MIGRATE_3_VERIFIED`, validación de `feeLimit` y de `PROXY_ADMIN_ADDRESS`.  
- **API getcontract:** uso de `{ value: proxyAdminAddr, visible: true }` es correcto según documentación oficial de TRON.  
- **verify-before-migrate-3.js:** comprobaciones de .env, balance, energía, feeLimit y que PROXY_ADMIN_ADDRESS sea contrato en mainnet están bien planteadas.  
- **tronbox.js:** feeLimit 300 TRX y configuración de mainnet coherentes con el objetivo de evitar OUT_OF_ENERGY.  
- **Contrato TRC20TokenUpgradeable.sol:** no se detectaron cambios erróneos en la parte revisada.

---

## 4. Correcciones aplicadas en código

1. **scripts/desplegar-completar-token.js**  
   - Sustituido `npm run compile` por **`npm run compile:tronbox`** para que el flujo migrate-3-safe use artefactos TVM desde el principio.

2. **scripts/verify-before-migrate-3.js**  
   - Mensaje cuando faltan artefactos: de "ejecuta npm run compile" a **"ejecuta npm run compile:tronbox (o tronbox compile)"** para dejar claro que para migrate -f 3 se necesitan artefactos TronBox.

3. **scripts/upgrade.js**  
   - Mensaje cuando falta `TRC20TokenUpgradeable.json`: de "Ejecutar npm run compile primero" a **"Ejecutar npm run compile:tronbox primero"**, para que el bytecode usado en mainnet sea TVM.

---

## 5. Recomendaciones adicionales

- **README o docs:** Añadir una línea que explique la diferencia entre `npm run compile` y `npm run compile:tronbox` y cuándo usar cada uno (migrate/upgrade/mainnet = siempre compile:tronbox).  
- **prepare:migrate-3:** El script `prepare:migrate-3` en package.json hace `setup-env` + `verify-before-migrate-3` pero no compila. Si se usa como paso previo a `migrate-3-safe`, documentar que antes debe ejecutarse `npm run compile:tronbox` o que `migrate-3-safe` ya se encarga de compilar con tronbox.  
- No modificar `.env` ni claves; las comprobaciones de seguridad existentes se mantienen.

---

## 6. Conclusión

El trabajo del agente anterior no son "puras pendejadas": la estructura de migraciones, la verificación previa y las protecciones (MIGRATE_3_VERIFIED, feeLimit, PROXY_ADMIN_ADDRESS) son útiles y correctas. Los problemas reales estaban en el **flujo de compilación** (uso de bytecode EVM donde debía usarse TVM) y en mensajes que llevaban a ejecutar el comando de compilación equivocado. Con las correcciones aplicadas, el flujo migrate-3-safe y la verificación son coherentes con TronBox y con el despliegue en TRON mainnet.
