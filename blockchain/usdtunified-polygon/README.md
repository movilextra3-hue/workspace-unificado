# USDTUnified Polygon — Correcciones y automatización

Scripts para dejar el token USDTUnified 100% funcional en Polygon.

**Documentación completa:** `docs/vitacora/CONSOLIDACION_COMPLETA_TODO.md` (sección USDTUnified)

## Configuración

1. Copiar `env.example` a `.env`
2. Añadir `PRIVATE_KEY` (clave del owner)
3. Opcional: `POLYGON_RPC` (default: https://polygon-rpc.com)

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run setup` | Ejecuta fix-target, setPancakeParams y refreshMetadata en secuencia |
| `npm run fix:target` | Corrige target a USDT oficial Polygon |
| `npm run fix:dex` | Configura QuickSwap Factory, WMATIC, USDC |
| `npm run fix:metadata` | Actualiza caché de metadatos |
| `npm run approve:router` | Aprueba token al Router QuickSwap para liquidez |
| `npm run verify` | Verifica configuración (solo lectura, no requiere clave) |

## Orden de ejecución recomendado

1. `npm install`
2. Configurar `.env`
3. `npm run setup`
4. `npm run approve:router`
5. Añadir liquidez en QuickSwap manualmente
6. `npm run verify` (comprobar)

## Web

La carpeta `web/` contiene una página estática. Publicar en Vercel, Netlify o similar.
