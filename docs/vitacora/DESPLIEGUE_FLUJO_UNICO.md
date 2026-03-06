# Flujo único para completar el token (recomendado)

Una sola forma de desplegar **Implementation + Proxy** reutilizando ProxyAdmin: **sin TronBox migrate**, sin estado de migraciones, con todas las comprobaciones en orden.

## Requisitos

- Node.js >= 18
- `.env` con: **PRIVATE_KEY**, **TRON_PRO_API_KEY**, **PROXY_ADMIN_ADDRESS** (y opcionalmente TOKEN_NAME, TOKEN_SYMBOL, TOKEN_DECIMALS, TOKEN_SUPPLY)

## Pasos (solo dos comandos)

### 1. Comprobar sin gastar TRX

```bash
npm run deploy:complete:dry
```

Comprueba:

- Variables de .env válidas
- Compilación (si faltan artefactos, compila con TronBox)
- PROXY_ADMIN_ADDRESS es un contrato en mainnet
- Balance (mín. 200 TRX) y coste estimado

Si algo falla, el script indica qué corregir. **No envía ninguna transacción.**

### 2. Desplegar

```bash
npm run deploy:complete
```

En orden:

1. Valida .env
2. Compila con TronBox si falta `build/contracts/`
3. Verifica ProxyAdmin en mainnet
4. Muestra balance, energía y coste estimado
5. Pide escribir **SÍ** y Enter (o usa `AUTO_CONFIRM=1` para omitir)
6. Despliega Implementation (450 TRX feeLimit)
7. Despliega Proxy (impl, admin, 0x)
8. Inicializa el token
9. Escribe `deploy-info.json` e imprime los siguientes pasos

## Ventajas de este flujo

| Aspecto | Detalle |
|--------|---------|
| **Un solo script** | Todo en `scripts/deploy-complete-token.js`; no depende de varios comandos ni del estado de TronBox. |
| **Sin Migrations** | No usa el contrato Migrations; no hay "migración ya ejecutada". |
| **Comprobaciones previas** | Falla antes de gastar TRX si falta algo (claves, saldo, ProxyAdmin inválido). |
| **Confirmación** | Pide SÍ antes de enviar tx (evita despliegues por error). |
| **Salida clara** | Mensajes en consola y siguientes pasos al terminar. |

## Tras el despliegue

- Verificación en Tronscan: `npm run prepare:verification`
- Perfil del token (logo, web): `npm run post-deploy:perfil`

## Automatización (opcional)

Para entornos sin interacción (CI, scripts):

```bash
npm run deploy:complete -- --yes
# o
AUTO_CONFIRM=1 npm run deploy:complete
```

No pide SÍ; despliega directamente si todas las comprobaciones pasan.

## Si initialize() falla

Si Implementation y Proxy se despliegan pero la llamada a `initialize()` falla (p. ej. "No contract or not a valid smart contract"), ver **docs/COMPLETAR_INITIALIZE_SI_FALLO.md**: puedes llamar initialize desde Tronscan o ejecutar `node scripts/initialize-proxy-once.js <proxyAddress>` más tarde.
