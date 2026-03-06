# Aviso al agente que trabajó antes en este repo

**Para quien venga después:** Revisión posterior encontró varios errores en tu trabajo. Léelo para no repetir las mismas cagadas y tener más cuidado.

---

## 1. Compilación equivocada (la más gorda)

**Lo que hiciste:** En el flujo `migrate-3-safe` y en los mensajes de varios scripts pusiste o usaste **`npm run compile`**, que ejecuta `compile-with-solc.js` y genera **bytecode EVM** (Ethereum).

**El problema:** En TRON se usa **TVM** (TRON Virtual Machine). Los artefactos en `build/contracts/` tienen que ser los que genera **TronBox** (`tronbox compile`), no solc. Si alguien sigue tus instrucciones y solo ejecuta `npm run compile`:

- La verificación previa a migrate-3 usa tamaños de bytecode **EVM** para estimar energía → la estimación está **mal**.
- Si luego hace deploy/upgrade con esos artefactos en mainnet, el bytecode es **EVM** y no sirve para TRON.

**Qué tenías que hacer:** Para **cualquier** cosa que se despliegue o verifique en mainnet (migrate, deploy-upgradeable, upgrade, estimate-deploy-cost), el comando correcto es **`npm run compile:tronbox`** (o `tronbox compile`). Punto.

**Corregido en:**  
`desplegar-completar-token.js`, `verify-before-migrate-3.js`, `upgrade.js`, `deploy-upgradeable.js`, `estimate-deploy-cost.js`.

---

## 2. Validación dry-run del Proxy (deploy-upgradeable.js)

**Lo que hiciste:** En `validateBuild()` construías la transacción del Proxy con:

```js
parameters: [ownerAddr, ownerAddr, '0x']
```

Es decir, pasabas la **misma dirección EOA** (cuenta del usuario) como implementación y como admin del proxy.

**El problema:** El constructor de `TransparentUpgradeableProxy` exige que tanto `_logic` como `admin_` sean **contratos** (comprueba `code.length > 0`). Una EOA no tiene código. Si esa transacción se llegara a **enviar**, el constructor revierte. En dry-run “pasaba” solo porque no se enviaba la tx, pero la validación era **mentira**: no estabas validando parámetros reales del Proxy, solo que TronWeb construyera algo. Un flujo que confíe en eso puede acabar enviando una tx que falle en mainnet.

**Qué tenías que hacer:** Usar direcciones de **contratos** como placeholder para los dos primeros argumentos (por ejemplo una ProxyAdmin conocida en mainnet o una constante), para que el encoding y la lógica del constructor tengan sentido.

**Corregido en:**  
`scripts/deploy-upgradeable.js` — ahora se usa `PROXY_ADMIN_ADDRESS` o la constante `TVeVPZGiMc9GWQ8sQHvUwhfg19EDZt3UjZ` como placeholder.

---

## 3. Migraciones sin validar variables de entorno

**Lo que hiciste:** En las migraciones 2 y 3 leías `TOKEN_DECIMALS` y `TOKEN_SUPPLY` del `.env` y los pasabas al contrato sin comprobar que fueran válidos.

**El problema:** Si alguien pone `TOKEN_DECIMALS=999` o `TOKEN_SUPPLY=abc`, la migración puede fallar a mitad (después de haber desplegado algo) o el contrato puede inicializarse con datos basura. Eso gasta TRX y deja el estado en la red hecho un lío.

**Qué tenías que hacer:** Validar **antes** de desplegar nada:  
- `TOKEN_DECIMALS`: número entre 0 y 255.  
- `TOKEN_SUPPLY`: string que sea un entero positivo (solo dígitos).  
Si no cumple, `throw new Error(...)` con mensaje claro y salir, sin tocar la red.

**Corregido en:**  
`migrations/2_deploy_trc20.js` y `migrations/3_deploy_impl_and_proxy_reuse_admin.js` — añadidas `parseEnvDecimals()` y `parseEnvSupply()` con esas validaciones.

---

## 4. Detalles menores

- **deploy-info.json** en `deploy-upgradeable.js` no tenía `deployedVia`. Se añadió para trazabilidad.
- **ENV_TEMPLATE:** `TOKEN_SYMBOL=USDT` sin aclarar que es solo ejemplo puede hacer que alguien piense que está desplegando el USDT oficial. Se añadió un comentario aclarando que es ejemplo.

---

## Resumen para ti (y para quien venga después)

1. **TRON ≠ Ethereum.** Aquí el bytecode que se despliega y con el que se estima energía tiene que ser **TVM**. Eso implica **TronBox** (`compile:tronbox`), no solo `npm run compile` (solc/EVM).
2. **Dry-run / validaciones:** Si “validas” una tx, los parámetros tienen que ser coherentes con lo que exige el contrato. No valides con EOA donde el contrato pide direcciones de contrato.
3. **Variables de entorno:** Valida **antes** de gastar TRX. Decimals en rango, supply numérico positivo, etc. Si algo está mal, falla rápido y con mensaje claro.
4. **Revisa la doc del proyecto** (README, docs de despliegue, TRON) antes de tocar flujos de deploy o migrate. Evita asumir que todo es como en Ethereum.

Con esto se corrigieron tus errores. La próxima vez, revisa mejor antes de dejar el trabajo: el que venga después no debería tener que arreglar estas cosas.
