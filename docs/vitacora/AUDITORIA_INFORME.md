# Informe de auditoría de seguridad — TRC20 Token Upgradeable

**Alcance:** Contratos `TRC20TokenUpgradeable.sol`, `Initializable.sol`, `TransparentUpgradeableProxy.sol`, `ProxyAdmin.sol`  
**Nivel:** Revisión de máximo nivel profesional (estilo auditoría de smart contracts)  
**Fecha:** 2026 (actualizado)  

---

## 1. Resumen ejecutivo

Se realizó una auditoría de seguridad sobre el conjunto de contratos del token TRC-20 upgradeable. Se identificaron **varios hallazgos de severidad media y baja** y se aplicaron **correcciones en código**. No se detectaron vulnerabilidades críticas (p. ej. pérdida de fondos por reentrancy o fallos de acceso). Tras las correcciones, el diseño cumple buenas prácticas de la industria (OpenZeppelin, EIP-2612, EIP-1967).

---

## 2. Hallazgos y correcciones aplicadas

### 2.1 [MEDIA] Validación de `decimals` en `initialize`

**Descripción:** Si `_decimals` es mayor que 77, la expresión `10 ** _decimals` puede desbordar `uint256` (en versiones sin chequeo automático podría comportarse mal; en 0.8.x revierte sin mensaje claro).

**Corrección:** Se añadió la comprobación `if (_decimals > 77) revert DecimalsTooHigh();` y el error `DecimalsTooHigh` para rechazar valores inseguros y dar un mensaje claro.

---

### 2.2 [MEDIA] Maleabilidad de firma en EIP-2612 `permit`

**Descripción:** EIP-2 describe que las firmas ECDSA pueden ser maleables: dado un par (r, s) válido, (r, -s mod n) también es válido. Un atacante podría reutilizar una firma con la forma alternativa.

**Corrección:** Se añadió la comprobación de que `s` esté en el rango bajo de la curva secp256k1:  
`if (uint256(s) > 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0) revert InvalidPermit();`

---

### 2.3 [MEDIA] `initializeV2` podía fijar `cap` menor que `totalSupply`

**Descripción:** Si en un upgrade se llamaba `initializeV2(2, capBajo)` con `capBajo < totalSupply`, todo `mint` posterior revertiría y el supply quedaría de hecho bloqueado sin un nuevo upgrade.

**Corrección:** Se añadió `if (_cap < totalSupply) revert CapBelowTotalSupply();` al inicio de `initializeV2`.

---

### 2.4 [MEDIA] Congelar o blacklistear al `owner`

**Descripción:** Aunque el owner conserva las funciones `onlyOwner`, congelar o blacklistear al owner genera un estado confuso (no puede transferir tokens pero sí administrar). Además, un error al elegir la dirección podría dejar al admin bloqueado para operaciones de token.

**Corrección:**  
- En `freezeAddress`: `if (addr == owner) revert CannotFreezeOwner();`  
- En `addBlacklist`: `if (addr == owner) revert CannotBlacklistOwner();`  
Y los errores `CannotFreezeOwner` y `CannotBlacklistOwner`.

---

### 2.5 [MEDIA] Error genérico en `recoverTRX` al fallar el envío

**Descripción:** Si `payable(to).call{value: amount}("")` devolvía `false`, se usaba el mismo error `NoTRXToRecover()` que cuando el balance es cero, dificultando el diagnóstico.

**Corrección:** Se creó el error `TransferTRXFailed()` y se usa cuando `sent == false`, dejando `NoTRXToRecover()` solo para balance cero.

---

### 2.6 [MEDIA] Proxy: implementación o admin en cero / sin código

**Descripción:** El constructor del proxy y `upgradeTo` no comprobaban que la implementación no fuera `address(0)` ni que tuviera código. Un upgrade erróneo podría dejar el proxy apuntando a una dirección sin contrato o a cero.

**Corrección:**  
- En el constructor: `if (_logic == address(0)) revert ImplementationZero();`, `if (_logic.code.length == 0) revert ImplementationNotContract();`, `if (admin_ == address(0)) revert AdminZero();`  
- En `upgradeTo`: las mismas comprobaciones para `newImplementation` (cero y sin código).  
Errores: `ImplementationZero`, `ImplementationNotContract`, `AdminZero`.

---

### 2.7 [MEDIA] ProxyAdmin: transferencia de ownership en un solo paso

**Descripción:** Una única llamada a `transferOwnership` con una dirección equivocada o de un contrato no controlado implica pérdida irreversible del control del ProxyAdmin y por tanto de la capacidad de hacer upgrades.

**Corrección:** Se implementó ownership en dos pasos, alineado con el token:  
- Estado `pendingOwner`.  
- `proposeOwnership(address newOwner)`: solo owner, fija `pendingOwner`.  
- `acceptOwnership()`: solo `pendingOwner`, se convierte en owner y se limpia `pendingOwner`.  
- `cancelOwnershipTransfer()`: solo owner, limpia `pendingOwner`.  
Se mantuvo `transferOwnership` para compatibilidad, documentando que se recomienda usar propose + accept. Al transferir en un paso se limpia `pendingOwner` si existía.

---

## 3. Aspectos revisados sin cambios necesarios

- **Reentrancy:** Uso de `nonReentrant` en `mint`, `recoverTokens` y `recoverTRX`; flujos de transfer/approve sin llamadas externas a usuario.  
- **Overflow/underflow:** Solidity 0.8; uso de `unchecked` solo donde la lógica lo garantiza.  
- **Checks-Effects-Interactions:** Respeta el patrón en las funciones sensibles.  
- **Acceso:** `onlyOwner` y `onlyAdmin` usados de forma coherente.  
- **Storage upgradeable:** Uso de `initializer`/`reinitializer`, `_disableInitializers` en la implementación y `__gap` para futuras variables.  
- **Eventos:** Emisión en los puntos relevantes; errores específicos para mejor trazabilidad.  

---

## 4. Recomendaciones posteriores a la auditoría

1. **Tests:** Añadir tests unitarios/integración para `initializeV2`, `cap`, `permit` (incluido el rechazo de `s` alto), freeze/blacklist del owner, y upgrades del proxy.  
2. **Herramientas:** Ejecutar Slither (y opcionalmente MythX) de forma periódica; ver `docs/AUDITORIA.md`.  
3. **Despliegue:** En mainnet, considerar una auditoría externa y un plan de respuesta a incidentes (pausa, upgrade, comunicación).  
4. **ProxyAdmin:** Preferir siempre `proposeOwnership` + `acceptOwnership` y usar `transferOwnership` solo cuando no haya riesgo de error de dirección.  

---

## 5. Estado final

- Todas las correcciones anteriores están **implementadas** en los contratos.  
- Compilación (TronBox) y lint (Solhint) **correctos**.  
- Documentación de API y comparativa de buenas prácticas actualizadas en `docs/`.  

Este informe refleja el estado del código tras la auditoría y las correcciones aplicadas.
