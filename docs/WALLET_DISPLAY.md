# Mostrar el token en billeteras — Requisitos y datos

Para que el token se **muestre automáticamente** en billeteras (TronLink, Klever, Trust Wallet, etc.) con nombre, símbolo, decimales y balance, el contrato debe exponer las funciones estándar TRC-20. Este documento verifica que el proyecto las cumple y qué hacer tras el despliegue.

---

## 1. Requisitos on-chain (contrato)

Las billeteras detectan TRC-20 leyendo el contrato con estas llamadas:

| Función / Evento | Tipo de retorno | Uso en billetera | En este contrato |
|------------------|-----------------|------------------|-------------------|
| `name()` | `string` | Nombre visible (ej. "Mi Token") | ✅ `string public name` (getter automático) |
| `symbol()` | `string` | Símbolo (ej. "MTK") | ✅ `string public symbol` (getter automático) |
| `decimals()` | `uint8` | Precisión (ej. 18) | ✅ `uint8 public decimals` (getter automático) |
| `totalSupply()` | `uint256` | Supply total | ✅ `uint256 public totalSupply` (getter automático) |
| `balanceOf(address)` | `uint256` | Balance del usuario | ✅ Función pública explícita |
| `allowance(owner, spender)` | `uint256` | Aprobaciones | ✅ Función pública explícita |
| `transfer`, `approve`, `transferFrom` | `bool` | Operaciones estándar | ✅ Todas devuelven `bool` |
| Evento `Transfer(address,address,uint256)` | — | Historial y detección de token | ✅ Indexed `from`, `to` |
| Evento `Approval(address,address,uint256)` | — | Aprobaciones | ✅ Indexed `owner`, `spender` |

**Conclusión:** El contrato **cumple todos los requisitos** para que cualquier billetera compatible con TRC-20 muestre el token con nombre, símbolo, decimales y balances correctos.

---

## 2. Dirección que deben usar las billeteras

El token es **upgradeable**: la lógica está en la implementación y el estado (balances, name, symbol, etc.) se lee a través del **Proxy**.

- **Dirección del token = dirección del Proxy.**
- En despliegue con script o migrate, esa dirección es la que se escribe en `deploy-info.json` como **`tokenAddress`**.

Los usuarios deben **añadir el token** en la billetera usando **esa dirección (Proxy)**. Si usan la dirección de la implementación, la billetera podría mostrar datos incorrectos o no reconocer el token.

---

## 3. Datos que se muestran automáticamente

Con solo desplegar y dar la dirección del **Proxy**:

- **Nombre:** valor de `name()` (el que se pasó a `initialize`, p. ej. desde `TOKEN_NAME`).
- **Símbolo:** valor de `symbol()` (p. ej. desde `TOKEN_SYMBOL`).
- **Decimales:** valor de `decimals()` (p. ej. desde `TOKEN_DECIMALS`, típicamente 18).
- **Balance:** `balanceOf(dirección del usuario)`.
- **Supply total:** `totalSupply()`.

No hace falta ningún otro contrato ni configuración on-chain para que eso funcione.

---

## 4. Ejemplo de referencia: Tether USD (USDT) en TRON

Usamos como referencia la metadata del token **Tether USD (USDT)** en TRON, el TRC-20 más usado, para alinear nombre, símbolo y decimales con el estándar que esperan billeteras y exploradores.

| Campo        | USDT (TRON) — Ejemplo | Descripción |
|-------------|------------------------|-------------|
| **Contrato** | `TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t` | Dirección del token (en USDT es contrato único, no proxy). |
| **name()**   | `Tether USD`           | Nombre completo para listados y billeteras. |
| **symbol()** | `USDT`                 | Símbolo corto (ticker). |
| **decimals()** | `6`                  | 6 decimales (común en stablecoins; 18 es común en utility tokens). |

**Cómo llevarlo a tu token:** en el despliegue, pasa a `initialize()` (o variables de entorno) valores con el mismo criterio:

- **Nombre:** texto claro y completo (ej. `"Mi Proyecto Token"` o `"Tether USD"`).
- **Símbolo:** ticker corto en mayúsculas (ej. `"MPT"` o `"USDT"`).
- **Decimales:** `6` para stablecoins tipo dólar, `18` para tokens de utilidad (como muchos ERC-20/TRC-20).

Ejemplo en `.env` (estilo USDT):

```env
TOKEN_NAME=Tether USD
TOKEN_SYMBOL=USDT
TOKEN_DECIMALS=6
TOKEN_SUPPLY=1000000000000
```

Para un token propio solo cambia nombre, símbolo y supply; decimales según si es stablecoin (6) o no (p. ej. 18). Ver [ENV_TEMPLATE.txt](../ENV_TEMPLATE.txt) y migración `2_deploy_trc20.js`. Para alinear **métodos, procedimientos e implementaciones** con USDT en TRON (blacklist, pausa, eventos, aliases), ver [USDT_TRON_REFERENCIA.md](USDT_TRON_REFERENCIA.md).

---

## 5. Tronscan y datos adicionales (logo, web, descripción)

Para que el token aparezca con **logo, web y descripción** en Tronscan y en billeteras que usan datos de Tronscan (alineado con USDT en mainnet):

1. **Verificar el contrato** en Tronscan (código fuente público). Pasos en [VERIFICATION.md](VERIFICATION.md).
2. **Completar perfil del token** en Tronscan: logo (imgUrl), descripción, project website, redes sociales. Guía paso a paso: [TRONSCAN_PERFIL_TOKEN.md](TRONSCAN_PERFIL_TOKEN.md).

Resumen: **on-chain** el token ya tiene todo lo necesario para mostrarse en billeteras; **off-chain** (logo, web, descripción) se configuran en Tronscan. Panorama completo: [USDT_TRON_PANORAMA_MAINNET_Y_WALLETS.md](USDT_TRON_PANORAMA_MAINNET_Y_WALLETS.md).

### Añadir token desde una DApp (TronLink)

Si tu DApp quiere que el usuario añada el token con un clic (sin copiar la dirección):

```javascript
await tronWeb.request({
  method: 'wallet_watchAsset',
  params: {
    type: 'trc20',
    options: {
      address: tokenAddress,  // tokenAddress de deploy-info.json (Proxy)
      symbol: 'USDT',         // o el symbol de tu token
      decimals: 6             // o los decimales de tu token
    }
  }
});
```

La wallet mostrará un diálogo de confirmación; al aceptar, el token quedará en la lista de activos.

---

## 6. Checklist rápida

- [x] Contrato expone `name()`, `symbol()`, `decimals()`, `totalSupply()`, `balanceOf()`, `allowance()`.
- [x] `transfer`, `approve`, `transferFrom` devuelven `bool`.
- [x] Eventos `Transfer` y `Approval` con firmas estándar (indexed donde corresponde).
- [x] La dirección que se comparte es la del **Proxy** (`tokenAddress` en deploy-info).
- [ ] Tras desplegar: verificar en Tronscan (recomendado). Ver [VERIFICATION.md](VERIFICATION.md).
- [ ] Completar perfil del token en Tronscan (logo, descripción, web). Ver [TRONSCAN_PERFIL_TOKEN.md](TRONSCAN_PERFIL_TOKEN.md).

Con esto, el token tiene **todos los detalles necesarios** para mostrarse automáticamente en cualquier billetera con los datos correctos (nombre, símbolo, decimales, supply, balance); los datos extra (logo, web) se gestionan en Tronscan después del despliegue.
