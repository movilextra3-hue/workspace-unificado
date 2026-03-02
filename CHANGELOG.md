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
