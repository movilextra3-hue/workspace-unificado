# Token desde cero (ERC-20)

Contrato de token fungible estándar ERC-20 escrito desde cero. Sirve para Ethereum, BSC, Polygon y otras redes EVM. Para Tron (TRC-20) el mismo código se puede usar en el IDE de Tron.

## Estructura

- `contracts/MiToken.sol` — contrato del token (name, symbol, decimals, supply, transfer, approve, allowance).

## Opción 1: Desplegar con Hardhat (Ethereum, Sepolia, BSC, etc.)

### 1. Instalar

```bash
cd token
npm install
```

### 2. Compilar

```bash
npm run compile
```

### 3. Desplegar

**Red local (Hardhat Network):**

```bash
npx hardhat node
```

En otra terminal:

```bash
npm run deploy:local
```

**Sepolia (testnet):**

Crea un archivo `.env` con:

- `PRIVATE_KEY` — clave privada de la billetera (con ETH en Sepolia para gas).
- Opcional: `SEPOLIA_RPC`, `TOKEN_NAME`, `TOKEN_SYMBOL`, `TOKEN_DECIMALS`, `TOKEN_SUPPLY`.

Luego:

```bash
npm run deploy:sepolia
```

**Personalizar nombre y supply:**

```bash
TOKEN_NAME="Mi Proyecto" TOKEN_SYMBOL="MP" TOKEN_SUPPLY=1000000000 npm run deploy:sepolia
```

## Opción 2: Desplegar con Remix (sin instalar nada)

1. Entra en [remix.ethereum.org](https://remix.ethereum.org).
2. Crea un archivo `MiToken.sol` y pega el contenido de `contracts/MiToken.sol`.
3. Compila (Compiler 0.8.20).
4. En "Deploy", selecciona la red (Injected Provider = MetaMask) y el contrato `MiToken`.
5. Rellena el constructor:
   - `_name`: nombre del token (ej. "Mi Token").
   - `_symbol`: símbolo (ej. "MTK").
   - `_decimals`: normalmente 18.
   - `_initialSupply`: cantidad inicial en unidades (ej. 1000000 → 1M de tokens).
6. Pulsa Deploy.

## Opción 3: Tron (TRC-20)

El mismo contrato Solidity es compatible con Tron. Opciones:

- **TronIDE** (tronscan.org): crea un contrato, pega `MiToken.sol`, compila con el compilador de Tron y despliega en Mainnet o Nile.
- **Remix + plugin Tron**: si usas una extensión/integración Tron con Remix.

En el constructor, la supply se indica en unidades; internamente se multiplica por `10^decimals`.

## Resumen del contrato

| Función        | Descripción                          |
|----------------|--------------------------------------|
| `name`         | Nombre del token                     |
| `symbol`       | Símbolo (ej. MTK)                    |
| `decimals`     | Decimales (típico 18)               |
| `totalSupply`  | Supply total                         |
| `balanceOf(a)` | Balance de una dirección             |
| `transfer(to, amount)` | Enviar tokens                |
| `approve(spender, amount)` | Autorizar gasto             |
| `allowance(owner, spender)` | Ver autorización          |
| `transferFrom(from, to, amount)` | Enviar en nombre de otro |

Todo el supply inicial se asigna a la dirección que despliega el contrato.
