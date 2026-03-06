# Verificación en Tronscan – pasos exactos (mainnet)

Guía con **direcciones y parámetros** listos para copiar/pegar al verificar los contratos en Tronscan.

**URL:** https://tronscan.org/#/contracts/verify  
Asegúrate de tener **Mainnet** seleccionado (esquina superior derecha).

---

## Parámetros de compilación (igual para los 3)

Usar **exactamente** estos valores en cada verificación:

| Campo | Valor |
|-------|--------|
| **Compiler** | **0.8.30** (Tronscan no tiene 0.8.34; ejecuta `npm run prepare:verification` para generar .sol con pragma ^0.8.25) |
| **Optimization** | Yes / Enabled |
| **Runs** | 200 |
| **VM version** | Paris ≈ 0.8.18, Shanghai ≈ 0.8.20, **Cancun ≈ 0.8.25**. Con compilador 0.8.30 probar **Shanghai** o **Cancun**. No usar "30" (Ethereum). |
| **License** | MIT si está; si no, **None** |

---

## 1. Verificar Token (Proxy) – prioridad alta

Es la **dirección pública del token** (la que usan usuarios y wallets).

| Campo | Valor |
|-------|--------|
| **Contract Address** | `TV4P3sVfSQULNnsCPyzLnofCbK6cwkHeDm` |
| **Contract Name** | `TransparentUpgradeableProxy` |

**Archivo a subir:** `verification/TransparentUpgradeableProxy.sol` (generado con `npm run prepare:verification`).

Pasos:
1. Pegar la dirección en "Contract Address".
2. Contract Name: `TransparentUpgradeableProxy`.
3. Compiler **0.8.30**, Optimization Yes, Runs 200, VM version Shanghai o Cancun, License MIT o **None**.
4. Subir el archivo `TransparentUpgradeableProxy.sol` desde la carpeta `verification/`.
5. Completar CAPTCHA y "Verify and Publish".

---

## 2. Verificar Implementation (TRC20TokenUpgradeable)

| Campo | Valor |
|-------|--------|
| **Contract Address** | `TYqRvxioNWBqVa2nJGog8RkYQrXQdPJwR3` |
| **Contract Name** | `TRC20TokenUpgradeable` |

**Archivo a subir:**  
- **Solo** `verification/TRC20TokenUpgradeable.sol` (código aplanado; nombre = Main Contract).

Pasos:
1. Pegar la dirección en "Contract Address".
2. Contract Name: `TRC20TokenUpgradeable`.
3. Mismos parámetros (0.8.30, Yes, 200, Shanghai/Cancun). License: MIT o **None**.
4. Subir **TRC20TokenUpgradeable.sol** desde la carpeta verification/.
5. Verify and Publish.

---

## 3. Verificar ProxyAdmin

| Campo | Valor |
|-------|--------|
| **Contract Address** | `TVeVPZGiMc9GWQ8sQHvUwhfg19EDZt3UjZ` |
| **Contract Name** | `ProxyAdmin` |

**Archivo a subir:** `verification/ProxyAdmin.sol`.

Pasos:
1. Pegar la dirección.
2. Contract Name: `ProxyAdmin`.
3. Mismos parámetros. License: MIT o **None**.
4. Subir `ProxyAdmin.sol`.
5. Verify and Publish.

---

## Antes de verificar: generar archivos

En la raíz del proyecto:

```bash
npm run prepare:verification
```

Esto crea/actualiza la carpeta `verification/` con los .sol y `verification-params.json`. Si no tienes `verification/` es porque está en `.gitignore`; se genera solo en tu máquina.

---

## Errores frecuentes

- **"Contract has not been deployed"** → Comprueba que estás en **Mainnet** y que la dirección es correcta (sin espacios al copiar).
- **"Please confirm the correct parameters"** → Compiler 0.8.30, Optimization **Enabled**, Runs **200**, VM Shanghai o Cancun.
- **Dependencias / subdirectorios** → Ver [docs/VERIFICATION.md](VERIFICATION.md) (flatten y License-Identifier).

---

## Resumen de direcciones (mainnet)

| Contrato | Dirección |
|----------|-----------|
| **Token (Proxy)** | TV4P3sVfSQULNnsCPyzLnofCbK6cwkHeDm |
| **Implementation** | TYqRvxioNWBqVa2nJGog8RkYQrXQdPJwR3 |
| **ProxyAdmin** | TVeVPZGiMc9GWQ8sQHvUwhfg19EDZt3UjZ |

Referencia general: [VERIFICATION.md](../VERIFICATION.md), [docs/VERIFICATION.md](VERIFICATION.md).
