# GUÍA RÁPIDA: INSTALAR SOLANA CLI

## ❌ Estado Actual
**Solana CLI NO está instalado** en tu sistema.

---

## ✅ MÉTODO MÁS FÁCIL (Recomendado)

### Opción 1: Descarga Manual

1. **Abre tu navegador**
2. **Ve a:** https://github.com/solana-labs/solana/releases/latest
3. **Descarga:** `solana-install-init-x86_64-pc-windows-msvc.exe`
4. **Ejecuta** el archivo descargado
5. **Sigue** las instrucciones del instalador
6. **Cierra y abre** una nueva terminal PowerShell
7. **Verifica:** `solana --version`

### Opción 2: Instalador Web

1. **Ve a:** https://docs.solana.com/cli/install-solana-cli-tools
2. **Sigue** las instrucciones para Windows
3. **Descarga** el instalador oficial
4. **Ejecuta** y sigue los pasos

---

## 🔧 MÉTODO ALTERNATIVO: Sin CLI

Si no puedes instalar la CLI, puedes usar **JavaScript**:

### 1. Instalar Node.js
- Descarga desde: https://nodejs.org/
- Instala la versión LTS

### 2. Instalar dependencias
```bash
npm install @solana/web3.js bs58
```

### 3. Usar el script creado
- Ya tienes `enviar_sol.js` creado
- Solo edita tu clave privada y dirección destino
- Ejecuta: `node enviar_sol.js`

---

## 📝 COMANDOS DESPUÉS DE INSTALAR

Una vez instalado:

```bash
# Verificar instalación
solana --version

# Configurar red
solana config set --url https://api.mainnet-beta.solana.com

# Configurar clave privada
solana config set --keypair <ruta_a_tu_clave_privada.json>

# Verificar dirección
solana address
# Debe mostrar: J3RX9CBrwB7vZmwNytRsJkJA9Wq7y6kwP25AZsX34TJa

# Ver balance
solana balance

# Enviar SOL
solana transfer <DIRECCION_DESTINO> <CANTIDAD> --allow-unfunded-recipient
```

---

## ⚠️ SI NO FUNCIONA

Si después de instalar el comando `solana` no se reconoce:

1. **Cierra y abre** una nueva terminal PowerShell
2. **Verifica el PATH:**
   ```powershell
   $env:PATH -split ';' | Select-String 'solana'
   ```

3. **Agrega manualmente al PATH:**
   ```powershell
   [Environment]::SetEnvironmentVariable('Path', $env:Path + ';C:\Users\Administrador\.local\share\solana\install\active_release\bin', 'User')
   ```

4. **Reinicia PowerShell**

---

## 🚀 ENLACES ÚTILES

- **GitHub Releases:** https://github.com/solana-labs/solana/releases/latest
- **Documentación Oficial:** https://docs.solana.com/cli/install-solana-cli-tools
- **Node.js (alternativa):** https://nodejs.org/

---

## 💡 RESUMEN

**Para instalar Solana CLI:**
1. Descarga desde GitHub: https://github.com/solana-labs/solana/releases/latest
2. Busca: `solana-install-init-x86_64-pc-windows-msvc.exe`
3. Ejecuta el instalador
4. Reinicia PowerShell
5. Verifica con: `solana --version`

**O usa JavaScript sin CLI:**
- Ya tienes los scripts creados
- Solo necesitas Node.js
