# Verificar Implementation y ProxyAdmin

El **Proxy (token)** ya está verificado. Faltan **ProxyAdmin** e **Implementation**.

**Orden:** verificar primero **ProxyAdmin** (mismo flujo que el Proxy); luego volvemos al Implementation.

---

## Estado (API Tronscan)

| Contrato       | Dirección | verify_status | Acción        |
|----------------|-----------|---------------|---------------|
| Token (Proxy)  | TV4P3sVfSQULNnsCPyzLnofCbK6cwkHeDm | 2 ✅ | Hecho         |
| **ProxyAdmin** | TVeVPZGiMc9GWQ8sQHvUwhfg19EDZt3UjZ | 0 | **Verificar primero** |
| **Implementation** | TYqRvxioNWBqVa2nJGog8RkYQrXQdPJwR3 | 0 | Verificar después |

**URL:** https://tronscan.org/#/contracts/verify (Mainnet)

**Parámetros:** Optimization **Yes**, Runs **200**, EVM **por defecto** (no Cancun), License **None**.  
**Compiler:** Si Tronscan ofrece **0.8.34**, usarlo (ProxyAdmin e Implementation se desplegaron con 0.8.34). Si no, probar 0.8.30; puede fallar por bytecode distinto.

---

## 1. ProxyAdmin (verificar este primero)

| Campo | Valor |
|-------|--------|
| **Contract Address** | `TVeVPZGiMc9GWQ8sQHvUwhfg19EDZt3UjZ` |
| **Main Contract** | `ProxyAdmin` |

**Archivo a subir:** `verification/ProxyAdmin.sol`  
(Si no existe: `npm run prepare:verification`)

**Pasos:** Tronscan → Contract Address → Main Contract → **Compiler 0.8.34 si está en el desplegable** (si no, 0.8.30) → Optimization Yes, Runs 200 → Subir `ProxyAdmin.sol` → Verify and Publish.

**Si falla "Please confirm the correct parameters":** El contrato se desplegó con **0.8.34** (tronbox.js). Tronscan suele ofrecer solo hasta 0.8.30, por eso el bytecode no coincide. Revisa si en el desplegable aparece **0.8.34** y prueba con esa versión.

---

## 2. Implementation (TRC20TokenUpgradeable) — cuando volvamos

| Campo | Valor |
|-------|--------|
| **Contract Address** | `TYqRvxioNWBqVa2nJGog8RkYQrXQdPJwR3` |
| **Main Contract** | `TRC20TokenUpgradeable` |

**Archivo a subir:** `verification/TRC20TokenUpgradeable.sol` (un solo archivo; ya incluye Initializable).  
Nota: puede fallar por bytecode hasta que Tronscan ofrezca compilador 0.8.34 (ver docs/VERIFICACION_IMPLEMENTATION_0.8.34.md).

---

## Resumen

1. **Ahora:** Verificar **ProxyAdmin** (TVeVPZGi...) con `verification/ProxyAdmin.sol`.
2. **Después:** Volver al **Implementation** (TYqRvxio...) con `verification/TRC20TokenUpgradeable.sol`.

Mismos pasos que con el Proxy: dirección, Main Contract, Compiler 0.8.30, Optimization Yes, Runs 200, subir archivo, Verify and Publish.
