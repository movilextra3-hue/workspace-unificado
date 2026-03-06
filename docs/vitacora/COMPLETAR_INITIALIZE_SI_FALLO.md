# Completar initialize si el despliegue falló en ese paso

Si **Implementation** y **Proxy** se desplegaron pero la llamada a **initialize()** falló con "No contract or not a valid smart contract", el contrato Proxy puede tardar un poco en estar activo en la red. Puedes completar de dos formas:

## 1. Reintentar con el script (cuando el Proxy ya esté activo)

```bash
node scripts/initialize-proxy-once.js TDUPqTHo1mCTMUxajReCrmEF9eS86ymNVh
```

Sustituye la dirección por la de tu Proxy si es distinta (está en `deploy-info.json` como `tokenAddress`).

## 2. Llamar initialize desde Tronscan

1. Abre: https://tronscan.org/#/contract/TDUPqTHo1mCTMUxajReCrmEF9eS86ymNVh (o tu dirección Proxy).
2. Pestaña **Contract** → **Write Contract**.
3. Conecta la wallet que es owner (la que tiene la PRIVATE_KEY del .env).
4. Busca la función **initialize**.
5. Parámetros (según tu .env): name, symbol, decimals, initialSupply, owner (tu dirección base58).
6. Ejecuta la transacción (feeLimit recomendado 50–100 TRX).

Tras ejecutar initialize, el token quedará operativo y podrás usar `npm run post-deploy:perfil` para el perfil en Tronscan.
