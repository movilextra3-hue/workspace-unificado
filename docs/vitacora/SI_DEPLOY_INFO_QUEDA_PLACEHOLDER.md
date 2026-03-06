# Si deploy-info.json queda con direcciones placeholder (TXXX...)

El script **migrate-3-safe** ahora comprueba al final que `deploy-info.json` tenga direcciones reales. Si sigue con placeholders, el script **falla con un mensaje claro** (no se da por bueno el despliegue).

## Qué se ha corregido en el script

1. **Variable de entorno en Windows:** Se deja de usar `cross-env`; `MIGRATE_3_VERIFIED=1` se pasa en el `env` de `execSync` para que TronBox la reciba bien en cualquier OS.
2. **Comprobación tras migrate:** Después de `tronbox migrate -f 3`, se lee `deploy-info.json`. Si no existe o las direcciones son placeholder (TXXX...), el script sale con código 1 y muestra un AVISO. Solo si hay direcciones reales se considera el despliegue correcto.

## Qué hacer si ves el AVISO (placeholders)

1. **Revisar en Tronscan** (https://tronscan.org) la dirección de tu wallet: ¿aparecen contratos recién desplegados (Implementation, Proxy)? Si sí, la dirección del **token** es la del Proxy; puedes copiarla y rellenar a mano `deploy-info.json` con `tokenAddress`, `implementationAddress` y `proxyAdminAddress` (esta última es la de tu .env).
2. **Ejecutar de nuevo** `npm run migrate-3-safe` cuando tengas margen de TRX. Asegúrate de que en la salida de `tronbox migrate` aparezcan líneas como "Token (Proxy): T...", "Implementation: T...", "deploy-info.json generado". Si no aparecen, TronBox puede estar saltándose la migración 3 (p. ej. si el contrato Migrations no existe en mainnet).
3. **Primera vez en mainnet:** Si nunca has ejecutado ninguna migración en mainnet, puede que falte el contrato Migrations (migración 1). En ese caso, una opción es ejecutar una vez `tronbox migrate --network mainnet` (sin `-f 3`) para que se ejecuten las migraciones 1, 2 y 3; eso despliega todo (Impl + ProxyAdmin + Proxy). Si solo quieres reutilizar ProxyAdmin, el flujo recomendado es usar `npm run migrate-3-safe` cuando ya tengas ProxyAdmin en mainnet (por un despliegue anterior o compartida).

## Resumen

- No se da por válido un despliegue si `deploy-info.json` sigue con placeholders.
- El script falla con un mensaje explícito para que no quede duda.
- Si ocurre, revisa Tronscan y/o vuelve a ejecutar migrate-3-safe cuando corresponda.
