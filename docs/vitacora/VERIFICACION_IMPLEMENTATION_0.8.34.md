# Verificación del Implementation (TYqRvxio...)

## Si Tronscan dice: "verification failed. Please confirm the correct parameters"

**Causa:** El contrato se desplegó con **Solidity 0.8.34** (tronbox.js). Tronscan ofrece 0.8.25 / 0.8.30. Al compilar con esas versiones el bytecode es distinto al que está en mainnet, por eso falla. No es un error en los parámetros que eliges (Optimization, Runs, etc.); es el **límite del compilador** en Tronscan.

**Conclusión:** No es posible verificar este Implementation en Tronscan hasta que añadan 0.8.34. Los parámetros (Compiler 0.8.30 o 0.8.25, Yes, 200, EVM por defecto) son los correctos para intentar; el fallo es esperado.

**Lo mismo aplica al ProxyAdmin** (TVeVPZGi...): también se desplegó con 0.8.34. Si la verificación del ProxyAdmin falla con "Please confirm the correct parameters", es por la misma razón; probar Compiler 0.8.34 si Tronscan lo ofrece.

## Si Tronscan dice: "Invalid EVM version requested"

**Solución:** No elijas **Cancun** en EVM/VM version. Deja el valor **por defecto** (o prueba Shanghai si lo ofrece). Vuelve a generar el archivo con `npm run prepare:verification` y en la página de verificación deja EVM en default.

## Si Tronscan dice: "Source file requires different compiler version (current compiler is 0.8.25...)"

**Solución:** El .sol generado usa ya `pragma ^0.8.20`, así que Tronscan acepta 0.8.25 y 0.8.30. Ejecuta `npm run prepare:verification` y sube de nuevo `verification/TRC20TokenUpgradeable.sol`.

---

## Comprobar qué usaste en el Proxy

Si el **Proxy** se pudo verificar, usa **exactamente los mismos parámetros** para el Implementation (mismo compilador, Optimization, Runs, VM version). En la página del contrato Proxy en Tronscan suele aparecer la "Compiler version" con la que se verificó; usa esa misma.

- Desplegamos todo con **0.8.34** (tronbox.js). Si al verificar el Proxy elegiste **0.8.34** en el desplegable de Tronscan, elige **0.8.34** también para el Implementation (puede estar más abajo en la lista).
- Si elegiste **0.8.30** para el Proxy y aun así pasó, el Implementation es más grande y a veces 0.8.30 no genera el mismo bytecode que 0.8.34; en ese caso la única opción es que Tronscan ofrezca 0.8.34.

## Opciones

### 1. Esperar a que Tronscan ofrezca 0.8.34 (recomendado)

Cuando Tronscan añada el compilador 0.8.34, volver a intentar con:

- Compiler: **0.8.34**
- Optimization: Yes, Runs: 200
- Archivo: `verification/TRC20TokenUpgradeable.sol` (nombre = Main Contract; tras `npm run prepare:verification`)

Se puede pedir en soporte Tronscan que añadan 0.8.34.

### 2. No verificar el Implementation por ahora

El **Proxy (token)** ya está verificado. El Implementation es la lógica; no verificado sigue funcionando, pero el código no se muestra en Tronscan hasta que pase la verificación.

### 3. Redesplegar con 0.8.30 (costoso)

Cambiar `tronbox.js` a `version: '0.8.30'`, desplegar una **nueva** Implementation, actualizar el proxy con `upgradeTo(nuevaImpl)` y luego verificar en Tronscan con 0.8.30. Implica gastar TRX y tocar el proxy; solo tiene sentido si es crítico verificar ya.

---

## Otras maneras de verificar

### A. OKLink (explorer alternativo)

**OKLink** tiene verificación de contratos TRON y puede ofrecer **otras versiones de compilador** (incluida 0.8.34).

- **URL:** https://www.oklink.com/tron/verify-contract-preliminary  
- **Archivo listo:** Ejecuta `npm run prepare:verification` y en `verification/` se genera **`TRC20TokenUpgradeable-oklink.sol`** (pragma ^0.8.34). Instrucciones en `verification/LEEME-OKLINK.txt`.  
- **Pasos:** Dirección `TYqRvxioNWBqVa2nJGog8RkYQrXQdPJwR3`, Compiler **0.8.34**, **Optimization Yes**, Runs 200, **License: MIT License (MIT)**, **EVM version: default** (no Shanghai), subir `verification/TRC20TokenUpgradeable-oklink.sol`, Main Contract `TRC20TokenUpgradeable`.  
- **Comprobado 2026-03-06:** `check-bytecode-match.js` confirma que el bytecode en mainnet coincide con 0.8.34 + EVM default. Ver `docs/vitacora/trc20-token/COMPROBACION_BYTECODE_2026-03-06.md`.

### B. Verificación por API (OKLink)

OKLink ofrece **API de verificación** con parámetros como `compilerVersion` y `optimizationRuns`. Si su backend admite 0.8.34, se podría verificar por API.

- Documentación: https://www.oklink.com/docs/en (sección Contract Verification).  
- Requiere cuenta/API key en OKLink.

### C. Código público en GitHub (transparencia sin “verified”)

Aunque el explorer no muestre el check de verificado, puedes dejar el **código fuente público** en el repositorio del proyecto (por ejemplo `contracts/TRC20TokenUpgradeable.sol` y `contracts/Initializable.sol`) y en la documentación o en la web del token indicar: “Código fuente: [enlace al repo]”. Así cualquiera puede comparar el código con el comportamiento del contrato. El **Proxy (token)** sigue verificado en Tronscan; la lógica del Implementation queda documentada en GitHub.

### D. Sourcify

**Sourcify** (sourcify.dev) es multi‑cadena pero está orientado sobre todo a Ethereum. TRON no está soportado como en Tronscan/OKLink, así que no es una opción práctica para este contrato.

---

**Resumen:** La verificación falla en Tronscan por límite de compilador (0.8.30). Prueba **OKLink** por si ofrecen 0.8.34; si no, publicar el código en GitHub da transparencia hasta que Tronscan u otro explorer soporte 0.8.34.
