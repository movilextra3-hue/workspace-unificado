# Comparativa: TRC20TokenUpgradeable vs buenas prácticas y mercado

Documento basado en búsqueda de buenas prácticas (OpenZeppelin, TRC-20, USDT/compliance) y comparación con el contrato actual.

---

## 1. Estándar TRC-20 / ERC-20

| Requisito / práctica | Referencia (mercado / docs) | Nuestro contrato |
|----------------------|-----------------------------|------------------|
| `totalSupply()` | Obligatorio TRC-20 | ✅ Variable pública |
| `balanceOf(address)` | Obligatorio | ✅ |
| `transfer(address, uint256)` | Obligatorio | ✅ Con pausa, freeze y blacklist |
| `transferFrom`, `approve`, `allowance` | Obligatorio | ✅ |
| `name`, `symbol`, `decimals` | Opcional pero habitual | ✅ |
| Retorno `bool` en transfer/approve | Estándar | ✅ |

**Conclusión:** Cumple el estándar TRC-20 y las extensiones habituales.

---

## 2. Contratos upgradeables (OpenZeppelin y proxies)

| Práctica | Referencia | Nuestro contrato |
|----------|------------|------------------|
| Sin constructor con lógica; usar `initialize` | OpenZeppelin Writing Upgradeable | ✅ `initialize()` con modifier `initializer` |
| Implementación no inicializable: `_disableInitializers()` en constructor | OpenZeppelin | ✅ Constructor solo llama `_disableInitializers()` |
| No cambiar orden ni tipo de variables de storage entre versiones | OpenZeppelin | ✅ Documentado; layout actual fijo |
| Añadir nuevas variables solo al final (o usando gaps) | OpenZeppelin | ✅ **Mejora aplicada:** se añadió `uint256[50] __gap` para reservar slots |
| No usar `selfdestruct` ni `delegatecall` en la lógica | OpenZeppelin | ✅ No se usan |
| No valores iniciales en declaración de campos | OpenZeppelin | ✅ Todo se asigna en `initialize` |

**Conclusión:** Alineado con prácticas upgradeables; el `__gap` permite futuras versiones sin romper layout.

---

## 3. Compliance y tokens del mercado (USDT-style)

| Funcionalidad | USDT / establecidos | Nuestro contrato |
|---------------|---------------------|------------------|
| Lista negra (freeze de dirección) | `addBlackList`, `removeBlackList` | ✅ `addBlacklist`, `removeBlacklist` |
| Quemar fondos de direcciones blacklisted | `destroyBlackFunds` | ✅ `destroyBlackFunds` |
| Congelar dirección (no transferir ni recibir) | Freeze explícito en muchos | ✅ `freezeAddress`, `unfreezeAddress` |
| Pausa global | Común en tokens regulados | ✅ `pause`, `unpause` |
| Ownership / admin | Centralizado en emisor | ✅ `owner`, transferencia en 2 pasos |

**Conclusión:** Nivel de control y compliance alineado con tokens tipo USDT (blacklist, freeze, pause, destroy funds).

---

## 4. EIP-2612 (permit / aprobación por firma)

| Requisito | EIP-2612 / documentación | Nuestro contrato |
|-----------|---------------------------|------------------|
| `permit(owner, spender, value, deadline, v, r, s)` | Obligatorio | ✅ |
| `nonces(owner)` | Obligatorio | ✅ |
| `DOMAIN_SEPARATOR()` | Obligatorio | ✅ |
| Typehash Permit y EIP712Domain correctos | Estándar | ✅ Cadenas estándar |
| Domain con name, version, chainId, verifyingContract | EIP-712 | ✅ (version "1") |

**Conclusión:** Implementación de permit alineada con EIP-2612.

---

## 5. Seguridad general

| Práctica | Referencia | Nuestro contrato |
|----------|------------|------------------|
| Checks-Effects-Interactions | Patrón recomendado vs reentrancy | ✅ En `_transfer`, `_approve` no hay llamadas externas a usuario; en `recoverTRX` solo se envía TRX tras comprobar estado |
| ReentrancyGuard en funciones sensibles | Algunos estándares / auditorías | ⚠️ No usado. En TRC-20 sin callbacks suele considerarse opcional; añadir guard en mint/recoverTRX es mejora posible |
| Custom errors en lugar de `require(string)` | Solidity 0.8+, menor gas | ✅ Uso de `error` en todo el contrato |
| Validación de `address(0)` en parámetros críticos | Buenas prácticas | ✅ En initialize, mint, freeze, blacklist, recover, etc. |
| Evitar overflow/underflow | Solidity 0.8+ / unchecked donde sea seguro | ✅ Solidity 0.8; `unchecked` solo donde la lógica lo garantiza |

**Conclusión:** Seguridad sólida; la única mejora opcional clara es un ReentrancyGuard en funciones que hagan llamadas externas (p. ej. `recoverTRX`).

---

## 6. Funcionalidad extra vs mercado

| Funcionalidad | Comentario |
|---------------|------------|
| `increaseAllowance` / `decreaseAllowance` | ✅ Mitiga race en approve; común en OpenZeppelin. |
| `getAddressStatus(addr)` | ✅ Útil para frontends y compliance (frozen, blacklisted, balance). |
| `recoverTokens` (tokens TRC20 enviados al contrato) | ✅ Buena práctica; evita pérdida de fondos. |
| `recoverTRX` | ✅ Recuperar TRX enviados por error; alineado con prácticas de “rescate” de activos. |
| Ownership en 2 pasos (`proposeOwnership` / `acceptOwnership`) | ✅ Reduce riesgo de perder ownership por dirección equivocada. |

---

## 7. Mejoras ya aplicadas en este repo

1. **Storage gap (`__gap`):** `uint256[47] private __gap` en `TRC20TokenUpgradeable`. Nuevas variables en upgrades reducen el tamaño del array (respetando el layout).
2. **ReentrancyGuard:** Modifier `nonReentrant` en `mint`, `recoverTokens` y `recoverTRX`; estado `_reentrancyStatus` (NOT_ENTERED/ENTERED).
3. **Reinitializer:** En `Initializable`, modifier `reinitializer(uint8 version)`. En el token, `initializeV2(uint256 _version, uint256 _cap)` con `reinitializer(2)` para fijar versión y cap en upgrades.
4. **Cap de supply:** Variable `cap` (por defecto `type(uint256).max` = ilimitado). En `mint` se comprueba `totalSupply + amount <= cap`. Se puede fijar un tope en `initializeV2`.
5. **Auditoría:** Ver `docs/AUDITORIA.md` para Slither, MythX y checklist pre-mainnet; script `npm run security-check` (lint) y `npm run audit:readme`.

---

## 8. Mejoras opcionales (resto)

| Mejora | Estado |
|--------|--------|
| Auditoría externa / segunda revisión | Recomendado antes de mainnet; ver docs/AUDITORIA.md. |

---

## 9. Resumen

- El contrato cumple TRC-20, prácticas upgradeables (con `__gap` añadido), nivel de compliance tipo USDT (blacklist, freeze, pause, destroy funds) y EIP-2612.
- La comparativa con documentación y mercado no muestra carencias críticas; las mejoras sugeridas son opcionales (ReentrancyGuard, reinitializer, cap, auditoría) para endurecer aún más seguridad y mantenibilidad en upgrades.
