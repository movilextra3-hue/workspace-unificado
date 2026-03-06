# Verificación de flujos de todos los contratos

Revisión exhaustiva de cada función y flujo. Estado: **correcto** tras las correcciones indicadas.

---

## 1. TRC20TokenUpgradeable.sol

### Inicialización
| Función | Flujo | Verificado |
|---------|--------|------------|
| **initialize** | initializer: solo si _initialized==0 (proxy). Comprueba _owner!=0, _decimals<=77. totalSupply = _initialSupply * 10^decimals (overflow revierte en 0.8). Asigna balances, cap=max, version=1, _reentrancyStatus. Emite Transfer(0, owner, totalSupply). | ✅ |
| **initializeV2** | onlyOwner + reinitializer(2): solo una vez (_initialized<2). _cap >= totalSupply. Fija version y cap. | ✅ |

### TRC-20 estándar
| Función | Flujo | Verificado |
|---------|--------|------------|
| **transfer** | whenNotPaused, whenNotFrozen(sender), whenNotFrozen(to), whenNotBlacklisted(sender/to). _transfer(sender, to, amount): from/to!=0, to!=this, balance>=amount; resta/suma; Transfer. | ✅ |
| **approve** | whenNotPaused, whenNotFrozen(sender), whenNotBlacklisted(sender). _approve: owner/spender!=0; allowance; Approval. | ✅ |
| **transferFrom** | Modificadores sobre from/to. _spendAllowance(from, msg.sender, amount) luego _transfer(from, to, amount). Orden correcto (CEI). | ✅ |
| **increaseAllowance** | _approve(sender, spender, current + addedValue). Overflow revierte (0.8). | ✅ |
| **decreaseAllowance** | current < subtractedValue revierte. _approve(sender, spender, current - subtractedValue) en unchecked. | ✅ |

### Ownership (2 pasos)
| Función | Flujo | Verificado |
|---------|--------|------------|
| **proposeOwnership** | onlyOwner. newOwner!=0, newOwner!=owner. pendingOwner=newOwner; OwnershipProposed. | ✅ |
| **acceptOwnership** | msg.sender==pendingOwner. OwnershipTransferred; owner=msg.sender; pendingOwner=0. | ✅ |
| **cancelOwnershipTransfer** | onlyOwner. pendingOwner!=0. pendingOwner=0. | ✅ |

### Pausa
| Función | Flujo | Verificado |
|---------|--------|------------|
| **pause** | onlyOwner. !paused. paused=true; Pause. | ✅ |
| **unpause** | onlyOwner. paused. paused=false; Unpause. | ✅ |

### Mint / Burn
| Función | Flujo | Verificado |
|---------|--------|------------|
| **mint** | onlyOwner, **whenNotFrozen(to)**, whenNotBlacklisted(to), nonReentrant. to!=0, to!=this, totalSupply+amount<=cap. totalSupply+=amount; _balances[to]+=amount; Transfer(0,to); Mint. | ✅ (corregido: no mint a frozen) |
| **burn** | whenNotPaused, whenNotFrozen(sender), whenNotBlacklisted(sender). _burn(sender, amount). | ✅ |
| **burnFrom** | onlyOwner. _spendAllowance(account, owner); _burn(account, amount). | ✅ |
| **forceBurn** | onlyOwner. account!=0. _burn(account, amount); ForceBurn. | ✅ |

### Freeze / Blacklist
| Función | Flujo | Verificado |
|---------|--------|------------|
| **freezeAddress** | onlyOwner. addr!=0, addr!=owner, !frozen. frozen[addr]=true; AddressFrozen. | ✅ |
| **unfreezeAddress** | onlyOwner. frozen[addr]. frozen[addr]=false; AddressUnfrozen. | ✅ |
| **addBlacklist** | onlyOwner. addr!=0, addr!=owner, !blacklisted. blacklisted[addr]=true; BlacklistAdded. | ✅ |
| **removeBlacklist** | onlyOwner. blacklisted[addr]. blacklisted[addr]=false; BlacklistRemoved. | ✅ |
| **destroyBlackFunds** | onlyOwner. blacklisted[addr]. amount=_balances[addr]; si amount>0 _burn(addr,amount); BlackFundsDestroyed. | ✅ |
| **batchFreeze/Unfreeze** | onlyOwner. addrs.length!=0. Bucle omitiendo 0, owner, ya congelados; emit por cada cambio. | ✅ |
| **batchAddBlacklist/RemoveBlacklist** | onlyOwner. Mismo patrón. | ✅ |

### Permit (EIP-2612)
| Función | Flujo | Verificado |
|---------|--------|------------|
| **permit** | whenNotPaused, whenNotFrozen(tokenOwner), whenNotBlacklisted(tokenOwner). deadline; s en rango; nonce actual en structHash; nonces[tokenOwner]++; ecrecover==tokenOwner; _approve. Replay: siguiente llamada usa nonce+1 en hash, firma no coincide. | ✅ |

### Recuperación
| Función | Flujo | Verificado |
|---------|--------|------------|
| **recoverTokens** | onlyOwner, nonReentrant. to!=0. amount=_balances[this]; amount==0 revierte. _balances[this]=0; _balances[to]+=amount; Transfer; TokensRecovered. | ✅ |
| **recoverTRX** | onlyOwner, nonReentrant. to!=0. amount=balance; amount==0 revierte. TRXRecovered; call{value}. Si falla revierte todo. | ✅ |
| **recoverToken** | onlyOwner, nonReentrant. to!=0; tokenAddr!=this. **Llamada transfer externa; comprobar ok y (si data>=32) bool success.** Emit **después** de éxito. | ✅ (corregido: evento tras éxito) |

### Cap y vistas
| Función | Flujo | Verificado |
|---------|--------|------------|
| **setCap** | onlyOwner. newCap>=totalSupply. cap=newCap; CapUpdated. | ✅ |
| **balanceOf, allowance, getAddressStatus, isBlackListed, getBlackListStatus, getOwner, DOMAIN_SEPARATOR** | Solo lectura; sin efectos. | ✅ |

### Internas (_transfer, _approve, _spendAllowance, _burn)
| Función | Flujo | Verificado |
|---------|--------|------------|
| **_transfer** | from/to!=0, to!=this, _balances[from]>=amount. unchecked resta/suma; Transfer. | ✅ |
| **_approve** | owner/spender!=0. _allowances=amount; Approval. | ✅ |
| **_spendAllowance** | current>=amount. unchecked _allowances-=amount. | ✅ |
| **_burn** | account!=0, _balances[account]>=amount. unchecked balance-=amount, totalSupply-=amount; Transfer(account,0); Burn. | ✅ |

---

## 2. Initializable.sol

| Elemento | Flujo | Verificado |
|----------|--------|------------|
| **initializer** | Permite solo si (_initializing && _isConstructor()) \|\| _initialized==0. En proxy (delegatecall) _isConstructor()=false; _initialized en storage del proxy. Primera llamada: _initialized=0 OK; pone _initialized=1. Segunda: revierte AlreadyInitialized. | ✅ |
| **reinitializer(2)** | Permite si !_initializing && _initialized < 2. Tras initialize, _initialized=1; permite una llamada. Pone _initialized=2. Si el cuerpo revierte, toda la tx revierte (incl. _initialized=2). | ✅ |
| **_disableInitializers** | En constructor de implementación; _initialized=255. Evita init en el contrato de implementación (solo se usa vía proxy). | ✅ |

---

## 3. TransparentUpgradeableProxy.sol

| Función / flujo | Verificado |
|------------------|------------|
| **constructor** | _logic!=0, tiene código; admin_!=0. _setAdmin(admin_); _setImplementation(_logic). Si _data.length>0, delegatecall a _logic con _data (init). En este proyecto se usa _data=0x y se llama initialize después. | ✅ |
| **fallback / receive** | _fallback: impl=_implementation(); delegatecall(impl). Retorno/revert se propagan. | ✅ |
| **upgradeTo** | Función **del proxy** (no delegada). msg.sender==_admin(); newImplementation!=0 y con código; _setImplementation. Llamada proxy.upgradeTo(impl) la ejecuta el proxy; solo admin puede. | ✅ |
| **implementation() / admin()** | Vistas que leen slots EIP-1967. | ✅ |

---

## 4. ProxyAdmin.sol

| Función | Flujo | Verificado |
|---------|--------|------------|
| **constructor** | owner=msg.sender; OwnershipTransferred(0, sender). | ✅ |
| **proposeOwnership / acceptOwnership / cancelOwnershipTransfer** | Mismo patrón que token: comprobaciones, pendingOwner, eventos. | ✅ |
| **transferOwnership** | newOwner!=0; owner=newOwner; pendingOwner=0 si estaba puesto. | ✅ |
| **upgrade** | onlyOwner, nonReentrant. proxyAddress!=0, newImplementation!=0. proxy.call(upgradeTo(newImplementation)). Si !success revierte UpgradeFailed. Emit Upgraded. | ✅ |
| **callProxy** | onlyOwner, nonReentrant. proxy.call(data). Si !success revierte CallFailed. Devuelve result. | ✅ |

---

## Correcciones aplicadas en esta verificación

1. **mint**: Añadido **whenNotFrozen(to)** para que no se pueda mintear a direcciones congeladas (coherente con “frozen no puede recibir”).
2. **recoverToken**: **Evento ExternalTokenRecovered** se emite **después** de que la llamada transfer tenga éxito y (si aplica) el bool devuelto sea true; así el evento solo se emite cuando la recuperación es efectiva.

---

## Resumen

- Todos los flujos de **TRC20TokenUpgradeable**, **Initializable**, **TransparentUpgradeableProxy** y **ProxyAdmin** han sido revisados.
- Controles de acceso (onlyOwner, admin, modifiers), comprobaciones de dirección/amount, orden de operaciones y eventos son correctos.
- Compilación: `npm run compile` correcta tras los cambios.
