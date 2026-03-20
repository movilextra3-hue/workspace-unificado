# GUÍA COMPLETA DE ADMINISTRACIÓN DEL TOKEN SPL

## INFORMACIÓN DEL TOKEN

**Mint Address:**
```
DLyGgVVjcrsXvewd7PMr7H7FKpWiL96hymNvjZUCzeYf
```

**Owner/Creador:**
```
J3RX9CBrwB7vZmwNytRsJkJA9Wq7y6kwP25AZsX34TJa
```

**Características:**
- Supply Total: 500,000,000,000 tokens
- Decimals: 6
- Mint Authority: **NINGUNA (irreversible)**
- Freeze Authority: **NINGUNA**

---

## ⚠️ LIMITACIONES IMPORTANTES

Debido a que el token fue creado **SIN Mint Authority** y **SIN Freeze Authority**:

### ❌ NO PUEDES:
- Crear nuevos tokens (mint)
- Quemar tokens existentes (burn)
- Congelar cuentas de usuarios
- Descongelar cuentas
- Modificar el supply total

### ✅ SÍ PUEDES:
- Transferir tus propios tokens
- Ver información del token
- Ver el supply en circulación
- Ver cuentas de token
- Verificar balances

---

## INSTALACIÓN DE HERRAMIENTAS

### 1. Instalar Solana CLI

**Windows:**
```powershell
# Descargar e instalar
cmd /c "curl https://release.solana.com/stable/install -o install_solana.bat && install_solana.bat"
```

**Linux/Mac:**
```bash
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
```

### 2. Instalar SPL Token CLI

```bash
cargo install spl-token-cli
```

O usando npm:
```bash
npm install -g @solana/spl-token
```

### 3. Verificar Instalación

```bash
solana --version
spl-token --version
```

---

## CONFIGURACIÓN INICIAL

### 1. Configurar Red

```bash
# Mainnet (producción)
solana config set --url https://api.mainnet-beta.solana.com

# Testnet (pruebas)
solana config set --url https://api.testnet.solana.com

# Devnet (desarrollo)
solana config set --url https://api.devnet.solana.com
```

### 2. Configurar Clave Privada

```bash
# Opción 1: Especificar archivo de clave
solana config set --keypair <ruta_a_tu_clave_privada.json>

# Opción 2: Usar variable de entorno
export SOLANA_KEYPAIR=<ruta_a_tu_clave_privada.json>
```

### 3. Verificar Configuración

```bash
solana config get
solana address  # Debe mostrar: J3RX9CBrwB7vZmwNytRsJkJA9Wq7y6kwP25AZsX34TJa
```

---

## OPERACIONES DISPONIBLES

### 1. Ver Información del Token

```bash
# Información básica
spl-token display DLyGgVVjcrsXvewd7PMr7H7FKpWiL96hymNvjZUCzeYf

# Información detallada
solana account DLyGgVVjcrsXvewd7PMr7H7FKpWiL96hymNvjZUCzeYf

# Supply actual
spl-token supply DLyGgVVjcrsXvewd7PMr7H7FKpWiL96hymNvjZUCzeYf
```

### 2. Ver Balance del Owner

```bash
# Ver todas las cuentas de token del owner
spl-token accounts --owner J3RX9CBrwB7vZmwNytRsJkJA9Wq7y6kwP25AZsX34TJa

# Ver balance específico del token
spl-token balance DLyGgVVjcrsXvewd7PMr7H7FKpWiL96hymNvjZUCzeYf --owner J3RX9CBrwB7vZmwNytRsJkJA9Wq7y6kwP25AZsX34TJa
```

### 3. Transferir Tokens

```bash
# Transferir cantidad específica
spl-token transfer DLyGgVVjcrsXvewd7PMr7H7FKpWiL96hymNvjZUCzeYf <cantidad> <direccion_destino>

# Transferir todos los tokens
spl-token transfer DLyGgVVjcrsXvewd7PMr7H7FKpWiL96hymNvjZUCzeYf ALL <direccion_destino>

# Transferir con confirmación
spl-token transfer DLyGgVVjcrsXvewd7PMr7H7FKpWiL96hymNvjZUCzeYf <cantidad> <destino> --allow-unfunded-recipient

# Ejemplo: Transferir 1000 tokens
spl-token transfer DLyGgVVjcrsXvewd7PMr7H7FKpWiL96hymNvjZUCzeYf 1000 <direccion_destino>
```

**Nota:** Recuerda que el token tiene 6 decimales, así que:
- 1 token = 1000000 (1,000,000 unidades mínimas)
- 1000 tokens = 1000000000 (1,000,000,000 unidades mínimas)

### 4. Ver Todas las Cuentas del Token

```bash
# Listar todas las cuentas que tienen este token
spl-token accounts DLyGgVVjcrsXvewd7PMr7H7FKpWiL96hymNvjZUCzeYf --output json

# Ver información de una cuenta específica
spl-token account-info <cuenta_token_address>
```

### 5. Verificar Transacciones

```bash
# Ver transacciones del token
solana transaction-history DLyGgVVjcrsXvewd7PMr7H7FKpWiL96hymNvjZUCzeYf

# Ver transacciones del owner
solana transaction-history J3RX9CBrwB7vZmwNytRsJkJA9Wq7y6kwP25AZsX34TJa
```

---

## USANDO JAVASCRIPT/TYPESCRIPT

### Instalación

```bash
npm install @solana/web3.js @solana/spl-token
```

### Código de Ejemplo

```javascript
const { Connection, Keypair, PublicKey } = require('@solana/web3.js');
const { getMint, getAccount, transfer } = require('@solana/spl-token');
const bs58 = require('bs58');

// Configuración
const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
const MINT_ADDRESS = new PublicKey('DLyGgVVjcrsXvewd7PMr7H7FKpWiL96hymNvjZUCzeYf');
const OWNER_ADDRESS = new PublicKey('J3RX9CBrwB7vZmwNytRsJkJA9Wq7y6kwP25AZsX34TJa');

// Cargar clave privada (NUNCA hardcodees esto en producción)
const privateKeyBase58 = 'TU_CLAVE_PRIVADA_AQUI';
const secretKey = bs58.decode(privateKeyBase58);
const ownerKeypair = Keypair.fromSecretKey(secretKey);

// Obtener información del mint
async function getTokenInfo() {
    const mintInfo = await getMint(connection, MINT_ADDRESS);
    console.log('Supply:', mintInfo.supply.toString());
    console.log('Decimals:', mintInfo.decimals);
    console.log('Mint Authority:', mintInfo.mintAuthority?.toBase58() || 'None');
    console.log('Freeze Authority:', mintInfo.freezeAuthority?.toBase58() || 'None');
}

// Obtener balance del owner
async function getOwnerBalance() {
    // Necesitas encontrar la cuenta de token asociada
    // Esto requiere buscar todas las cuentas del owner
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        OWNER_ADDRESS,
        { mint: MINT_ADDRESS }
    );
    
    if (tokenAccounts.value.length > 0) {
        const account = tokenAccounts.value[0];
        const amount = account.account.data.parsed.info.tokenAmount.uiAmount;
        console.log('Balance:', amount);
    }
}

// Transferir tokens
async function transferTokens(destinationAddress, amount) {
    const destinationPublicKey = new PublicKey(destinationAddress);
    
    // Encontrar cuenta de token del owner
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        ownerKeypair.publicKey,
        { mint: MINT_ADDRESS }
    );
    
    if (tokenAccounts.value.length === 0) {
        throw new Error('No se encontró cuenta de token');
    }
    
    const sourceTokenAccount = tokenAccounts.value[0].pubkey;
    
    // Crear o encontrar cuenta de token del destino
    // (Esto requiere lógica adicional para crear la cuenta si no existe)
    
    // Realizar transferencia
    const signature = await transfer(
        connection,
        ownerKeypair,
        sourceTokenAccount,
        destinationPublicKey,
        ownerKeypair.publicKey,
        amount * Math.pow(10, 6) // Convertir a unidades mínimas (6 decimals)
    );
    
    console.log('Transferencia completada:', signature);
    return signature;
}

// Ejecutar funciones
getTokenInfo();
getOwnerBalance();
```

---

## USANDO PYTHON

### Instalación

```bash
pip install solana solders
```

### Código de Ejemplo

```python
from solana.rpc.api import Client
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solders.system_program import TransferParams, transfer
from spl.token.client import Token
from spl.token.constants import TOKEN_PROGRAM_ID

# Configuración
client = Client("https://api.mainnet-beta.solana.com")
MINT_ADDRESS = Pubkey.from_string("DLyGgVVjcrsXvewd7PMr7H7FKpWiL96hymNvjZUCzeYf")
OWNER_ADDRESS = Pubkey.from_string("J3RX9CBrwB7vZmwNytRsJkJA9Wq7y6kwP25AZsX34TJa")

# Cargar clave privada
private_key_base58 = "TU_CLAVE_PRIVADA_AQUI"
owner_keypair = Keypair.from_base58_string(private_key_base58)

# Obtener información del token
def get_token_info():
    token = Token(client, MINT_ADDRESS, TOKEN_PROGRAM_ID, owner_keypair)
    mint_info = token.get_mint_info()
    print(f"Supply: {mint_info.supply}")
    print(f"Decimals: {mint_info.decimals}")
    print(f"Mint Authority: {mint_info.mint_authority}")
    print(f"Freeze Authority: {mint_info.freeze_authority}")

# Transferir tokens
def transfer_tokens(destination_address, amount):
    destination_pubkey = Pubkey.from_string(destination_address)
    token = Token(client, MINT_ADDRESS, TOKEN_PROGRAM_ID, owner_keypair)
    
    # Obtener cuenta de token del owner
    owner_token_account = token.get_accounts(owner_keypair.pubkey)
    
    # Realizar transferencia
    token.transfer(
        source=owner_token_account[0].address,
        dest=destination_pubkey,
        owner=owner_keypair,
        amount=amount * (10 ** 6)  # Convertir a unidades mínimas
    )
```

---

## MONITOREO Y ANÁLISIS

### APIs Útiles

1. **Solana RPC API:**
   - https://api.mainnet-beta.solana.com

2. **Exploradores:**
   - Solana Explorer: https://explorer.solana.com/address/DLyGgVVjcrsXvewd7PMr7H7FKpWiL96hymNvjZUCzeYf
   - Solscan: https://solscan.io/token/DLyGgVVjcrsXvewd7PMr7H7FKpWiL96hymNvjZUCzeYf

3. **APIs de Terceros:**
   - Birdeye API
   - Jupiter API
   - Helius API

---

## SEGURIDAD

1. **NUNCA compartas tu clave privada**
2. **Usa variables de entorno para claves privadas**
3. **Verifica siempre las direcciones antes de transferir**
4. **Usa hardware wallets para operaciones importantes**
5. **Mantén tus herramientas actualizadas**

---

## SOLUCIÓN DE PROBLEMAS

### Error: "Insufficient funds"
- Verifica que tienes suficiente SOL para pagar las fees de transacción
- Las transferencias de tokens SPL requieren SOL para fees

### Error: "Account not found"
- La cuenta de token del destinatario puede no existir
- Usa `--allow-unfunded-recipient` o crea la cuenta primero

### Error: "Invalid owner"
- Verifica que estás usando la clave privada correcta
- Verifica que la cuenta de token pertenece al owner

---

## RECURSOS ADICIONALES

- **Documentación Solana:** https://docs.solana.com/
- **SPL Token Docs:** https://spl.solana.com/token
- **Solana Cookbook:** https://solanacookbook.com/
- **Solana Web3.js:** https://solana-labs.github.io/solana-web3.js/
