# Script para quemar tus tokens del token SPL
$MINT_ADDRESS = "DLyGgVVjcrsXvewd7PMr7H7FKpWiL96hymNvjZUCzeYf"
$OWNER_ADDRESS = "J3RX9CBrwB7vZmwNytRsJkJA9Wq7y6kwP25AZsX34TJa"
$TOKEN_ACCOUNT = "ERYTL2q88XNi9yubbF9ZBXA3ZsSZPooitynLP9QhhHHt"

Write-Host "=== SCRIPT PARA QUEMAR TUS TOKENS ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Token: $MINT_ADDRESS" -ForegroundColor Yellow
Write-Host "Tu Wallet: $OWNER_ADDRESS" -ForegroundColor Yellow
Write-Host "Cuenta de Token: $TOKEN_ACCOUNT" -ForegroundColor Yellow
Write-Host ""

Write-Host "⚠️ ADVERTENCIA:" -ForegroundColor Red
Write-Host "  - Quemar tokens es IRREVERSIBLE" -ForegroundColor Red
Write-Host "  - Los tokens se eliminarán permanentemente" -ForegroundColor Red
Write-Host "  - El token seguirá existiendo en la blockchain" -ForegroundColor Yellow
Write-Host ""

# Verificar herramientas
$solanaInstalled = Get-Command solana -ErrorAction SilentlyContinue
$splTokenInstalled = Get-Command spl-token -ErrorAction SilentlyContinue

if (-not $solanaInstalled) {
    Write-Host "❌ Solana CLI no está instalado" -ForegroundColor Red
    Write-Host "Instala desde: https://docs.solana.com/cli/install-solana-cli-tools" -ForegroundColor Yellow
    exit
}

if (-not $splTokenInstalled) {
    Write-Host "❌ SPL Token CLI no está instalado" -ForegroundColor Red
    Write-Host "Instala con: cargo install spl-token-cli" -ForegroundColor Yellow
    Write-Host "O: npm install -g @solana/spl-token" -ForegroundColor Yellow
    exit
}

Write-Host "✓ Herramientas verificadas" -ForegroundColor Green
Write-Host ""

# Verificar balance actual
Write-Host "=== VERIFICANDO BALANCE ACTUAL ===" -ForegroundColor Green
try {
    Write-Host "Ejecutando: spl-token balance $MINT_ADDRESS" -ForegroundColor Cyan
    $balanceOutput = spl-token balance $MINT_ADDRESS 2>&1
    Write-Host "Balance actual: $balanceOutput" -ForegroundColor Cyan
    
    if ($balanceOutput -match "0") {
        Write-Host "⚠️ Ya no tienes tokens para quemar" -ForegroundColor Yellow
        exit
    }
} catch {
    Write-Host "⚠️ No se pudo obtener el balance" -ForegroundColor Yellow
    Write-Host "Asegúrate de tener configurada tu clave privada:" -ForegroundColor Yellow
    Write-Host "  solana config set --keypair <ruta_clave_privada.json>" -ForegroundColor Gray
    Write-Host ""
}

Write-Host ""
Write-Host "=== INSTRUCCIONES PASO A PASO ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "PASO 1: Configurar tu clave privada (si no lo has hecho)" -ForegroundColor Yellow
Write-Host "  solana config set --keypair <ruta_a_tu_clave_privada.json>" -ForegroundColor Gray
Write-Host "  solana config set --url https://api.mainnet-beta.solana.com" -ForegroundColor Gray
Write-Host ""

Write-Host "PASO 2: Verificar tu dirección" -ForegroundColor Yellow
Write-Host "  solana address" -ForegroundColor Gray
Write-Host "  (Debe mostrar: $OWNER_ADDRESS)" -ForegroundColor Gray
Write-Host ""

Write-Host "PASO 3: Verificar balance" -ForegroundColor Yellow
Write-Host "  spl-token balance $MINT_ADDRESS" -ForegroundColor Gray
Write-Host ""

Write-Host "PASO 4: Quemar TODOS tus tokens" -ForegroundColor Yellow
Write-Host "  spl-token burn $TOKEN_ACCOUNT ALL" -ForegroundColor Cyan
Write-Host "  ⚠️ Esto es IRREVERSIBLE" -ForegroundColor Red
Write-Host ""

Write-Host "PASO 5: Verificar que se quemaron" -ForegroundColor Yellow
Write-Host "  spl-token balance $MINT_ADDRESS" -ForegroundColor Gray
Write-Host "  (Debe mostrar: 0)" -ForegroundColor Gray
Write-Host ""

Write-Host "PASO 6: Cerrar la cuenta vacía (opcional - recupera ~0.002 SOL)" -ForegroundColor Yellow
Write-Host "  spl-token close $TOKEN_ACCOUNT" -ForegroundColor Gray
Write-Host ""

Write-Host "=== COMANDOS COMPLETOS ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "# 1. Configurar (una sola vez)" -ForegroundColor Gray
Write-Host "solana config set --keypair <ruta_clave_privada.json>" -ForegroundColor Yellow
Write-Host "solana config set --url https://api.mainnet-beta.solana.com" -ForegroundColor Yellow
Write-Host ""
Write-Host "# 2. Verificar" -ForegroundColor Gray
Write-Host "solana address" -ForegroundColor Yellow
Write-Host "spl-token balance $MINT_ADDRESS" -ForegroundColor Yellow
Write-Host ""
Write-Host "# 3. Quemar todos los tokens" -ForegroundColor Gray
Write-Host "spl-token burn $TOKEN_ACCOUNT ALL" -ForegroundColor Yellow
Write-Host ""
Write-Host "# 4. Verificar" -ForegroundColor Gray
Write-Host "spl-token balance $MINT_ADDRESS" -ForegroundColor Yellow
Write-Host ""
Write-Host "# 5. Cerrar cuenta (opcional)" -ForegroundColor Gray
Write-Host "spl-token close $TOKEN_ACCOUNT" -ForegroundColor Yellow
Write-Host ""

$ejecutar = Read-Host "¿Deseas ejecutar algún comando ahora? (s/n)"
if ($ejecutar -eq "s" -or $ejecutar -eq "S") {
    Write-Host ""
    Write-Host "Opciones:" -ForegroundColor Cyan
    Write-Host "1. Ver balance actual" -ForegroundColor Green
    Write-Host "2. Ver todas tus cuentas de token" -ForegroundColor Green
    Write-Host "3. Ver información del token" -ForegroundColor Green
    Write-Host "4. QUEMAR TODOS LOS TOKENS (irreversible)" -ForegroundColor Red
    Write-Host ""
    
    $opcion = Read-Host "Selecciona una opción (1-4)"
    
    switch ($opcion) {
        "1" {
            Write-Host ""
            Write-Host "Ejecutando: spl-token balance $MINT_ADDRESS" -ForegroundColor Cyan
            spl-token balance $MINT_ADDRESS
        }
        "2" {
            Write-Host ""
            Write-Host "Ejecutando: spl-token accounts --owner $OWNER_ADDRESS" -ForegroundColor Cyan
            spl-token accounts --owner $OWNER_ADDRESS
        }
        "3" {
            Write-Host ""
            Write-Host "Ejecutando: spl-token display $MINT_ADDRESS" -ForegroundColor Cyan
            spl-token display $MINT_ADDRESS
        }
        "4" {
            Write-Host ""
            Write-Host "⚠️⚠️⚠️ ADVERTENCIA FINAL ⚠️⚠️⚠️" -ForegroundColor Red
            Write-Host "Estás a punto de QUEMAR TODOS TUS TOKENS" -ForegroundColor Red
            Write-Host "Esto es IRREVERSIBLE" -ForegroundColor Red
            Write-Host ""
            $confirmar = Read-Host "Escribe 'QUEMAR' para confirmar"
            if ($confirmar -eq "QUEMAR") {
                Write-Host ""
                Write-Host "Ejecutando: spl-token burn $TOKEN_ACCOUNT ALL" -ForegroundColor Cyan
                spl-token burn $TOKEN_ACCOUNT ALL
                Write-Host ""
                Write-Host "Verificando balance..." -ForegroundColor Cyan
                Start-Sleep -Seconds 2
                spl-token balance $MINT_ADDRESS
            } else {
                Write-Host "Operación cancelada." -ForegroundColor Yellow
            }
        }
        default {
            Write-Host "Opción no válida" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "=== RECORDATORIOS ===" -ForegroundColor Yellow
Write-Host "1. Quemar tokens es IRREVERSIBLE" -ForegroundColor Gray
Write-Host "2. El token seguirá existiendo en la blockchain" -ForegroundColor Gray
Write-Host "3. Necesitas SOL para pagar las fees (~0.000005 SOL)" -ForegroundColor Gray
Write-Host "4. Otros holders mantendrán sus tokens" -ForegroundColor Gray
