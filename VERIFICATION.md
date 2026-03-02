# Verificación de contrato en Tronscan

## Enlaces por red

| Red | URL verificación |
|-----|------------------|
| Mainnet | https://tronscan.org/#/contracts/verify |
| Nile | https://nile.tronscan.org/#/contracts/verify |
| Shasta | https://shasta.tronscan.org/#/contracts/verify |

## Qué dirección verificar

| Contrato | Dirección | Descripción |
|----------|-----------|-------------|
| **Token (Proxy)** | `tokenAddress` en deploy-info.json | Dirección que usan usuarios y wallets. Verificar con TransparentUpgradeableProxy.sol |
| **Implementation** | `implementationAddress` | Lógica del token. Verificar con TRC20TokenUpgradeable.sol + Initializable.sol |
| **ProxyAdmin** | `proxyAdminAddress` | Gestión de upgrades. Verificar con ProxyAdmin.sol |

**Prioridad:** Verificar primero el **Token (Proxy)** — es la dirección pública del token.

## Parámetros de compilación (deben coincidir exactamente)

| Parámetro | Valor usado |
|-----------|-------------|
| **Solidity Compiler** | 0.8.34 |
| **Optimization** | Enabled |
| **Runs** | 200 |
| **License** | MIT |

## Pasos para verificar Token (Proxy)

1. Ejecutar `npm run prepare:verification`
2. Ir al enlace de verificación según tu red
3. **Contract Address:** `tokenAddress` (dirección del Proxy)
4. **Contract Name:** TransparentUpgradeableProxy
5. **Compiler:** 0.8.34, Optimization: Yes, Runs: 200
6. Subir `TransparentUpgradeableProxy.sol`
7. Completar CAPTCHA y "Verify and Publish"

## Pasos para verificar Implementation (lógica)

1. **Contract Address:** `implementationAddress`
2. **Contract Name:** TRC20TokenUpgradeable
3. Subir `TRC20TokenUpgradeable.sol` e `Initializable.sol`

## Archivos en verification/

- TRC20TokenUpgradeable.sol
- Initializable.sol
- TransparentUpgradeableProxy.sol
- ProxyAdmin.sol
- verification-params.json

Ejecutar `npm run prepare:verification` para generar.

## Errores comunes

- **"Contract has not been deployed"** — Red incorrecta o dirección errónea
- **"Please confirm the correct parameters"** — Versión compilador, optimization o runs no coinciden
