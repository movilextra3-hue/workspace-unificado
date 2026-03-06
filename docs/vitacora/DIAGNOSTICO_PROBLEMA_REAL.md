# Diagnóstico: problema real del despliegue (migrate-3-safe)

## Fuentes revisadas

- **Terminales de Cursor** (`terminals/*.txt`): salida de `desplegar-completar-token.js` (PID 39156).
- **Flujo**: compile → verify (OK) → **ninguna salida de tronbox migrate** → script termina con exit 1 (deploy-info con placeholders).

## Hallazgo principal

**TronBox no vuelve a ejecutar una migración que ya considera "completada".**  
El estado se guarda **en la blockchain** mediante el contrato `Migrations` (migración 1). Cuando ejecutas `tronbox migrate -f 3 --network mainnet`:

1. TronBox consulta el contrato Migrations en mainnet.
2. Si el último número de migración completada es **≥ 3**, **no vuelve a ejecutar la 3** y sale con código 0.
3. No se despliega nada, no se escribe `deploy-info.json`.
4. El `deploy-info.json` que ves es el que ya estaba (placeholders o de un run anterior).

Por eso:

- La **verificación previa** pasa (balance, API, claves).
- **No aparece** en terminal ningún log de tronbox (ni "Token (Proxy): ..." ni errores).
- El script falla al comprobar que `deploy-info.json` tenga direcciones reales.

Es decir: **el problema no son las claves ni la red**, sino que **la migración 3 ya está marcada como ejecutada** en mainnet y TronBox la omite.

## Comunicación entre componentes

| Componente | Estado |
|-----------|--------|
| **.env → tronbox.js** | Correcto (check:tronbox-config OK; carga por `path.join(__dirname, '.env')`). |
| **.env → verify-before-migrate-3** | Correcto (path explícito; balance y API responden). |
| **execSync → npx tronbox** | En Windows el `env` se pasa al proceso; si npx no lo reenvía al hijo, tronbox carga .env desde disco en `tronbox.js`. |
| **Salida de tronbox** | Con `stdio: 'inherit'` debería verse en la misma terminal; en los logs de Cursor **no aparece** nada después de "Verificación OK", por lo que o bien la salida no se capturó o bien tronbox salió sin imprimir (por ejemplo al saltar la migración). |

## Opciones para solucionar

1. **Ver qué hace tronbox**  
   Ejecutar migrate capturando toda la salida en un archivo (el script puede escribir en `migrate-output.log`) para ver si aparece algo como "Already completed" o "Skipping migration 3".

2. **Forzar ejecución desde cero**  
   `tronbox migrate --reset --network mainnet` vuelve a ejecutar **todas** las migraciones (1, 2 y 3). La 2 desplegaría de nuevo ProxyAdmin (más coste y posible conflicto si ya existe). Solo tiene sentido si quieres redeploy completo.

3. **No depender del estado de TronBox**  
   Usar un script que haga exactamente lo que hace la migración 3 (desplegar Implementation + Proxy reutilizando ProxyAdmin) con TronWeb, sin usar `tronbox migrate`, para que el resultado no dependa del contrato Migrations.

## Log de salida de tronbox

A partir de ahora, `desplegar-completar-token.js` escribe **toda** la salida de `tronbox migrate` en:

- **Consola** (stdout)
- **Archivo** `migrate-output.log` en la raíz del proyecto (no se sube a Git; está en .gitignore)

Así puedes ver si TronBox escribe algo como "Already completed", "Skipping", o el mensaje de error real.

## Siguientes pasos recomendados

1. Ejecutar de nuevo `npm run migrate-3-safe` y revisar en consola y en `migrate-output.log` qué imprime tronbox.
2. Si confirma que la migración 3 se salta por estar ya completada, valorar: script equivalente a la migración 3 (sin TronBox migrate) o `migrate --reset` con precaución.
