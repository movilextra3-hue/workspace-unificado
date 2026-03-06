# Verificación automatizada del Implementation

## Comando único

```bash
npm run verify:implementation
```

Este comando:

1. **Genera** el paquete en `verification/` (Tronscan y OKLink) si no existe.
2. **Comprueba** en Tronscan si el contrato `TYqRvxioNWBqVa2nJGog8RkYQrXQdPJwR3` ya está verificado (`verify_status`).
3. **Intenta** verificar por API de OKLink (si la API soportara TRX).
4. Si la API de OKLink **no soporta TRX** (caso actual), **genera** `verification/reporte-verificacion-implementation.txt` con:
   - Estado en Tronscan (verificado o no).
   - Enlaces a Tronscan y OKLink para verificación manual.
   - Pasos y archivos a subir.

## Resultado esperado hoy

- **Tronscan:** `verify_status=0` → no verificado (el bytecode es 0.8.34 y Tronscan solo tiene 0.8.30).
- **OKLink API:** responde que la cadena TRX no está soportada para verificación por API.
- **Informe:** se escribe `verification/reporte-verificacion-implementation.txt` con pasos manuales.

Si en el futuro Tronscan añade 0.8.34 o OKLink habilita TRX en la API, el mismo comando podrá completar la verificación automáticamente o indicar "ya verificado".

## Scripts relacionados

| Comando | Descripción |
|--------|-------------|
| `npm run prepare:verification` | Solo genera `verification/` (Tronscan + OKLink). |
| `npm run verify:oklink` | Comprueba Tronscan, intenta OKLink API, escribe informe. |
| `npm run verify:implementation` | `prepare:verification` + `verify:oklink`. |

## Variables de entorno

- **OKLINK_API_KEY** (opcional): API key de OKLink. Si la API llegara a soportar TRX, podría ser necesaria.
- **VERIFY_COMPILER_VERSION** (opcional): Versión de compilador para OKLink, p. ej. `v0.8.34+commit.80d5c53`.
