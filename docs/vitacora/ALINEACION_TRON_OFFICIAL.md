# Alineación con documentación oficial TRON (verificación)

Verificación del proyecto frente a la documentación oficial de TRON y estado actual (actualizado marzo 2026).

---

## Referencias oficiales

| Recurso | URL |
|--------|-----|
| **TRC-20 Protocol Interface** (estándar oficial) | https://developers.tron.network/docs/trc20-protocol-interface |
| **Smart Contract Security** (proceso y vulnerabilidades) | https://developers.tron.network/docs/smart-contract-security |
| TIP-20 (TRON Improvement Proposal) | https://github.com/tronprotocol/tips/blob/master/tip-20.md |
| Conectar a la red | https://developers.tron.network/docs/connect-to-the-tron-network |
| TronGrid / API | https://developers.tron.network/reference |
| API Key TronGrid | https://developers.tron.network/reference/api-key |
| TronBox config | https://developers.tron.network/reference/tronbox-configuration |

---

## 1. Estándar TRC-20

TRC-20 es compatible con ERC-20. Requisitos oficiales:

- **Opcionales:** name, symbol, decimals.
- **Funciones obligatorias:** `totalSupply()`, `balanceOf()`, `transfer()`, `approve()`, `transferFrom()`, `allowance()`.
- **Eventos:** `Transfer`, `Approval`.

### Comprobación en este proyecto

| Requisito | Estado |
|-----------|--------|
| name | ✅ Variable pública en `TRC20TokenUpgradeable.sol` |
| symbol | ✅ Variable pública |
| decimals | ✅ Variable pública |
| totalSupply() | ✅ Getter por `uint256 public totalSupply` |
| balanceOf(address) | ✅ Implementada |
| transfer(to, amount) | ✅ Implementada (con pausa/freeze/blacklist) |
| approve(spender, amount) | ✅ Implementada |
| transferFrom(from, to, amount) | ✅ Implementada |
| allowance(owner, spender) | ✅ Implementada |
| event Transfer | ✅ |
| event Approval | ✅ |

**Conclusión:** El contrato cumple el estándar TRC-20 según la documentación oficial.

---

## 2. Endpoints de red (TronGrid)

Según [Connecting to the TRON Network](https://developers.tron.network/docs/connect-to-the-tron-network):

| Red | Endpoint oficial | En este proyecto |
|-----|------------------|------------------|
| Mainnet | `https://api.trongrid.io` | ✅ `tronbox.js` y `deploy-upgradeable.js` |
| Shasta | `https://api.shasta.trongrid.io` | ✅ |
| Nile | `https://nile.trongrid.io` | ✅ |
| Local | `http://127.0.0.1:9090` (u 8090) | ✅ development: 9090 |

No hay desalineación en URLs.

---

## 3. API Key TronGrid

- La documentación indica que **TronGrid requiere API Key** para una asignación razonable de recursos; sin ella las peticiones pueden estar **muy limitadas o bloqueadas**.
- **Mainnet:** recomendado/necesario usar API Key.
- **Shasta y Nile:** actualmente no exigen API Key.

En este proyecto:

- Los scripts que usan TronWeb (`deploy-upgradeable.js`, `upgrade.js`, `initialize-v2.js`) **sí soportan** `TRON_PRO_API_KEY` en `.env` y envían la cabecera `TRON-PRO-API-KEY`.
- **TronBox** (`tronbox migrate --network mainnet`) usa solo `fullHost` y `privateKey` en `tronbox.js`; no se configuran cabeceras en el fichero. Para mainnet se recomienda usar el script `npm run listo` (que sí usa la API key si está en `.env`).

---

## 4. Tronscan (perfil del token)

- Página para registrar/editar token TRC-20:
  - Mainnet: https://tronscan.org/#/tokens/create/TRC20
  - Nile: https://nile.tronscan.org/#/tokens/create/TRC20
  - Shasta: https://shasta.tronscan.org/#/tokens/create/TRC20

Las URLs usadas en `post-deploy-perfil.js`, VITACORA.md y `docs/TRONSCAN_DATOS_PEGAR.md` coinciden con las anteriores.

---

## 5. Compilación y Solidity

- **Proyecto:** Solidity 0.8.34 (solc en `package.json` y `tronbox.js`).
- **TVM:** Compatible con EVM; contratos Solidity estándar se pueden desplegar en TRON tras compilar. No se ha detectado incompatibilidad con la versión usada.

---

## 6. Resumen

| Área | Estado | Notas |
|------|--------|--------|
| Estándar TRC-20 | ✅ Alineado | 6 funciones + 2 eventos requeridos presentes |
| Endpoints TronGrid | ✅ Alineado | Mainnet, Shasta, Nile correctos |
| API Key mainnet | ✅ Soportado | Usar `TRON_PRO_API_KEY` en `.env`; preferir `npm run listo` frente a `tronbox migrate` en mainnet |
| Tronscan (URLs) | ✅ Alineado | URLs de Record Token correctas |
| Solidity / TVM | ✅ Compatible | 0.8.34 adecuado para TRON |

No se han detectado errores ni desalineaciones con la documentación oficial. Para mainnet se recomienda configurar `TRON_PRO_API_KEY` y usar los scripts de despliegue del proyecto en lugar de migraciones TronBox si se quiere aprovechar la API key.
