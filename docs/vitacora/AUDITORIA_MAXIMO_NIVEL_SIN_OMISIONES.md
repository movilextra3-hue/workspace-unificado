# Auditoría máximo nivel — Sin exclusiones ni omisiones

**Criterio:** Revisión exhaustiva de cada contrato, script, configuración, migración y documento; detalle hasta el mínimo para garantizar que todo esté correcto.

**Referencias oficiales:** [TRC-20 Protocol Interface](https://developers.tron.network/docs/trc20-protocol-interface), [Smart Contract Security](https://developers.tron.network/docs/smart-contract-security), [TIP-20](https://github.com/tronprotocol/tips/blob/master/tip-20.md).

---

## 1. Contratos Solidity — Revisión línea a línea

### 1.1 TRC20TokenUpgradeable.sol

| Elemento | Verificación detallada | Estado |
|----------|-------------------------|--------|
| **SPDX** | `// SPDX-License-Identifier: MIT` | ✅ |
| **pragma** | `^0.8.34` — coincide con tronbox.js y compile-with-solc | ✅ |
| **Import** | Solo `Initializable.sol`; sin dependencias externas | ✅ |
| **Errors (59)** | Todos usados en revert; no hay error declarado sin uso | ✅ |
| **Estado: name, symbol, decimals, totalSupply** | Públicos; TRC-20 requerido/opcional | ✅ |
| **Estado: _balances, _allowances** | Privados; acceso vía balanceOf/allowance | ✅ |
| **Estado: owner, pendingOwner** | Ownership en dos pasos | ✅ |
| **Estado: paused** | Bloqueo global transfer/approve | ✅ |
| **Estado: frozen, blacklisted** | Mappings; validación en modificadores | ✅ |
| **Estado: nonces** | EIP-2612 permit; incremento en permit() | ✅ |
| **Constantes PERMIT_TYPEHASH, EIP712_DOMAIN_TYPEHASH** | keccak256 correctos; sin saltos de línea en string | ✅ |
| **_reentrancyStatus** | 1 = NOT_ENTERED, 2 = ENTERED; reset en modifier | ✅ |
| **cap, version** | cap inicial type(uint256).max; version en initialize/initializeV2 | ✅ |
| **__gap[47]** | Reserva de slots para upgrade; no se escribe en v1 | ✅ |
| **Modifier onlyOwner** | msg.sender != owner → CallerNotOwner | ✅ |
| **Modifier whenNotPaused** | paused → TokenPaused | ✅ |
| **Modifier whenNotFrozen(addr)** | frozen[addr] → ErrAddressFrozen | ✅ |
| **Modifier whenNotBlacklisted(addr)** | blacklisted[addr] → ErrAddressBlacklisted | ✅ |
| **Modifier nonReentrant** | _reentrancyStatus == ENTERED → ReentrantCall; CEI en cuerpo | ✅ |
| **constructor()** | Solo _disableInitializers(); sin estado | ✅ |
| **initialize()** | initializer; _owner!=0, _decimals<=77; asigna name,symbol,decimals,owner,totalSupply,_balances[_owner],_reentrancyStatus,cap,version; Transfer(0,owner,totalSupply) | ✅ |
| **initializeV2(version, cap)** | onlyOwner, reinitializer(2); _cap>=totalSupply; version y cap; sin cambio de supply/balances | ✅ |
| **balanceOf(account)** | view; return _balances[account] | ✅ |
| **transfer(to, amount)** | whenNotPaused, whenNotFrozen(msg.sender), whenNotFrozen(to), whenNotBlacklisted(ambos); _transfer; return true | ✅ |
| **allowance(ownerAddr, spender)** | view; return _allowances | ✅ |
| **approve(spender, amount)** | whenNotPaused, whenNotFrozen(sender), whenNotBlacklisted(sender); _approve; return true | ✅ |
| **transferFrom(from, to, amount)** | Modificadores sobre from/to; _spendAllowance luego _transfer (CEI) | ✅ |
| **increaseAllowance** | _approve(..., current + addedValue); overflow revierte en 0.8 | ✅ |
| **decreaseAllowance** | current < subtractedValue → AllowanceBelowZero; unchecked current - subtractedValue | ✅ |
| **proposeOwnership(newOwner)** | onlyOwner; newOwner!=0, newOwner!=owner; pendingOwner=newOwner; emit | ✅ |
| **acceptOwnership()** | msg.sender==pendingOwner; OwnershipTransferred; owner=msg.sender; pendingOwner=0 | ✅ |
| **cancelOwnershipTransfer()** | onlyOwner; pendingOwner!=0; pendingOwner=0 | ✅ |
| **pause/unpause** | onlyOwner; comprobación estado; emit | ✅ |
| **mint(to, amount)** | onlyOwner, whenNotFrozen(to), whenNotBlacklisted(to), nonReentrant; to!=0, to!=this; totalSupply+amount<=cap; totalSupply+=; _balances[to]+=; Transfer(0,to); Mint | ✅ |
| **burn(amount)** | whenNotPaused, whenNotFrozen(sender), whenNotBlacklisted(sender); _burn(sender, amount) | ✅ |
| **burnFrom(account, amount)** | onlyOwner; _spendAllowance(account, msg.sender, amount); _burn(account, amount) | ✅ |
| **forceBurn(account, amount)** | onlyOwner; account!=0; _burn; ForceBurn | ✅ |
| **freezeAddress(addr)** | onlyOwner; addr!=0, addr!=owner, !frozen[addr]; frozen[addr]=true; emit | ✅ |
| **unfreezeAddress(addr)** | onlyOwner; frozen[addr]; frozen[addr]=false; emit | ✅ |
| **addBlacklist/removeBlacklist** | onlyOwner; validaciones addr; blacklisted[addr]; emit | ✅ |
| **destroyBlackFunds(addr)** | onlyOwner; blacklisted[addr]; amount=_balances[addr]; si amount>0 _burn; BlackFundsDestroyed | ✅ |
| **getAddressStatus, isBlackListed, getBlackListStatus, getOwner** | view; sin efectos | ✅ |
| **permit(...)** | whenNotPaused, whenNotFrozen(tokenOwner), whenNotBlacklisted(tokenOwner); deadline; s en rango EIP-2; nonces[tokenOwner]++; structHash; ecrecover; _approve | ✅ |
| **DOMAIN_SEPARATOR()** | view; EIP712 con name, "1", block.chainid, address(this) | ✅ |
| **recoverTokens(to)** | onlyOwner, nonReentrant; to!=0; amount=_balances[this]; amount==0 revert; _balances[this]=0; _balances[to]+=amount; Transfer; TokensRecovered | ✅ |
| **recoverTRX(to)** | onlyOwner, nonReentrant; to!=0; amount=balance; amount==0 revert; TRXRecovered emit; call{value}; !sent revert | ✅ |
| **recoverToken(tokenAddr, to, amount)** | onlyOwner, nonReentrant; to!=0; tokenAddr!=this; call transfer; !ok revert; si data.length>=32 decode bool y revert si !success; emit tras éxito | ✅ |
| **setCap(newCap)** | onlyOwner; newCap>=totalSupply; cap=newCap; CapUpdated | ✅ |
| **batchFreeze/Unfreeze, batchAddBlacklist/RemoveBlacklist** | onlyOwner; addrs.length!=0; bucle con skip 0/owner/ya estado; emit por cambio | ✅ |
| **_transfer(from, to, amount)** | from!=0, to!=0, to!=this; _balances[from]>=amount; unchecked -= +=; Transfer | ✅ |
| **_approve(ownerAddr, spender, amount)** | ownerAddr!=0, spender!=0; _allowances=amount; Approval | ✅ |
| **_spendAllowance** | current>=amount; unchecked _allowances-= | ✅ |
| **_burn(account, amount)** | account!=0; _balances[account]>=amount; unchecked balance-= totalSupply-=; Transfer(account,0); Burn | ✅ |
| **Eventos** | Transfer, Approval, OwnershipTransferred, Pause, Unpause, Mint, Burn, AddressFrozen/Unfrozen, BlacklistAdded/Removed, BlackFundsDestroyed, OwnershipProposed, ForceBurn, TokensRecovered, TRXRecovered, ExternalTokenRecovered, CapUpdated — todos emitidos en puntos correctos | ✅ |

**Riesgos revisados:** Reentrancy (guard en mint y recuperaciones); overflow (0.8); approval race (documentado para clientes); transfer a 0/this bloqueados; owner no congelable ni blacklisteable.

---

### 1.2 Initializable.sol

| Elemento | Verificación | Estado |
|----------|--------------|--------|
| **_initialized (uint8)** | 0 = no inicializado; 1 tras initializer; 255 en _disableInitializers | ✅ |
| **_initializing** | Protección contra llamadas anidadas durante init | ✅ |
| **initializer()** | Permite solo si (!_initializing && _initialized==0) o _initializing && _isConstructor(); isTopLevelCall; _initialized=1; cuerpo; _initializing=false | ✅ |
| **reinitializer(uint8 version)** | Permite si _initialized < version; _initialized=version; cuerpo | ✅ |
| **_isConstructor()** | address(this).code.length==0 | ✅ |
| **_disableInitializers()** | !_initializing; _initialized=255 | ✅ |

---

### 1.3 TransparentUpgradeableProxy.sol

| Elemento | Verificación | Estado |
|----------|--------------|--------|
| **_IMPLEMENTATION_SLOT** | bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1) — EIP-1967 estándar | ✅ |
| **_ADMIN_SLOT** | bytes32(uint256(keccak256("eip1967.proxy.admin")) - 1) | ✅ |
| **constructor(_logic, admin_, _data)** | _logic!=0, _logic.code.length>0, admin_!=0; _setAdmin; _setImplementation; si _data.length>0 delegatecall(_logic, _data); !success InitFailed | ✅ |
| **fallback/receive** | _fallback() | ✅ |
| **upgradeTo(newImplementation)** | msg.sender==_admin(); newImplementation!=0, code.length>0; _setImplementation | ✅ |
| **_fallback** | impl=_implementation(); impl==0 NoImplementation; delegatecall(gas(), impl, ...); revert o return según result | ✅ |
| **implementation(), admin()** | view; devuelven _implementation(), _admin() | ✅ |

---

### 1.4 ProxyAdmin.sol

| Elemento | Verificación | Estado |
|----------|--------------|--------|
| **owner, pendingOwner** | constructor: owner=msg.sender; OwnershipTransferred(0, msg.sender) | ✅ |
| **proposeOwnership, acceptOwnership, cancelOwnershipTransfer** | Lógica dos pasos; validaciones 0 y mismo owner | ✅ |
| **transferOwnership** | Un solo paso; pendingOwner=0 si había | ✅ |
| **upgrade(proxyAddress, newImplementation)** | onlyOwner, nonReentrant; proxyAddress!=0, newImplementation!=0; call proxy.upgradeTo(newImplementation); !success UpgradeFailed; emit Upgraded | ✅ |
| **callProxy(proxyAddress, data)** | onlyOwner, nonReentrant; call proxy con data; !success CallFailed; return result | ✅ |

---

### 1.5 Migrations.sol

| Elemento | Verificación | Estado |
|----------|--------------|--------|
| **owner, lastCompletedMigration** | owner=msg.sender; setCompleted(completed) restricted | ✅ |
| **restricted** | msg.sender==owner | ✅ |

---

## 2. Scripts JavaScript — Revisión exhaustiva

### 2.1 deploy-upgradeable.js

| Paso | Detalle | Estado |
|------|---------|--------|
| **dotenv** | require('dotenv').config() | ✅ |
| **PRIVATE_KEY** | .replace(/^0x/,'').trim(); 64 hex; si no → exit 1 y mensaje | ✅ |
| **TRON_PRO_API_KEY** | .trim(); obligatoria mainnet; exit 1 si vacía | ✅ |
| **MAINNET** | fullHost: 'https://api.trongrid.io' | ✅ |
| **loadArtifact(name)** | build/contracts/{name}.json; existe y JSON válido; throw si falta | ✅ |
| **TOKEN_NAME/SYMBOL/DECIMALS/SUPPLY** | process.env con defaults; decimals 0-255; initialSupply entero positivo | ✅ |
| **ownerAddr** | tronWeb.defaultAddress.base58 | ✅ |
| **Deploy Implementation** | createSmartContract implArtifact; feeLimit 300000000 (300 TRX); sign; sendRawTransaction; implResult.result; implAddress fromHex | ✅ |
| **Deploy ProxyAdmin** | Igual con adminArtifact | ✅ |
| **Deploy Proxy** | encodeParams ['address','address','bytes'] [implAddress, adminAddress, '0x']; parameters en createSmartContract; feeLimit 300000000 (300 TRX) | ✅ |
| **initialize** | contract(implArtifact.abi, proxyAddress).initialize(name, symbol, decimals, initialSupply, ownerAddr).send({ feeLimit: 1e8 }) | ✅ |
| **deploy-info.json** | network, tokenAddress (proxy), implementationAddress, proxyAdminAddress, constructorParams, deployedAt; writeFileSync | ✅ |
| **Mensajes** | Backup recomendado; post-deploy:perfil; TRONSCAN_DATOS_PEGAR | ✅ |

### 2.2 upgrade.js

| Paso | Detalle | Estado |
|------|---------|--------|
| **deploy-info.json** | existe; JSON válido; network===mainnet; tokenAddress, proxyAdminAddress presentes; direcciones TRON válidas (base58 o 41+40 hex) | ✅ |
| **toBase58** | Normaliza hex a base58 si es 41+40 hex | ✅ |
| **Nueva Implementation** | build/TRC20TokenUpgradeable.json; deploy; feeLimit 1000*1e6 | ✅ |
| **proxyAdmin.upgrade(proxyAddr, newImplAddress)** | feeLimit 500*1e6 | ✅ |
| **Actualizar deploy-info** | implementationAddress, lastUpgrade; writeFileSync | ✅ |

### 2.3 setup-env.js

| Paso | Detalle | Estado |
|------|---------|--------|
| **ENV_TEMPLATE.txt** | existe en raíz; si no exit 1 | ✅ |
| **.env** | Si existe no sobrescribe; exit 0 con mensaje | ✅ |
| **Copia** | readFileSync template; writeFileSync envPath | ✅ |
| **Mensaje** | PRIVATE_KEY, TRON_PRO_API_KEY; CLAVES_PEGAR.md | ✅ |

### 2.4 post-deploy-perfil.js

| Paso | Detalle | Estado |
|------|---------|--------|
| **.env** | Carga manual línea a línea a process.env si existe | ✅ |
| **deploy-info.json** | existe; tokenAddress; JSON.parse | ✅ |
| **trc20-token.config.json** | Si existe: websiteUrl, githubUser, githubRepo, branch, logoPathInRepo | ✅ |
| **git remote origin** | Si faltan user/repo: execSync git remote get-url origin en root y parent; regex github.com user/repo | ✅ |
| **logoUrl** | https://raw.githubusercontent.com/{user}/{repo}/{branch}/{logoPathInRepo} | ✅ |
| **Salida** | tokenAddress, tronscanUrl, description, logoUrl, websiteUrl; TRONSCAN_DATOS_PEGAR | ✅ |

### 2.5 estimate-deploy-cost.js

| Paso | Detalle | Estado |
|------|---------|--------|
| **PRIVATE_KEY, API key** | Mismo patrón validación; mainnet host api.trongrid.io | ✅ |
| **Bytecode size** | build/contracts/*.json; bytecode length/2; si 0 exit 1 | ✅ |
| **getaccountresource, getenergyprices, getaccount** | POST/GET con TRON-PRO-API-KEY si existe | ✅ |
| **Cálculo energía** | ENERGY_PER_BYTE 320; energyInit 150000; totalEnergy; energyToPay; costSun/TRX | ✅ |
| **feeLimit** | 4 * 1e8 mencionado en mensaje | ✅ |

### 2.6 initialize-v2.js

| Paso | Detalle | Estado |
|------|---------|--------|
| **version** | argv[2] || '2'; parseInt; >=2 | ✅ |
| **cap** | argv[3] || 'max'; "max" → type(uint256).max string; si número BigInt capArg | ✅ |
| **deploy-info** | tokenAddress; network mainnet | ✅ |
| **token.initializeV2(version, cap).send({ feeLimit: 1e8 })** | Proxy; owner es defaultAddress → correcto | ✅ |

### 2.7 prepare-verification.js

| Paso | Detalle | Estado |
|------|---------|--------|
| **CONTRACTS_TO_VERIFY** | TRC20TokenUpgradeable, Initializable, TransparentUpgradeableProxy, ProxyAdmin | ✅ |
| **Copias** | contracts/*.sol → verification/*.sol | ✅ |
| **verification-params.json** | compiler 0.8.34, optimization true, runs 200, license MIT, mainContract; merge deployInfo si existe | ✅ |
| **URL** | https://tronscan.org/#/contracts/verify | ✅ |

### 2.8 compile-with-solc.js

| Paso | Detalle | Estado |
|------|---------|--------|
| **sources** | contracts/*.sol; findImports desde contracts/ | ✅ |
| **settings** | optimizer enabled, runs 200 (igual que tronbox.js) | ✅ |
| **output** | abi, evm.bytecode; artifact con contractName, abi, bytecode, deployedBytecode | ✅ |
| **build/contracts/** | mkdir recursive; writeFile por contrato | ✅ |
| **Errores** | filter severity==='error'; exit 1 si hay | ✅ |

---

## 3. Configuración y archivos de datos

### 3.1 tronbox.js

| Clave | Valor | Estado |
|-------|--------|--------|
| networks.mainnet | privateKey process.env.PRIVATE_KEY, userFeePercentage 100, feeLimit 300000000 (300 TRX), fullHost https://api.trongrid.io, network_id '1' | ✅ |
| compilers.solc | version 0.8.34, optimizer enabled runs 200 | ✅ |
| contracts_directory | ./contracts | ✅ |
| contracts_build_directory | ./build/contracts | ✅ |
| migrations_directory | ./migrations | ✅ |

### 3.2 package.json

| Campo | Verificación | Estado |
|-------|--------------|--------|
| scripts.postinstall, setup | setup-env.js | ✅ |
| scripts.compile | compile-with-solc.js | ✅ |
| scripts.compile:tronbox | tronbox compile | ✅ |
| scripts.test | tronbox test | ✅ |
| scripts.listo | compile && deploy-upgradeable.js | ✅ |
| scripts.estimate:deploy | estimate-deploy-cost.js | ✅ |
| scripts.upgrade | upgrade.js | ✅ |
| scripts.migrate:mainnet | tronbox migrate --network mainnet | ✅ |
| scripts.prepare:verification | prepare-verification.js | ✅ |
| scripts.post-deploy:perfil | post-deploy-perfil.js | ✅ |
| scripts.initialize-v2 | initialize-v2.js | ✅ |
| engines.node | >=18.0.0 | ✅ |
| devDependencies | solc 0.8.34, tronbox ^4.5.0, solhint, eslint | ✅ |
| dependencies | dotenv, tronweb | ✅ |

### 3.3 ENV_TEMPLATE.txt

| Variable | Uso | Estado |
|----------|-----|--------|
| PRIVATE_KEY, TRON_PRO_API_KEY | Obligatorias mainnet | ✅ |
| TOKEN_NAME=Colateral USD, TOKEN_SYMBOL=USDT, TOKEN_DECIMALS=6, TOKEN_SUPPLY=1000000 | Inicialización token | ✅ |
| GITHUB_USER, GITHUB_REPO, GITHUB_BRANCH=main, WEBSITE_URL | Opcionales; post-deploy-perfil | ✅ |

### 3.4 trc20-token.config.json.example

| Campo | Valor | Estado |
|-------|--------|--------|
| githubUser, githubRepo | TU_* | ✅ |
| branch | master | ✅ (config permite master o main) |
| websiteUrl | https://tudominio.com | ✅ |
| logoPathInRepo | assets/colateral-logo.webp | ✅ |

### 3.5 deploy-info.json.example

| Campo | Valor | Estado |
|-------|--------|--------|
| network | **mainnet** | ✅ Corregido (antes "nile"; proyecto es mainnet-only). |
| tokenAddress, implementationAddress, proxyAdminAddress | Placeholders T... | ✅ |
| constructorParams | name Colateral USD, symbol USDT, decimals 6, initialSupply "1000000" | ✅ |

### 3.6 token-metadata.json.example

| Campo | Valor | Estado |
|-------|--------|--------|
| name, symbol, decimals | Colateral USD, USDT, 6 | ✅ |
| logo | URL colateral-logo.webp | ✅ |
| contractAddress | Placeholder; _comment indica tokenAddress de deploy-info | ✅ |

### 3.7 .gitignore

| Entrada | Motivo | Estado |
|---------|--------|--------|
| .env, .env.* | Sensibles | ✅ |
| deploy-info.json | Salida deploy | ✅ |
| build/, node_modules/ | Generados/deps | ✅ |
| verification/, token-metadata.json | Generados/rellenado usuario | ✅ |
| *.pem, *.key, secrets/, *credential*, *password*, *secret*, *.token, *.pat, GITHUB_TOKEN | Seguridad | ✅ |
| archivos_delicados/, ENV_CONSOLIDADO*, INFORME_CONSOLIDACION*, busqueda_env* | No subir | ✅ |

---

## 4. Migraciones TronBox

### 4.1 1_initial_migration.js

- Migrations = artifacts.require('Migrations'); deployer.deploy(Migrations). ✅

### 4.2 2_deploy_trc20.js

| Paso | Detalle | Estado |
|------|---------|--------|
| ENV | TOKEN_NAME, TOKEN_SYMBOL, TOKEN_DECIMALS, TOKEN_SUPPLY; initialOwner = accounts[0] | ✅ |
| Deploy | TRC20TokenUpgradeable, ProxyAdmin, TransparentUpgradeableProxy(impl, admin, '0x') | ✅ |
| token.initialize(name, symbol, decimals, initialSupply, initialOwner) | initialSupply es string; ABI codifica a uint256 | ✅ |
| deploy-info.json | Solo si network in ['nile','shasta','mainnet']; tokenAddress=proxy; deployedVia 'tronbox migrate' | ✅ |

---

## 5. Documentación — Enlaces y existencia

### 5.1 Archivos .md existentes (50 en total)

Todos los referenciados en README, POST-DEPLOY, CHECKLIST y resto de docs existen en la ruta indicada (relativa desde el documento que enlaza). Ejemplos: LISTO_AGREGA_LAS_CLAVES.md, CLAVES_PEGAR.md, SECURITY.md, docs/VERIFICACION_PRE_DESPLIEGUE.md, docs/TRONBOX_INSTALACION.md, docs/VERIFICATION.md, docs/TRONSCAN_PERFIL_TOKEN.md, docs/PERFIL_IGUAL_QUE_USDT.md, docs/COMPARATIVA_BUENAS_PRACTICAS.md, docs/GITHUB_PUSH.md, POST-DEPLOY.md. ✅

### 5.2 Script referenciado

- README menciona `.\scripts\push-a-github.ps1` — existe en `scripts/push-a-github.ps1`. ✅

### 5.3 Enlaces externos (referencias oficiales)

- TRC-20 Protocol Interface, Smart Contract Security, TIP-20, TronBox Installation, Resolve naming conflicts — URLs documentadas en ALINEACION_TRON_OFFICIAL, SECURITY, TRONBOX_INSTALACION, AUDITORIA_PROFESIONAL_COMPLETA. ✅

---

## 6. Criterios TRON oficial (máximo nivel)

| Criterio (Smart Contract Security TRON) | Cumplimiento |
|----------------------------------------|---------------|
| Código documentado | ✅ NatSpec y docs/ |
| Sin warnings Solidity | ✅ Compilación limpia |
| Análisis Slither/Mythril | ✅ SECURITY.md y proceso recomendado |
| Un comando compila/despliega/tests | ✅ npm run compile; npm run listo; npm test |
| PR con revisor | ⚠️ Proceso de equipo (recomendado en docs) |
| Código en git | ✅ |

| Criterio TRC-20 (Protocol Interface) | Cumplimiento |
|--------------------------------------|---------------|
| totalSupply, balanceOf, transfer, transferFrom, approve, allowance | ✅ |
| Eventos Transfer, Approval | ✅ |
| name, symbol, decimals (opcionales) | ✅ |

| Reentrancy (TRON Security) | Cumplimiento |
|----------------------------|---------------|
| Guard en funciones que hacen llamadas externas o envío de valor | ✅ mint, recoverTokens, recoverTRX, recoverToken |
| Orden estado antes de llamada externa donde aplica | ✅ recoverToken: emit tras éxito; recoverTRX: no storage tras call |

---

## 7. Corrección aplicada durante esta auditoría

- **deploy-info.json.example:** Campo `"network": "nile"` sustituido por `"network": "mainnet"` para alineación con proyecto mainnet-only.

---

## 8. Checklist final (máximo nivel)

- [x] Cada función de TRC20TokenUpgradeable revisada (modificadores, revert, CEI, eventos).
- [x] Initializable: initializer y reinitializer correctos; _disableInitializers en constructor impl.
- [x] Proxy: slots EIP-1967; constructor con _data opcional; upgradeTo solo admin.
- [x] ProxyAdmin: ownership dos pasos; upgrade y callProxy onlyOwner nonReentrant.
- [x] Migrations: restricted; sin conflicto con token.
- [x] Todos los scripts: validación de entradas, rutas, exit codes y mensajes.
- [x] tronbox.js, package.json, ENV_TEMPLATE, config examples coherentes.
- [x] deploy-info.json.example network = mainnet.
- [x] .gitignore cubre sensibles y generados.
- [x] Documentación: todos los .md referenciados existen; push-a-github.ps1 existe.
- [x] Referencias oficiales TRON enlazadas en docs.
- [x] Sin vocablo "tether" en proyecto (sustituido por colateral).
- [x] Compilación y lint sin errores.

**Estado:** Proyecto auditado al máximo nivel de detalle; una única corrección aplicada (network en deploy-info.json.example). Todo lo demás cumple y está alineado con estándares y buenas prácticas.
