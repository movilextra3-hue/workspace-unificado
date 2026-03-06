# API: Token TRC-20 y Proxy

Referencia de funciones de **lectura** (view/pure) y **escritura** (estado) para controlar, mover, actualizar y actuar sobre el token.

---

## Control total del owner (emergencias)

El **owner** del token puede, en cualquier momento y sin depender de terceros:

| Acción | Función(es) |
|--------|-------------|
| **Parar todo** (transferencias y aprobaciones) | `pause()` |
| **Reanudar** | `unpause()` |
| **Congelar direcciones** (una o muchas) | `freezeAddress(addr)`, `batchFreeze(addrs)` |
| **Descongelar** | `unfreezeAddress(addr)`, `batchUnfreeze(addrs)` |
| **Lista negra** (una o muchas) | `addBlacklist(addr)`, `batchAddBlacklist(addrs)` |
| **Quitar de lista negra** | `removeBlacklist(addr)`, `batchRemoveBlacklist(addrs)` |
| **Quemar fondos de blacklisted** | `destroyBlackFunds(addr)` |
| **Incautar** (quemar sin allowance) | `forceBurn(account, amount)` |
| **Limitar supply sin upgrade** | `setCap(newCap)` (newCap >= totalSupply) |
| **Recuperar este token** enviado al contrato | `recoverTokens(to)` |
| **Recuperar TRX** enviados al contrato | `recoverTRX(to)` |
| **Recuperar otro TRC20** enviado al contrato | `recoverToken(tokenAddr, to, amount)` |
| **Mint** (hasta el cap) | `mint(to, amount)` |
| **Traspaso de propiedad** (en dos pasos) | `proposeOwnership`, `acceptOwnership`, `cancelOwnershipTransfer` |

El owner **no puede** ser congelado ni blacklisteado, de modo que siempre puede ejecutar estas funciones.

---

## 1. Token (dirección del Proxy)

La dirección que usan los usuarios es la del **Proxy**. Todas las llamadas siguientes se hacen al contrato en esa dirección.

### 1.1 Lectura (view)

| Función | Descripción |
|--------|-------------|
| `name()` | Nombre del token |
| `symbol()` | Símbolo (ej. USDT) |
| `decimals()` | Número de decimales |
| `totalSupply()` | Supply total en unidades mínimas |
| `balanceOf(address account)` | Balance de una cuenta |
| `allowance(address owner, address spender)` | Allowance de owner para spender |
| `owner()` | Dirección del owner (admin del token) |
| `pendingOwner()` | Dirección que puede aceptar la propiedad (si hay traspaso pendiente) |
| `paused()` | Si las transferencias están pausadas |
| `frozen(address addr)` | Si una dirección está congelada |
| `blacklisted(address addr)` | Si una dirección está en lista negra |
| `isBlackListed(address addr)` | Alias USDT: si la dirección está blacklisteada |
| `getBlackListStatus(address addr)` | Alias USDT: estado de blacklist |
| `getOwner()` | Alias USDT: dirección del owner |
| `nonces(address owner)` | Nonce para EIP-2612 permit |
| `getAddressStatus(address addr)` | (isFrozen, isBlacklisted, balance) de una dirección |
| `DOMAIN_SEPARATOR()` | Hash EIP-712 para permit |
| `PERMIT_TYPEHASH()` | Typehash del mensaje Permit |
| `EIP712_DOMAIN_TYPEHASH()` | Typehash del dominio EIP-712 |
| `cap()` | Supply máximo (unidades mínimas); type(uint256).max = ilimitado |
| `version()` | Versión de la implementación (1 tras initialize, 2+ tras initializeV2) |

### 1.2 Escritura (usuarios)

| Función | Descripción |
|--------|-------------|
| `transfer(address to, uint256 amount)` | Transfiere tokens al destinatario |
| `approve(address spender, uint256 amount)` | Aprueba allowance a spender |
| `transferFrom(address from, address to, uint256 amount)` | Transfiere desde `from` usando allowance |
| `increaseAllowance(address spender, uint256 addedValue)` | Aumenta allowance |
| `decreaseAllowance(address spender, uint256 subtractedValue)` | Disminuye allowance |
| `burn(uint256 amount)` | Quema tokens del caller |
| `permit(...)` | Aprueba por firma (EIP-2612) |
| `acceptOwnership()` | Acepta la propiedad (solo `pendingOwner`) |

### 1.3 Escritura (solo owner)

| Función | Descripción |
|--------|-------------|
| `initialize(...)` | Inicializa el token (una sola vez vía proxy) |
| `proposeOwnership(address newOwner)` | Propone nuevo owner |
| `cancelOwnershipTransfer()` | Cancela propuesta de traspaso |
| `pause()` | Pausa transferencias y aprobaciones |
| `unpause()` | Reanuda transferencias |
| `mint(address to, uint256 amount)` | Crea tokens y los asigna a `to` |
| `burnFrom(address account, uint256 amount)` | Quema desde cuenta (usando allowance al owner) |
| `forceBurn(address account, uint256 amount)` | Incautación: quema sin allowance |
| `freezeAddress(address addr)` | Congela una dirección |
| `unfreezeAddress(address addr)` | Descongela una dirección |
| `addBlacklist(address addr)` | Añade a lista negra |
| `removeBlacklist(address addr)` | Quita de lista negra |
| `destroyBlackFunds(address addr)` | Quema todos los tokens de una dirección blacklisted |
| `recoverTokens(address to)` | Recupera tokens TRC20 enviados por error al contrato |
| `recoverTRX(address to)` | Recupera TRX enviados por error al contrato |
| `recoverToken(address tokenAddr, address to, uint256 amount)` | Recupera cualquier otro TRC20 enviado al contrato (emergencia) |
| `setCap(uint256 newCap)` | Fija nuevo cap (debe ser >= totalSupply). Emergencia: limitar mint sin upgrade |
| `batchFreeze(address[] addrs)` | Congela varias direcciones en una tx (emergencia) |
| `batchUnfreeze(address[] addrs)` | Descongela varias direcciones en una tx |
| `batchAddBlacklist(address[] addrs)` | Añade varias direcciones a la lista negra en una tx (emergencia) |
| `batchRemoveBlacklist(address[] addrs)` | Quita varias direcciones de la lista negra en una tx |
| `initializeV2(uint256 _version, uint256 _cap)` | Re-inicialización en upgrade (v2): fija versión y cap. Solo una vez por proxy. |

---

## 2. Proxy (misma dirección que el token)

Llamadas al **mismo** contrato (proxy) para consultar o actuar sobre el upgrade.

### 2.1 Lectura (view)

| Función | Descripción |
|--------|-------------|
| `implementation()` | Dirección de la implementación actual del token |
| `admin()` | Dirección del ProxyAdmin |

### 2.2 Escritura

Solo el **admin** del proxy (ProxyAdmin) puede actualizar la implementación; no hay función de escritura directa en el proxy para usuarios. El admin se usa desde el contrato **ProxyAdmin**.

---

## 3. ProxyAdmin (contrato separado)

Administra el upgrade del token. Guardar su dirección al desplegar (en `deploy-info.json`).

### 3.1 Lectura (view)

| Función | Descripción |
|--------|-------------|
| `owner()` | Propietario del ProxyAdmin |
| `pendingOwner()` | Dirección que puede aceptar la propiedad (si hay traspaso en dos pasos) |

### 3.2 Escritura (solo owner del ProxyAdmin)

| Función | Descripción |
|--------|-------------|
| `proposeOwnership(address newOwner)` | Propone nuevo owner (paso 1; recomendado) |
| `acceptOwnership()` | Acepta la propiedad (paso 2; solo pendingOwner) |
| `cancelOwnershipTransfer()` | Cancela la propuesta pendiente |
| `transferOwnership(address newOwner)` | Transfiere en un solo paso (preferir propose + accept) |
| `upgrade(address proxyAddress, address newImplementation)` | Actualiza el token a una nueva implementación |
| `callProxy(address proxyAddress, bytes calldata data)` | Ejecuta una llamada arbitraria en el proxy (ej. `initializeV2`) |

---

## Resumen por rol

- **Usuario:** `transfer`, `approve`, `transferFrom`, `increaseAllowance`, `decreaseAllowance`, `burn`, `permit`, `acceptOwnership` (si es pendingOwner). Lectura: `balanceOf`, `allowance`, `name`, `symbol`, `decimals`, `totalSupply`, etc.
- **Owner del token:** Todas las de “solo owner” del token (pause, mint, freeze, blacklist, recoverTokens, recoverTRX, etc.).
- **Owner del ProxyAdmin:** `upgrade`, `callProxy`, `transferOwnership`.
- **Cualquiera (lectura):** `implementation()` y `admin()` en el proxy para ver implementación y admin actual.
