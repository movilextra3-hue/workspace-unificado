# Comprobación: datos de verificación vs mainnet

Comprobado contra la API de Tronscan (mainnet) para el **Implementation**.

## Contrato en mainnet (API)

- **URL API:** `https://apilist.tronscanapi.com/api/contract?contract=TYqRvxioNWBqVa2nJGog8RkYQrXQdPJwR3`
- **address:** `TYqRvxioNWBqVa2nJGog8RkYQrXQdPJwR3`
- **name:** `TRC20TokenUpgradeable`
- **verify_status:** 0 (no verificado)
- **is_proxy:** false
- **creator:** TWYhXqeMMtEePYnk2WdhoyyvHWxA1ay9Gz

## Lo que usamos en la verificación

| Dato              | Valor que damos              | Mainnet / proyecto     | ¿Coincide? |
|-------------------|-----------------------------|-------------------------|------------|
| Contract Address  | TYqRvxioNWBqVa2nJGog8RkYQrXQdPJwR3 | API: mismo address      | Sí         |
| Main Contract     | TRC20TokenUpgradeable       | API: name = mismo       | Sí         |
| Compiler          | 0.8.34                      | tronbox.js `version: '0.8.34'` (con el que se desplegó) | Sí         |
| Optimization      | Yes                         | tronbox.js `enabled: true`      | Sí         |
| Runs              | 200                         | tronbox.js `runs: 200`          | Sí         |

## Origen de las direcciones en el proyecto

- **abi/addresses.json** y **deploy-info.json** (si existe): `implementationAddress: TYqRvxioNWBqVa2nJGog8RkYQrXQdPJwR3`
- Misma dirección en scripts (prepare-verification, verify-implementation-oklink) y documentación.

## Conclusión

Los datos que se dan para verificar el Implementation (**dirección**, **nombre del contrato**, **parámetros de compilación**) coinciden con:

1. Lo que devuelve la API de Tronscan para ese contrato en mainnet.
2. La configuración de compilación del proyecto (tronbox.js).

Si la verificación falla en Tronscan, suele ser porque Tronscan no ofrece el compilador **0.8.34** y el bytecode generado con 0.8.30 no coincide con el desplegado.
