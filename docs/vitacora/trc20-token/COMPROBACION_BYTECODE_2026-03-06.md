# Comprobación de bytecode — Implementation TYqRvxioNWBqVa2nJGog8RkYQrXQdPJwR3

**Fecha:** 2026-03-06

## Objetivo

Determinar qué parámetros de compilación (compilador, EVM version) coinciden con el bytecode desplegado en mainnet, para poder verificar correctamente la Implementation en OKLink o Tronscan.

## Método

- Script `scripts/check-bytecode-match.js`:
  1. Obtiene el bytecode en cadena vía API Trongrid (`/wallet/getcontractinfo` → `runtimecode`).
  2. Compila localmente con solc:
     - 0.8.25 + Shanghai
     - 0.8.34 + Shanghai
     - 0.8.34 + EVM default
  3. Usa `deployedBytecode` (bytecode runtime, no el de creación).
  4. Quita metadata CBOR antes de comparar.

## Resultado

| Configuración       | Longitud (sin metadata) | Coincidencia exacta |
|--------------------|--------------------------|---------------------|
| 0.8.25 + Shanghai  | 24518                    | No                  |
| 0.8.34 + Shanghai  | 24556                    | No                  |
| **0.8.34 + default** | **24484**              | **Sí**              |

**Conclusión:** El bytecode en mainnet coincide con la compilación usando:

- **Compiler:** 0.8.34
- **EVM version:** default (no Shanghai)
- **Optimization:** Yes, Runs 200
- **Archivo:** `verification/TRC20TokenUpgradeable-oklink.sol`

## Acción recomendada

Para verificar en **OKLink**:

1. Dirección: `TYqRvxioNWBqVa2nJGog8RkYQrXQdPJwR3`
2. Compiler: **0.8.34**
3. **Optimization:** Yes
4. **Runs:** 200
5. **License:** MIT License (MIT)
6. **EVM version: default** (no Shanghai)
7. Subir: `verification/TRC20TokenUpgradeable-oklink.sol`
8. Main Contract: `TRC20TokenUpgradeable`

## Nota

- Tronscan solo ofrece hasta 0.8.25; con 0.8.25 el bytecode no coincide.
- El script confirmó que el contrato fue desplegado con 0.8.34 + EVM default, no con Shanghai (a pesar de que tronbox.js pueda tener Shanghai configurado; el upgrade podría haberse hecho con otro flujo).
