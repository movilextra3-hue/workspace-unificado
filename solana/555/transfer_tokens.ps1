# Script para transferir tokens SPL
# ⚠️ Requiere tener Solana CLI y SPL Token CLI instalados

$MINT_ADDRESS = "DLyGgVVjcrsXvewd7PMr7H7FKpWiL96hymNvjZUCzeYf"
$OWNER_ADDRESS = "J3RX9CBrwB7vZmwNytRsJkJA9Wq7y6kwP25AZsX34TJa"

Write-Host "=== TRANSFERENCIA DE TOKENS SPL ===" -ForegroundColor Cyan
Write-Host "Token: $MINT_ADDRESS" -ForegroundColor Yellow
Write-Host "Owner: $OWNER_ADDRESS" -ForegroundColor Yellow
Write-Host ""

# Verificar que Solana CLI está instalado
$solanaInstalled = Get-Command solana -ErrorAction SilentlyContinue
$splTokenInstalled = Get-Command spl-token -ErrorAction SilentlyContinue

if (-not $solanaInstalled) {
    Write-Host "⚠️ Solana CLI no está instalado" -ForegroundColor Red
    Write-Host "Instala desde: https://docs.solana.com/cli/install-solana-cli-tools" -ForegroundColor Yellow
    exit
}

if (-not $splTokenInstalled) {
    Write-Host "⚠️ SPL Token CLI no está instalado" -ForegroundColor Red
    Write-Host "Instala con: cargo install spl-token-cli" -ForegroundColor Yellow
    Write-Host "O: npm install -g @solana/spl-token" -ForegroundColor Yellow
    exit
}

Write-Host "✓ Herramientas verificadas" -ForegroundColor Green
Write-Host ""

# Verificar balance actual
Write-Host "=== VERIFICANDO BALANCE ACTUAL ===" -ForegroundColor Green
try {
    $balanceOutput = spl-token balance $MINT_ADDRESS --owner $OWNER_ADDRESS 2>&1
    Write-Host "Balance: $balanceOutput" -ForegroundColor Cyan
} catch {
    Write-Host "No se pudo obtener el balance. Asegúrate de tener configurada la clave privada." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== INSTRUCCIONES PARA TRANSFERIR ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Configura tu clave privada:" -ForegroundColor Yellow
Write-Host "   solana config set --keypair <ruta_a_tu_clave_privada.json>" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Verifica tu dirección:" -ForegroundColor Yellow
Write-Host "   solana address" -ForegroundColor Gray
Write-Host "   (Debe mostrar: $OWNER_ADDRESS)" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Verifica tu balance:" -ForegroundColor Yellow
Write-Host "   spl-token balance $MINT_ADDRESS" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Transfiere tokens:" -ForegroundColor Yellow
Write-Host "   spl-token transfer $MINT_ADDRESS <cantidad> <direccion_destino>" -ForegroundColor Gray
Write-Host ""
Write-Host "   Ejemplo:" -ForegroundColor Cyan
Write-Host "   spl-token transfer $MINT_ADDRESS 1000 <direccion_destino>" -ForegroundColor Gray
Write-Host ""
Write-Host "   NOTA: El token tiene 6 decimales" -ForegroundColor Yellow
Write-Host "   - 1 token = 1,000,000 unidades mínimas" -ForegroundColor Gray
Write-Host "   - 1000 tokens = 1,000,000,000 unidades mínimas" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Transferir todos los tokens:" -ForegroundColor Yellow
Write-Host "   spl-token transfer $MINT_ADDRESS ALL <direccion_destino>" -ForegroundColor Gray
Write-Host ""
Write-Host "6. Verificar transacción:" -ForegroundColor Yellow
Write-Host "   solana confirm <signature>" -ForegroundColor Gray
Write-Host ""

$continuar = Read-Host "¿Deseas ejecutar algún comando ahora? (s/n)"
if ($continuar -eq "s" -or $continuar -eq "S") {
    Write-Host ""
    Write-Host "Opciones:" -ForegroundColor Cyan
    Write-Host "1. Ver balance" -ForegroundColor Green
    Write-Host "2. Ver todas las cuentas de token" -ForegroundColor Green
    Write-Host "3. Ver información del token" -ForegroundColor Green
    Write-Host ""
    
    $opcion = Read-Host "Selecciona una opción (1-3)"
    
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
        default {
            Write-Host "Opción no válida" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "=== RECORDATORIOS ===" -ForegroundColor Yellow
Write-Host "1. Siempre verifica la dirección de destino antes de transferir" -ForegroundColor Gray
Write-Host "2. Asegúrate de tener suficiente SOL para pagar las fees" -ForegroundColor Gray
Write-Host "3. Las transferencias son irreversibles" -ForegroundColor Gray
Write-Host "4. Guarda siempre el signature de la transacción" -ForegroundColor Gray
