# Script para gestión segura de clave privada de Solana
# ⚠️ ADVERTENCIA: NUNCA compartas tu clave privada

Write-Host "=== GESTIÓN SEGURA DE CLAVE PRIVADA SOLANA ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "⚠️ ADVERTENCIAS DE SEGURIDAD:" -ForegroundColor Red
Write-Host "  1. NUNCA compartas tu clave privada con nadie" -ForegroundColor Yellow
Write-Host "  2. NUNCA la publiques en internet, redes sociales o chats" -ForegroundColor Yellow
Write-Host "  3. NUNCA la envíes por email o mensaje" -ForegroundColor Yellow
Write-Host "  4. Guárdala en un lugar seguro y encriptado" -ForegroundColor Yellow
Write-Host "  5. Considera usar un hardware wallet para mayor seguridad" -ForegroundColor Yellow
Write-Host ""

Write-Host "=== OPCIONES DISPONIBLES ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Verificar balance de la wallet" -ForegroundColor Green
Write-Host "2. Ver tokens SPL en la wallet" -ForegroundColor Green
Write-Host "3. Generar dirección pública desde clave privada (verificación)" -ForegroundColor Green
Write-Host "4. Crear backup encriptado de la clave privada" -ForegroundColor Green
Write-Host "5. Verificar que la clave privada corresponde a la dirección" -ForegroundColor Green
Write-Host ""

$opcion = Read-Host "Selecciona una opción (1-5) o 'salir' para cancelar"

if ($opcion -eq "salir" -or $opcion -eq "") {
    Write-Host "Operación cancelada." -ForegroundColor Yellow
    exit
}

switch ($opcion) {
    "1" {
        Write-Host ""
        Write-Host "=== VERIFICAR BALANCE ===" -ForegroundColor Cyan
        $address = "J3RX9CBrwB7vZmwNytRsJkJA9Wq7y6kwP25AZsX34TJa"
        
        try {
            $body = @{
                jsonrpc = "2.0"
                id = 1
                method = "getBalance"
                params = @($address)
            } | ConvertTo-Json
            
            $response = Invoke-RestMethod -Uri "https://api.mainnet-beta.solana.com" -Method POST -Headers @{ "Content-Type" = "application/json" } -Body $body
            
            if ($response.result) {
                $balanceSOL = [math]::Round($response.result.value / 1000000000, 9)
                Write-Host "Balance: $balanceSOL SOL" -ForegroundColor Green
                Write-Host "Lamports: $($response.result.value)" -ForegroundColor Gray
            }
        } catch {
            Write-Host "Error: $_" -ForegroundColor Red
        }
    }
    
    "2" {
        Write-Host ""
        Write-Host "=== TOKENS SPL EN LA WALLET ===" -ForegroundColor Cyan
        $address = "J3RX9CBrwB7vZmwNytRsJkJA9Wq7y6kwP25AZsX34TJa"
        
        try {
            $body = @{
                jsonrpc = "2.0"
                id = 1
                method = "getTokenAccountsByOwner"
                params = @($address, @{ programId = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" }, @{ encoding = "jsonParsed" })
            } | ConvertTo-Json
            
            $response = Invoke-RestMethod -Uri "https://api.mainnet-beta.solana.com" -Method POST -Headers @{ "Content-Type" = "application/json" } -Body $body
            
            if ($response.result -and $response.result.value) {
                Write-Host "Tokens encontrados: $($response.result.value.Count)" -ForegroundColor Green
                foreach ($tokenAccount in $response.result.value) {
                    $mint = $tokenAccount.account.data.parsed.info.mint
                    $amount = $tokenAccount.account.data.parsed.info.tokenAmount.uiAmount
                    Write-Host "  - Mint: $mint" -ForegroundColor Cyan
                    Write-Host "    Amount: $amount" -ForegroundColor Gray
                }
            }
        } catch {
            Write-Host "Error: $_" -ForegroundColor Red
        }
    }
    
    "3" {
        Write-Host ""
        Write-Host "=== VERIFICACIÓN DE CLAVE PRIVADA ===" -ForegroundColor Cyan
        Write-Host "Para verificar que tu clave privada corresponde a la dirección:" -ForegroundColor Yellow
        Write-Host "  Dirección esperada: J3RX9CBrwB7vZmwNytRsJkJA9Wq7y6kwP25AZsX34TJa" -ForegroundColor Gray
        Write-Host ""
        Write-Host "NOTA: Esta verificación requiere herramientas de Solana CLI o librerías." -ForegroundColor Yellow
        Write-Host "Recomendación: Usa 'solana-keygen verify' o librerías de JavaScript/Python" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Comando sugerido (si tienes Solana CLI instalado):" -ForegroundColor Cyan
        Write-Host "  solana-keygen verify <PUBLIC_KEY> <PRIVATE_KEY_FILE>" -ForegroundColor Gray
    }
    
    "4" {
        Write-Host ""
        Write-Host "=== CREAR BACKUP ENCRIPTADO ===" -ForegroundColor Cyan
        Write-Host "IMPORTANTE: Guarda tu clave privada en un lugar seguro" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Recomendaciones para backup:" -ForegroundColor Cyan
        Write-Host "  1. Usa un gestor de contraseñas (LastPass, 1Password, Bitwarden)" -ForegroundColor Gray
        Write-Host "  2. Guarda en un archivo encriptado con contraseña fuerte" -ForegroundColor Gray
        Write-Host "  3. Considera almacenamiento físico seguro (caja fuerte)" -ForegroundColor Gray
        Write-Host "  4. NO guardes en la nube sin encriptación adicional" -ForegroundColor Red
        Write-Host "  5. Crea múltiples copias en lugares seguros" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Formato recomendado para guardar:" -ForegroundColor Cyan
        Write-Host "  - Archivo de texto encriptado" -ForegroundColor Gray
        Write-Host "  - Papel guardado en lugar seguro (paper wallet)" -ForegroundColor Gray
        Write-Host "  - Hardware wallet (Ledger, Trezor)" -ForegroundColor Gray
    }
    
    "5" {
        Write-Host ""
        Write-Host "=== VERIFICAR CORRESPONDENCIA ===" -ForegroundColor Cyan
        Write-Host "Para verificar que tu clave privada corresponde a la dirección:" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Método 1: Usando Solana CLI" -ForegroundColor Green
        Write-Host "  solana-keygen verify J3RX9CBrwB7vZmwNytRsJkJA9Wq7y6kwP25AZsX34TJa <archivo_clave_privada>" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Método 2: Usando JavaScript/Node.js" -ForegroundColor Green
        Write-Host "  const { Keypair } = require('@solana/web3.js');" -ForegroundColor Gray
        Write-Host "  const keypair = Keypair.fromSecretKey(Buffer.from(clavePrivada, 'base58'));" -ForegroundColor Gray
        Write-Host "  console.log(keypair.publicKey.toBase58());" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Método 3: Usando Python" -ForegroundColor Green
        Write-Host "  from solders.keypair import Keypair" -ForegroundColor Gray
        Write-Host "  keypair = Keypair.from_base58_string(clave_privada)" -ForegroundColor Gray
        Write-Host "  print(keypair.pubkey())" -ForegroundColor Gray
    }
    
    default {
        Write-Host "Opción no válida." -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== RECORDATORIO DE SEGURIDAD ===" -ForegroundColor Red
Write-Host "Tu clave privada es como la llave de tu casa digital." -ForegroundColor Yellow
Write-Host "Quien tenga acceso a ella tiene control total de tus fondos." -ForegroundColor Yellow
Write-Host ""
