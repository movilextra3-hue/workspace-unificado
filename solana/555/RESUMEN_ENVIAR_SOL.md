# GUÍA: ENVIAR 0.00132799 SOL RESTANDO TARIFA

## 📋 INFORMACIÓN

**Cantidad neta a recibir:** 0.00132799 SOL  
**Fee estimado:** ~0.000005 SOL  
**Cantidad total a enviar:** 0.00133299 SOL

---

## 🚀 OPCIÓN 1: USANDO SOLANA CLI (Recomendado)

### Requisitos:
- Solana CLI instalado
- Clave privada configurada
- Balance suficiente

### Pasos:

#### 1. Instalar Solana CLI
```bash
# Windows
# Descargar desde: https://github.com/solana-labs/solana/releases
# O usar el instalador oficial
```

#### 2. Configurar tu clave privada
```bash
solana config set --keypair <ruta_a_tu_clave_privada.json>
solana config set --url https://api.mainnet-beta.solana.com
```

#### 3. Verificar tu dirección
```bash
solana address
# Debe mostrar: J3RX9CBrwB7vZmwNytRsJkJA9Wq7y6kwP25AZsX34TJa
```

#### 4. Verificar balance
```bash
solana balance
```

#### 5. Enviar SOL
```bash
# Reemplaza <DIRECCION_DESTINO> con la dirección destino
solana transfer <DIRECCION_DESTINO> 0.00133299 --allow-unfunded-recipient
```

**Nota:** `--allow-unfunded-recipient` permite enviar a direcciones que no tienen SOL.

---

## 💻 OPCIÓN 2: USANDO JAVASCRIPT/Node.js

### Requisitos:
- Node.js instalado
- Librerías: @solana/web3.js y bs58

### Instalación:
```bash
npm install @solana/web3.js bs58
```

### Script (enviar_sol.js):
```javascript
const { Connection, Keypair, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const bs58 = require('bs58');

const CANTIDAD_NETA = 0.00132799;
const FEE_ESTIMADO = 0.000005;
const CANTIDAD_TOTAL = CANTIDAD_NETA + FEE_ESTIMADO;

// TU CLAVE PRIVADA (Base58)
const PRIVATE_KEY_BASE58 = 'TU_CLAVE_PRIVADA_AQUI';

// DIRECCIÓN DESTINO
const DESTINO = 'DIRECCION_DESTINO_AQUI';

const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

async function enviarSOL() {
    const secretKey = bs58.decode(PRIVATE_KEY_BASE58);
    const fromKeypair = Keypair.fromSecretKey(secretKey);
    const toPublicKey = new PublicKey(DESTINO);
    
    const lamportsToSend = Math.floor(CANTIDAD_TOTAL * LAMPORTS_PER_SOL);
    
    const transaction = new Transaction().add(
        SystemProgram.transfer({
            fromPubkey: fromKeypair.publicKey,
            toPubkey: toPublicKey,
            lamports: lamportsToSend,
        })
    );
    
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = fromKeypair.publicKey;
    transaction.sign(fromKeypair);
    
    const signature = await connection.sendRawTransaction(transaction.serialize());
    console.log('Signature:', signature);
    console.log('Verificar: https://explorer.solana.com/tx/' + signature);
    
    await connection.confirmTransaction(signature, 'confirmed');
    console.log('✅ Transacción confirmada');
}

enviarSOL();
```

### Ejecutar:
```bash
node enviar_sol.js
```

---

## 🐍 OPCIÓN 3: USANDO PYTHON

### Instalación:
```bash
pip install solana solders
```

### Script:
```python
from solana.rpc.api import Client
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solders.system_program import TransferParams, transfer
from solders.transaction import Transaction

CANTIDAD_NETA = 0.00132799
FEE_ESTIMADO = 0.000005
CANTIDAD_TOTAL = CANTIDAD_NETA + FEE_ESTIMADO

# Tu clave privada
PRIVATE_KEY_BASE58 = "TU_CLAVE_PRIVADA_AQUI"
DESTINO = "DIRECCION_DESTINO_AQUI"

client = Client("https://api.mainnet-beta.solana.com")
from_keypair = Keypair.from_base58_string(PRIVATE_KEY_BASE58)
to_pubkey = Pubkey.from_string(DESTINO)

lamports = int(CANTIDAD_TOTAL * 1_000_000_000)  # Convertir a lamports

# Crear y enviar transacción
tx = Transaction()
tx.add(transfer(TransferParams(
    from_pubkey=from_keypair.pubkey(),
    to_pubkey=to_pubkey,
    lamports=lamports
)))

result = client.send_transaction(tx, from_keypair)
print(f"Signature: {result.value}")
```

---

## 📊 CÁLCULO DE CANTIDADES

**Cantidad neta:** 0.00132799 SOL  
**Fee estimado:** 0.000005 SOL  
**Total a enviar:** 0.00133299 SOL

**En lamports:**
- 0.00132799 SOL = 1,327,990 lamports
- 0.000005 SOL = 5,000 lamports
- Total = 1,332,990 lamports

---

## ⚠️ ADVERTENCIAS

1. **Verifica la dirección destino** antes de enviar
2. **El fee puede variar** ligeramente según la congestión
3. **La transacción es irreversible**
4. **Asegúrate de tener suficiente balance** (necesitas más de 0.00133299 SOL)

---

## 🔍 VERIFICACIÓN

Después de enviar, verifica en:
- **Solana Explorer:** https://explorer.solana.com/tx/<signature>
- **Solscan:** https://solscan.io/tx/<signature>

---

## 📝 COMANDO RÁPIDO

Si tienes Solana CLI configurado:

```bash
solana transfer <DIRECCION_DESTINO> 0.00133299 --allow-unfunded-recipient
```

Reemplaza `<DIRECCION_DESTINO>` con la dirección de 44 caracteres.

---

## 🛠️ SCRIPTS CREADOS

1. **enviar_sol.ps1** - Script PowerShell interactivo
2. **enviar_sol_api.ps1** - Script alternativo con API
3. **enviar_sol.js** - Script JavaScript (se crea automáticamente)
4. **RESUMEN_ENVIAR_SOL.md** - Esta guía

---

## ❓ PREGUNTAS FRECUENTES

### ¿Por qué 0.00133299 y no 0.00132799?
Porque necesitas enviar la cantidad neta (0.00132799) + el fee (0.000005) = 0.00133299

### ¿El destinatario recibirá exactamente 0.00132799?
Sí, aproximadamente. El fee se deduce del monto total enviado.

### ¿Qué pasa si el fee real es mayor?
El destinatario recibirá ligeramente menos, pero siempre cerca de 0.00132799 SOL.

### ¿Puedo enviar sin tener Solana CLI?
Sí, usa el script JavaScript o Python.
