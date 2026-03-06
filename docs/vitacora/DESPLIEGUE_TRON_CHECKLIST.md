# Checklist final — Despliegue del contrato TRC20 en TRON

**Resumen en una página:** [VITACORA.md](VITACORA.md).

**Objetivo:** Que el token se vea **igual que USDT en Tronscan** ([referencia](https://tronscan.org/#/token20/TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t)) al despliegue y en billeteras. Guía detallada: [docs/PERFIL_IGUAL_QUE_USDT.md](docs/PERFIL_IGUAL_QUE_USDT.md).

## ✅ Ya listo en el proyecto

| Elemento | Estado |
| -------- | ------ |
| Contratos Solidity (TRC20TokenUpgradeable, Proxy, ProxyAdmin, Initializable, Migrations) | ✅ |
| Compilación (`npm run compile`) → `build/contracts/*.json` | ✅ |
| Script de despliegue `scripts/deploy-upgradeable.js` (solo mainnet) | ✅ |
| Configuración de red en `tronbox.js` (solo mainnet) | ✅ |
| Plantilla de variables: `ENV_TEMPLATE.txt` | ✅ |
| Documentación: README.md, POST-DEPLOY.md, docs/VERIFICATION.md | ✅ |
| Logo listo: `assets/colateral-logo.webp` | ✅ |
| Datos para pegar en Tronscan: `docs/TRONSCAN_DATOS_PEGAR.md` | ✅ |
| Script post-despliegue: `npm run post-deploy:perfil` | ✅ |
| Metadatos plantilla: `token-metadata.json.example` (estilo USDT) | ✅ |

---

## ❌ Lo que falta (obligatorio para desplegar)

### 1. Archivo `.env` con clave privada

- **Acción:** Crear `.env` en la raíz de `blockchain/trc20-token` a partir de la plantilla.

  ```powershell
  cd e:\workspace-unificado\blockchain\trc20-token
  Copy-Item ENV_TEMPLATE.txt .env
  ```

- **Editar `.env`** y rellenar al menos:

  - **`PRIVATE_KEY=`** → tu clave privada de la wallet que desplegará el contrato.
  - Formato: **64 caracteres hexadecimales, sin prefijo `0x`**.
  - Ejemplo: `PRIVATE_KEY=a1b2c3d4e5f6...` (64 hex).

- **Opcional** (recomendado para mainnet / alto uso):
  - `TRON_PRO_API_KEY=` → API key de [TronGrid](https://www.trongrid.io/) para menos límites de tasa.
  - `TOKEN_NAME=`, `TOKEN_SYMBOL=`, `TOKEN_DECIMALS=`, `TOKEN_SUPPLY=` → **por defecto** en `ENV_TEMPLATE.txt` ya vienen tipo USDT: Colateral USD, USDT, 6, 1000000 (para que se vea igual que la [referencia en Tronscan](https://tronscan.org/#/token20/TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t)).

- **Seguridad:** `.env` está en `.gitignore`. No subas este archivo a Git.

### 2. TRX en la wallet del desplegador

- La dirección que desplega es la derivada de `PRIVATE_KEY`.
- Esa dirección debe tener **TRX en mainnet** para pagar energía/fees. El script exige **mínimo 80 TRX** para continuar; recomiendo 400–500 TRX (estimar con `npm run estimate:deploy`).

**Orden seguro (no gastar TRX en errores):**

1. `npm run deploy:dry-run` — valida que Implementation, ProxyAdmin y Proxy se construyen; **no envía nada**.
2. `npm run estimate:deploy` — comprueba saldo y energía en mainnet.
3. `npm run listo` — valida de nuevo, comprueba saldo, pide escribir **SÍ** y entonces envía las transacciones.

---

## Pasos para desplegar (orden)

1. **Crear y rellenar `.env`** (ver punto anterior).
2. **Comprobar que la wallet tiene TRX en mainnet** (estimar coste: `npm run estimate:deploy`).
3. **Compilar** (por si acaso):

   ```bash
   npm run compile
   ```

4. **Desplegar** (solo mainnet):

   ```bash
   npm run listo
   ```

5. Al terminar, el script imprime la **dirección del token (Proxy)** y escribe `deploy-info.json`. Esa dirección es la que usan usuarios y wallets.

---

## Logo y perfil para que se vea idéntico a USDT

- **Logo:** `assets/colateral-logo.webp`. Subirlo a tu web o GitHub y pegar la URL en Tronscan.
- **Textos listos:** En [docs/TRONSCAN_DATOS_PEGAR.md](docs/TRONSCAN_DATOS_PEGAR.md) tienes la descripción, la URL de ejemplo del logo (GitHub raw) y el checklist para pegar todo en Tronscan.
- **Tras el despliegue:** Ejecuta `npm run post-deploy:perfil` y te imprime la dirección del token, la URL de Tronscan y los textos para copiar/pegar. Con eso el token queda idéntico en presentación a [USDT en Tronscan](https://tronscan.org/#/token20/TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t).

## Después del despliegue

- Verificación en Tronscan: `npm run prepare:verification` y seguir [docs/VERIFICATION.md](docs/VERIFICATION.md).
- Checklist completo post-despliegue: [POST-DEPLOY.md](POST-DEPLOY.md).
- Perfil del token (logo, web): [docs/TRONSCAN_PERFIL_TOKEN.md](docs/TRONSCAN_PERFIL_TOKEN.md).

---

## Resumen: qué falta para el despliegue

| Requisito | Qué hacer |
| --------- | --------- |
| **`.env`** | Crear desde `ENV_TEMPLATE.txt` (o `npm run setup`) y poner **`PRIVATE_KEY`** y **`TRON_PRO_API_KEY`** (ambas obligatorias en mainnet). |
| **TRX en la wallet** | Asegurar que la cuenta que desplegará tenga TRX en mainnet (estimar: `npm run estimate:deploy`). |
| **Resto** | Código, compilación y scripts están listos; solo ejecutar `npm run listo`. |
