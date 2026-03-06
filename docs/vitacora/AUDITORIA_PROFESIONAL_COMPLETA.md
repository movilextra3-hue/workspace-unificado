# Auditoría profesional – TRC20 Token (nivel máximo)

**Fecha:** 3 de marzo de 2025  
**Alcance:** Contratos Solidity, migraciones TronBox, scripts de despliegue/upgrade/verificación, configuración y flujos.  
**Criterios:** Seguridad, buenas prácticas, consistencia, errores lógicos, validaciones y documentación.

---

## 1. Contratos Solidity

### 1.1 TRC20TokenUpgradeable.sol

| Aspecto | Estado | Notas |
|--------|--------|--------|
| Inicialización única | OK | `initializer` y `reinitializer(2)` correctos. |
| Constructor deshabilitado | OK | `_disableInitializers()` en constructor. |
| Reentrancy | OK | `nonReentrant` en mint, recoverTokens, recoverTRX, recoverToken. |
| Ownership en dos pasos | OK | proposeOwnership / acceptOwnership / cancelOwnershipTransfer. |
| Validación de inputs | OK | address(0), decimals > 77, cap >= totalSupply, etc. |
| EIP-2612 permit | OK | Verificación de s en rango bajo, nonce, deadline. |
| Storage gap | OK | `__gap[47]` para upgrades. |
| Custom errors | OK | Uso consistente, ahorro de gas. |
| TRON/chainId | OK | `block.chainid` y `address(this).balance` válidos en TVM. |

**Recomendación:** Ningún cambio obligatorio. Contrato alineado con estándares upgradeable y TRC20.

### 1.2 Initializable.sol

| Aspecto | Estado |
|--------|--------|
| Protección contra doble init | OK |
| reinitializer(version) | OK |
| _isConstructor() en contexto proxy | OK (code.length en proxy es > 0) |

### 1.3 TransparentUpgradeableProxy.sol

| Aspecto | Estado |
|--------|--------|
| Slots EIP-1967 | OK |
| Validación _logic y admin en constructor | OK |
| delegatecall con _data vacío | OK (no se llama init en constructor) |

### 1.4 ProxyAdmin.sol

| Aspecto | Estado |
|--------|--------|
| onlyOwner + nonReentrant en upgrade | OK |
| Ownership en dos pasos | OK |

---

## 2. Migraciones

### 2.1 2_deploy_trc20.js

| Hallazgo | Severidad | Corrección |
|----------|-----------|------------|
| `initialSupply` y `decimals` sin validar desde env | Media | Validar que TOKEN_DECIMALS sea 0–255 y TOKEN_SUPPLY sea string numérico positivo. |
| Red de deploy-info | Bajo | Solo se escribe deploy-info en nile/shasta/mainnet; correcto. |

### 2.2 3_deploy_impl_and_proxy_reuse_admin.js

| Hallazgo | Severidad | Corrección |
|----------|-----------|------------|
| Misma validación de env | Media | Validar decimals y supply como en migración 2. |

---

## 3. Scripts

### 3.1 deploy-upgradeable.js

| Hallazgo | Severidad | Corrección |
|----------|-----------|------------|
| **validateBuild:** Proxy se construye con `[ownerAddr, ownerAddr, '0x']`. El constructor exige que _logic y admin_ sean contratos (code.length > 0). En dry-run la tx se construye pero si se enviara fallaría. Validación engañosa. | Alta | Usar direcciones de contrato conocidas como placeholder (p. ej. PROXY_ADMIN_ADDRESS o constante mainnet) para impl y admin en validateBuild. |
| Mensaje "Ejecutar npm run compile" | Media | Para mainnet/TVM debe ser "Ejecutar npm run compile:tronbox". |
| deployInfo sin `deployedVia` | Baja | Añadir `deployedVia: 'scripts/deploy-upgradeable.js'`. |

### 3.2 upgrade.js

- Mensaje de compile ya corregido a compile:tronbox.
- Uso de `implTx.contract_address` es correcto (TronWeb lo incluye al construir la tx).

### 3.3 verify-before-migrate-3.js

- Mensaje de compilación ya corregido.
- API getcontract con `value` y `visible` correcta.

### 3.4 estimate-deploy-cost.js

| Hallazgo | Severidad | Corrección |
|----------|-----------|------------|
| Comentario y mensaje "npm run compile" | Media | Para estimación mainnet debe recomendarse compile:tronbox. |

### 3.5 desplegar-completar-token.js

- Ya usa compile:tronbox.

### 3.6 initialize-v2.js

- Ya pide compile:tronbox. Validación de deploy-info y parámetros correcta.

---

## 4. Configuración

### 4.1 tronbox.js

- mainnet feeLimit 300 TRX adecuado.
- compilers.solc 0.8.34 alineado con contratos.

### 4.2 package.json

- Scripts coherentes. `migrate-3-safe` y `verify:before-migrate-3` correctos.

### 4.3 ENV_TEMPLATE.txt

- No incluir claves reales. PROXY_ADMIN_ADDRESS por defecto correcta.
- TOKEN_SYMBOL=USDT: considerar aclarar que es solo ejemplo (evitar confusión con USDT oficial).

---

## 5. Flujos y buenas prácticas

| Flujo | Estado |
|-------|--------|
| Deploy completo (migración 2) | OK. Escribir deploy-info en redes indicadas. |
| Deploy reutilizando ProxyAdmin (migración 3) | OK. MIGRATE_3_VERIFIED y feeLimit validados. |
| migrate-3-safe | OK. compile:tronbox → verify → migrate -f 3. |
| deploy-upgradeable.js (TronWeb) | Requiere compile:tronbox para bytecode TVM; mensaje y validateBuild corregidos. |
| upgrade.js | OK. Lectura de deploy-info y ProxyAdmin.upgrade correctos. |

---

## 6. Resumen de correcciones aplicadas

1. **deploy-upgradeable.js**
   - validateBuild: usar placeholder de contrato (PROXY_ADMIN_ADDRESS o constante) para los parámetros del Proxy en lugar de ownerAddr dos veces.
   - Mensaje de loadArtifact: "Ejecutar npm run compile:tronbox" para mainnet.
   - deployInfo: añadir `deployedVia: 'scripts/deploy-upgradeable.js'`.

2. **estimate-deploy-cost.js**
   - Comentario y mensaje de error: recomendar "npm run compile:tronbox" para mainnet.

3. **migrations/2_deploy_trc20.js**
   - Validar TOKEN_DECIMALS en rango 0–255 y TOKEN_SUPPLY string numérico positivo.

4. **migrations/3_deploy_impl_and_proxy_reuse_admin.js**
   - Misma validación de TOKEN_DECIMALS y TOKEN_SUPPLY.

---

## 7. Conclusión

- **Contratos:** Sin vulnerabilidades críticas detectadas; diseño upgradeable y TRC20 correcto.
- **Migraciones:** Validación de variables de entorno añadida para evitar despliegues con datos inválidos.
- **Scripts:** Corrección de la validación dry-run del Proxy, mensajes de compilación unificados a compile:tronbox para mainnet, y deployInfo completado.
- **Configuración:** Adecuada para mainnet.

Esta auditoría y las correcciones aplicadas elevan el proyecto a un nivel profesional estricto en los ámbitos revisados.
