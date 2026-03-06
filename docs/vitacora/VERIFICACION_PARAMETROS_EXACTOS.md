# Parámetros exactos para verificar en Tronscan

El contrato se desplegó con **tronbox.js**. Si algún valor no coincide, Tronscan responde: *"verification failed. Please confirm the correct parameters"*.

## Implementation (TYqRvxioNWBqVa2nJGog8RkYQrXQdPJwR3)

| Parámetro | Valor |
|----------|--------|
| Contract Address | `TYqRvxioNWBqVa2nJGog8RkYQrXQdPJwR3` |
| Main Contract | `TRC20TokenUpgradeable` |
| Archivo a subir | `verification/TRC20TokenUpgradeable.sol` (nombre = Main Contract) |
| **Solidity Compiler Version** | **0.8.34** si aparece; si no, 0.8.30. Si Tronscan muestra **tronbox_soljson_v1 / v2 / v3**, probar **v3** (suele ser el más reciente, compatible con 0.8.x). |
| Optimization | Yes |
| Runs | 200 |
| License | None (o MIT) |
| EVM/VM version | **Default** (no Shanghai, no Cancun). Comprobado con check-bytecode-match.js (2026-03-06): bytecode coincide con 0.8.34 + EVM default. |
| ViaIR | No |

## Dónde están

- **Lista rápida:** `verification/PARAMETROS-IMPLEMENTATION.txt`
- **JSON:** `verification/verification-params.json` (tras `npm run prepare:verification`)
- **LEEME:** `verification/LEEME-TRONSCAN.txt`

## Compilador en Tronscan: 0.8.x vs tronbox_soljson v1 / v2 / v3

En la página de verificación, el desplegable a veces muestra **números de Solidity** (0.8.25, 0.8.30, 0.8.34) y otras veces **tronbox_soljson_v1**, **tronbox_soljson_v2**, **tronbox_soljson_v3**.

- **v1, v2, v3** son etiquetas de Tronscan para distintas versiones del compilador TRON; **v3** suele ser la más reciente y la que suele soportar Solidity 0.8.x.
- Para este proyecto (desplegado con **0.8.34**): si solo ves v1/v2/v3, prueba primero **tronbox_soljson_v3**; si ves 0.8.34, elige esa.

## Nota Tronscan 0.8.34

Tronscan puede no ofrecer compilador 0.8.34. Si solo tiene hasta 0.8.30 (o solo v1/v2/v3), el bytecode puede no coincidir; ver `docs/VERIFICACION_IMPLEMENTATION_0.8.34.md`.
