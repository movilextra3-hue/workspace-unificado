# Referencia USDT en TRON — Alineación con este contrato

Este documento verifica **todos los detalles** del token USDT (token estable en TRON) en TRON y la alineación con nuestro contrato TRC20TokenUpgradeable para garantizar el mismo comportamiento y compatibilidad con billeteras, APIs y herramientas.

---

## 1. Datos oficiales USDT en TRON

| Dato | Valor |
|------|--------|
| **Contrato** | `TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t` |
| **name()** | `Colateral USD` |
| **symbol()** | `USDT` |
| **decimals()** | `6` |
| **Estándar** | TRC-20 (compatible ERC-20) |

---

## 2. Estándar TRC-20 (ITRC20 — tronprotocol/tron-contracts)

La interfaz oficial TRON para tokens es equivalente a ERC-20:

| Función / Evento | Firma / firma de evento | Nuestro contrato |
|------------------|-------------------------|------------------|
| totalSupply() | `function totalSupply() external view returns (uint256)` | ✅ `uint256 public totalSupply` (getter) |
| balanceOf | `function balanceOf(address who) external view returns (uint256)` | ✅ `balanceOf(address account)` (mismo ABI) |
| allowance | `function allowance(address owner, address spender) external view returns (uint256)` | ✅ `allowance(address ownerAddr, address spender)` (mismo ABI) |
| transfer | `function transfer(address to, uint256 value) external returns (bool)` | ✅ `transfer(address to, uint256 amount)` returns (bool) |
| approve | `function approve(address spender, uint256 value) external returns (bool)` | ✅ `approve(address spender, uint256 amount)` returns (bool) |
| transferFrom | `function transferFrom(address from, address to, uint256 value) external returns (bool)` | ✅ `transferFrom(address from, address to, uint256 amount)` returns (bool) |
| Transfer | `event Transfer(address indexed from, address indexed to, uint256 value)` | ✅ Igual |
| Approval | `event Approval(address indexed owner, address indexed spender, uint256 value)` | ✅ Igual |

**Conclusión:** Las firmas y los selectores de ABI son compatibles (parámetros `uint256`/address en el mismo orden). Las billeteras y las APIs que llaman a estas funciones funcionan igual con nuestro token.

---

## 3. Funciones adicionales tipo USDT (referencia)

El contrato de referencia (Ethereum/TRON) añade pausa, blacklist y emisión/reducción de supply. Equivalencia con nuestro contrato:

| USDT (referencia) | Nuestro contrato | Notas |
|---------------|------------------|--------|
| **Pausable** | | |
| pause() | pause() | ✅ Solo owner, bloquea transfer/approve |
| unpause() | unpause() | ✅ Solo owner |
| whenNotPaused | whenNotPaused | ✅ Modifier en transfer, approve, transferFrom |
| **Blacklist** | | |
| isBlackListed(address) | blacklisted(address) + **isBlackListed(address)** | ✅ Alias añadido para compatibilidad ABI/herramientas |
| getBlackListStatus(address) | **getBlackListStatus(address)** | ✅ Alias añadido (mismo nombre que USDT) |
| addBlackList(addr) | addBlacklist(addr) | ✅ Mismo comportamiento (solo owner) |
| removeBlackList(addr) | removeBlacklist(addr) | ✅ Mismo comportamiento |
| destroyBlackFunds(addr) | destroyBlackFunds(addr) | ✅ Quema balance de dirección blacklisted |
| **Supply** | | |
| issue(amount) | mint(owner, amount) | ✅ Emisión a owner; nosotros: mint(to, amount) a cualquier destino |
| redeem(amount) | burn(amount) por owner o burnFrom(account, amount) por owner | ✅ Reducción de supply |
| **Owner** | | |
| getOwner() | owner() | ✅ Getter público (variable `owner` pública) |
| transferOwnership(addr) | proposeOwnership + acceptOwnership (2 pasos) | ✅ Nosotros usamos 2 pasos (más seguro) |

**Diferencias aceptables:**

- **issue(amount):** La referencia emite al owner; nosotros tenemos `mint(to, amount)` (más flexible). Para emisión al owner: `mint(owner, amount)`.
- **Upgrade:** La referencia usa `deprecate(upgradedAddress)` (contrato legacy → nuevo); nosotros usamos **proxy upgradeable** (misma dirección del token, sin deprecate).
- **Fees:** La referencia tiene opción de comisiones (basisPointsRate, maximumFee); nuestro contrato **no tiene comisiones** (transfer 1:1). Alineado con USDT actual en TRON que no aplica fees en transfer.

---

## 4. Eventos

| USDT (referencia) | Nuestro contrato |
|--------------|------------------|
| Transfer(indexed from, indexed to, value) | ✅ Transfer(indexed from, indexed to, value) |
| Approval(indexed owner, indexed spender, value) | ✅ Approval(indexed owner, indexed spender, value) |
| Pause() | ✅ Pause() |
| Unpause() | ✅ Unpause() |
| AddedBlackList(user) | BlacklistAdded(addr) (mismo propósito) |
| RemovedBlackList(user) | BlacklistRemoved(addr) (mismo propósito) |
| DestroyedBlackFunds(addr, balance) | ✅ BlackFundsDestroyed(addr, amount) (mismo propósito) |
| Issue(amount) | Transfer(address(0), to, amount) + Mint(to, amount) |
| Redeem(amount) | Transfer(account, address(0), amount) + Burn(account, amount) |

Los eventos que usan billeteras y exploradores (Transfer, Approval) son idénticos. Los de administración (blacklist, pause, mint/burn) tienen equivalencia funcional.

---

## 5. Comportamiento en transfer y blacklist

- **Transfer:** Si el emisor o el receptor está en blacklist → USDT rechaza; nosotros también (whenNotBlacklisted(msg.sender) y whenNotBlacklisted(to)).
- **Transfer desde/hacia dirección congelada:** Nosotros bloqueamos con whenNotFrozen; USDT no tiene “freeze” separado, solo blacklist. Nuestro “freeze” es una capa extra (compliance).
- **Owner:** USDT puede blacklistear cualquier dirección; nosotros **no permitimos blacklistear ni congelar al owner** (CannotBlacklistOwner / CannotFreezeOwner) para evitar bloqueo del admin.

---

## 6. Compatibilidad con APIs y herramientas

- **Tronscan / triggerconstantcontract:** Las llamadas a `name()`, `symbol()`, `decimals()`, `totalSupply()`, `balanceOf(address)`, `allowance(owner, spender)` funcionan igual.
- **isBlackListed(address):** Algunas APIs o contratos comprueban este nombre (USDT). Hemos añadido **isBlackListed(address)** y **getBlackListStatus(address)** que devuelven el mismo valor que `blacklisted(addr)`.
- **getOwner():** USDT expone getOwner(); hemos añadido **getOwner()** que devuelve `owner` para compatibilidad con herramientas que llaman a getOwner() por nombre.

---

## 7. Resumen de igualación aplicada

| Aspecto | Estado |
|---------|--------|
| TRC-20 / ERC-20: totalSupply, balanceOf, allowance, transfer, approve, transferFrom | ✅ Firmas y comportamiento alineados |
| Eventos Transfer y Approval | ✅ Idénticos |
| name, symbol, decimals (metadata billetera) | ✅ Mismo uso |
| Pausa (pause/unpause) | ✅ Mismo rol (owner, bloqueo transfer/approve) |
| Blacklist (añadir, quitar, destruir fondos) | ✅ Mismo comportamiento; nombres addBlacklist/removeBlacklist |
| Consulta blacklist (isBlackListed / getBlackListStatus) | ✅ Aliases añadidos en el contrato |
| Emisión / reducción de supply (issue/redeem) | ✅ Cubierto con mint / burn / burnFrom / forceBurn |
| Owner (getOwner / transferOwnership) | ✅ owner() público; transfer en 2 pasos (propose + accept) |

Con esto, los **métodos, procedimientos e implementaciones** quedan alineados con USDT en TRON para garantizar el **correcto funcionamiento** ante billeteras, exploradores y herramientas que dependen del estándar TRC-20 y de las extensiones tipo stablecoin (blacklist, pausa, supply).
