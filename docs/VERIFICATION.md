# Verificación de contratos en Tronscan

Pasos para verificar el código fuente de los contratos desplegados en Tronscan (Nile, Shasta o Mainnet).

## 1. Generar el paquete de verificación

Desde la raíz del proyecto:

```bash
npm run prepare:verification
```

Esto crea la carpeta `verification/` (o la actualiza) con copias de:

- `TRC20TokenUpgradeable.sol`
- `Initializable.sol`
- `TransparentUpgradeableProxy.sol`
- `ProxyAdmin.sol`
- `verification-params.json` (compilador, optimización, etc.)

**Nota:** La carpeta `verification/` está en `.gitignore`; se genera localmente cuando vas a verificar.

## 2. Direcciones a verificar

Tras un despliegue, en `deploy-info.json` tendrás:

- **tokenAddress** → dirección del **Proxy** (es la dirección pública del token)
- **implementationAddress** → implementación de `TRC20TokenUpgradeable`
- **proxyAdminAddress** → contrato `ProxyAdmin`

En Tronscan debes verificar **cada contrato con su propia dirección**:

| Contrato | Dirección a usar | Archivo principal |
|----------|------------------|-------------------|
| Token (lógica) | `implementationAddress` | TRC20TokenUpgradeable.sol |
| Proxy | `tokenAddress` | TransparentUpgradeableProxy.sol |
| ProxyAdmin | `proxyAdminAddress` | ProxyAdmin.sol |

Para la **implementación** (TRC20TokenUpgradeable), en Tronscan suele pedirse también el código de **Initializable.sol** (o se incluye en el mismo archivo si se usa un solo archivo concatenado). Dependiendo del verificador, puedes subir varios archivos o un “flatten” de TRC20TokenUpgradeable + Initializable.

## 3. Parámetros de compilación

Deben coincidir con `tronbox.js`:

- **Compiler:** Solidity 0.8.34
- **Optimization:** Enabled
- **Runs:** 200
- **License:** MIT

El archivo `verification/verification-params.json` incluye estos datos (y, si existe, información de `deploy-info.json`).

## 4. Enlaces para verificación

- **Mainnet:** https://tronscan.org/#/contracts/verify  
- **Nile:** https://nile.tronscan.org/#/contracts/verify  
- **Shasta:** https://shasta.tronscan.org/#/contracts/verify  

Selecciona la red correcta, pega la dirección del contrato que quieras verificar e introduce el código y los parámetros de compilación según indique la interfaz.

## 5. Orden recomendado

1. Verificar **ProxyAdmin** con `proxyAdminAddress`.
2. Verificar **TRC20TokenUpgradeable** (implementación) con `implementationAddress` (incluyendo o adjuntando Initializable si el verificador lo pide).
3. Verificar **TransparentUpgradeableProxy** con `tokenAddress` (dirección del proxy/token).

Así, en Tronscan quedará enlazado el código de cada contrato con su dirección y podrás leer el código desde la pestaña “Contract” de cada dirección.
