# GUÍA DE SEGURIDAD - CLAVE PRIVADA SOLANA

## ⚠️ ADVERTENCIAS CRÍTICAS

### NUNCA hagas lo siguiente:
- ❌ Compartir tu clave privada con nadie
- ❌ Publicarla en internet, redes sociales, chats o foros
- ❌ Enviarla por email, mensaje de texto o WhatsApp
- ❌ Guardarla en servicios de almacenamiento en la nube sin encriptación
- ❌ Tomar capturas de pantalla y guardarlas en tu teléfono
- ❌ Escribirla en documentos no encriptados

### ✅ HAZ lo siguiente:
- ✅ Guarda tu clave privada en un lugar seguro y encriptado
- ✅ Usa un gestor de contraseñas confiable
- ✅ Considera usar un hardware wallet (Ledger, Trezor)
- ✅ Crea múltiples copias de seguridad en lugares físicos seguros
- ✅ Verifica que la clave privada corresponde a tu dirección pública
- ✅ Mantén tu computadora libre de malware y virus

---

## INFORMACIÓN DE TU WALLET

**Dirección Pública (Puedes compartirla):**
```
J3RX9CBrwB7vZmwNytRsJkJA9Wq7y6kwP25AZsX34TJa
```

**Token Creado:**
```
DLyGgVVjcrsXvewd7PMr7H7FKpWiL96hymNvjZUCzeYf
```

**Hash de Creación:**
```
3tTW7tvfNEKX6oVUpKdEE4YkTLVvTj4NfEngy3c9Ws9zpjwvwCawwwNyCiWg9roWSbmbmLa1exev3gyne4esnCDz
```

---

## MÉTODOS SEGUROS DE ALMACENAMIENTO

### 1. Gestor de Contraseñas
- **LastPass** - Encriptación AES-256
- **1Password** - Encriptación de extremo a extremo
- **Bitwarden** - Código abierto, encriptación fuerte
- **KeePass** - Local, sin nube

### 2. Hardware Wallet (RECOMENDADO)
- **Ledger Nano S/X** - Soporte completo para Solana
- **Trezor** - Hardware wallet confiable
- **Safepal** - Opción económica

### 3. Paper Wallet (Backup Físico)
- Imprime tu clave privada en papel
- Guárdala en una caja de seguridad o caja fuerte
- Considera laminarla para protegerla de daños
- Crea múltiples copias en diferentes ubicaciones

### 4. Archivo Encriptado
- Usa herramientas como **VeraCrypt** o **7-Zip** con encriptación AES-256
- Protege el archivo con una contraseña fuerte
- Guarda el archivo en múltiples ubicaciones seguras

---

## VERIFICACIÓN DE CLAVE PRIVADA

### Usando Solana CLI
```bash
# Instalar Solana CLI si no lo tienes
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Verificar clave privada
solana-keygen verify J3RX9CBrwB7vZmwNytRsJkJA9Wq7y6kwP25AZsX34TJa <archivo_clave_privada>
```

### Usando JavaScript/Node.js
```javascript
const { Keypair } = require('@solana/web3.js');
const bs58 = require('bs58');

// Tu clave privada en Base58
const privateKeyBase58 = 'TU_CLAVE_PRIVADA_AQUI';

// Convertir a Keypair
const secretKey = bs58.decode(privateKeyBase58);
const keypair = Keypair.fromSecretKey(secretKey);

// Verificar dirección pública
console.log('Dirección pública:', keypair.publicKey.toBase58());
console.log('¿Coincide?', keypair.publicKey.toBase58() === 'J3RX9CBrwB7vZmwNytRsJkJA9Wq7y6kwP25AZsX34TJa');
```

### Usando Python
```python
from solders.keypair import Keypair
from solders.pubkey import Pubkey

# Tu clave privada en Base58
private_key_base58 = 'TU_CLAVE_PRIVADA_AQUI'

# Convertir a Keypair
keypair = Keypair.from_base58_string(private_key_base58)

# Verificar dirección pública
print('Dirección pública:', str(keypair.pubkey()))
print('¿Coincide?', str(keypair.pubkey()) == 'J3RX9CBrwB7vZmwNytRsJkJA9Wq7y6kwP25AZsX34TJa')
```

---

## OPERACIONES SEGURAS CON TU WALLET

### Verificar Balance (Sin exponer clave privada)
```bash
solana balance J3RX9CBrwB7vZmwNytRsJkJA9Wq7y6kwP25AZsX34TJa
```

### Ver Tokens SPL
```bash
spl-token accounts --owner J3RX9CBrwB7vZmwNytRsJkJA9Wq7y6kwP25AZsX34TJa
```

### Transferir Tokens (Requiere clave privada)
```bash
# Configurar clave privada (una sola vez)
solana config set --keypair <ruta_a_tu_clave_privada>

# Transferir SOL
solana transfer <destino> <cantidad> --allow-unfunded-recipient

# Transferir tokens SPL
spl-token transfer <mint_address> <cantidad> <destino>
```

---

## PLAN DE ACCIÓN RECOMENDADO

1. **INMEDIATO:**
   - Verifica que tu clave privada corresponde a la dirección pública
   - Crea un backup encriptado
   - Guarda el backup en un lugar seguro

2. **CORTO PLAZO:**
   - Considera migrar a un hardware wallet
   - Crea múltiples copias de seguridad
   - Documenta dónde guardaste cada copia

3. **LARGO PLAZO:**
   - Revisa periódicamente tus backups
   - Mantén tu software actualizado
   - Considera usar una wallet multisig para mayor seguridad

---

## EN CASO DE COMPROMISO

Si sospechas que tu clave privada ha sido comprometida:

1. **INMEDIATAMENTE:**
   - Transfiere todos los fondos a una nueva wallet
   - No uses la wallet comprometida nunca más

2. **VERIFICA:**
   - Revisa todas las transacciones recientes
   - Verifica que no haya transferencias no autorizadas

3. **PREVENCIÓN:**
   - Crea una nueva wallet con una nueva clave privada
   - Usa un hardware wallet para la nueva wallet
   - Implementa mejores prácticas de seguridad

---

## RECURSOS ÚTILES

- **Solana Explorer:** https://explorer.solana.com/address/J3RX9CBrwB7vZmwNytRsJkJA9Wq7y6kwP25AZsX34TJa
- **Solscan:** https://solscan.io/account/J3RX9CBrwB7vZmwNytRsJkJA9Wq7y6kwP25AZsX34TJa
- **Documentación Solana:** https://docs.solana.com/
- **Solana CLI:** https://docs.solana.com/cli

---

## RECORDATORIO FINAL

**Tu clave privada es la única forma de acceder a tus fondos en Solana.**
**Quien tenga acceso a ella tiene control total.**
**Protégela como protegerías el dinero físico más valioso que tengas.**
