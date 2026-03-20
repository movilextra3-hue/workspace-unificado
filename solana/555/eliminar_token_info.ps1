# Información sobre "eliminar" un token en Solana
$MINT_ADDRESS = "DLyGgVVjcrsXvewd7PMr7H7FKpWiL96hymNvjZUCzeYf"
$OWNER_ADDRESS = "J3RX9CBrwB7vZmwNytRsJkJA9Wq7y6kwP25AZsX34TJa"

Write-Host "=== INFORMACIÓN: ELIMINAR TOKEN EN SOLANA ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️ IMPORTANTE: En Solana NO puedes 'eliminar' un token completamente" -ForegroundColor Red
Write-Host "   El token siempre existirá en la blockchain (es permanente)" -ForegroundColor Yellow
Write-Host ""

Write-Host "=== LO QUE SÍ PUEDES HACER ===" -ForegroundColor Green
Write-Host ""

Write-Host "1. QUEMAR (BURN) TUS PROPIOS TOKENS" -ForegroundColor Yellow
Write-Host "   - Puedes quemar los tokens que tienes en tu wallet" -ForegroundColor Gray
Write-Host "   - Tienes: 50,565.810654 tokens" -ForegroundColor Cyan
Write-Host "   - Esto los elimina de tu wallet y reduce el supply" -ForegroundColor Gray
Write-Host "   - Comando: spl-token burn <cuenta_token> <cantidad>" -ForegroundColor Gray
Write-Host ""

Write-Host "2. CERRAR CUENTAS DE TOKEN" -ForegroundColor Yellow
Write-Host "   - Puedes cerrar tus cuentas de token vacías" -ForegroundColor Gray
Write-Host "   - Esto recupera el SOL usado para rent (~0.002 SOL por cuenta)" -ForegroundColor Gray
Write-Host "   - Comando: spl-token close <cuenta_token>" -ForegroundColor Gray
Write-Host ""

Write-Host "3. NO PUEDES ELIMINAR:" -ForegroundColor Red
Write-Host "   - El Mint Address (siempre existirá en la blockchain)" -ForegroundColor Red
Write-Host "   - Los tokens de otros holders (302 millones en circulación)" -ForegroundColor Red
Write-Host "   - El registro del token en la blockchain" -ForegroundColor Red
Write-Host ""

Write-Host "=== VERIFICANDO ESTADO ACTUAL ===" -ForegroundColor Cyan
Write-Host ""

try {
    # Verificar supply
    $supplyBody = @{
        jsonrpc = "2.0"
        id = 1
        method = "getTokenSupply"
        params = @($MINT_ADDRESS)
    } | ConvertTo-Json
    
    $supplyResponse = Invoke-RestMethod -Uri "https://api.mainnet-beta.solana.com" -Method POST -Headers @{ "Content-Type" = "application/json" } -Body $supplyBody
    
    if ($supplyResponse.result) {
        $supply = $supplyResponse.result.value.uiAmount
        Write-Host "Supply en circulación: $supply tokens" -ForegroundColor Cyan
        Write-Host "  (Estos tokens están en diferentes wallets)" -ForegroundColor Gray
    }
    
    # Verificar tokens del owner
    $tokensBody = @{
        jsonrpc = "2.0"
        id = 1
        method = "getTokenAccountsByOwner"
        params = @($OWNER_ADDRESS, @{ mint = $MINT_ADDRESS }, @{ encoding = "jsonParsed" })
    } | ConvertTo-Json
    
    $tokensResponse = Invoke-RestMethod -Uri "https://api.mainnet-beta.solana.com" -Method POST -Headers @{ "Content-Type" = "application/json" } -Body $tokensBody
    
    if ($tokensResponse.result -and $tokensResponse.result.value) {
        Write-Host ""
        Write-Host "Tus tokens:" -ForegroundColor Cyan
        foreach ($account in $tokensResponse.result.value) {
            $amount = $account.account.data.parsed.info.tokenAmount.uiAmount
            $accountAddress = $account.pubkey
            Write-Host "  Cuenta: $accountAddress" -ForegroundColor Gray
            Write-Host "  Cantidad: $amount tokens" -ForegroundColor Green
            Write-Host "  Puedes quemar estos tokens" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "Error al obtener información: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== OPCIONES DISPONIBLES ===" -ForegroundColor Green
Write-Host ""

Write-Host "OPCIÓN 1: Quemar todos tus tokens" -ForegroundColor Yellow
Write-Host "  - Elimina tus 50,565 tokens del supply" -ForegroundColor Gray
Write-Host "  - El token seguirá existiendo" -ForegroundColor Gray
Write-Host "  - Otros holders mantendrán sus tokens" -ForegroundColor Gray
Write-Host ""

Write-Host "OPCIÓN 2: Cerrar tus cuentas de token" -ForegroundColor Yellow
Write-Host "  - Recupera SOL usado para rent" -ForegroundColor Gray
Write-Host "  - Solo si las cuentas están vacías" -ForegroundColor Gray
Write-Host ""

Write-Host "OPCIÓN 3: Ignorar el token" -ForegroundColor Yellow
Write-Host "  - Simplemente no lo uses más" -ForegroundColor Gray
Write-Host "  - El token seguirá existiendo pero no lo afecta" -ForegroundColor Gray
Write-Host ""

Write-Host "=== COMANDOS PARA QUEMAR TUS TOKENS ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Ver tus cuentas de token:" -ForegroundColor Yellow
Write-Host "   spl-token accounts --owner $OWNER_ADDRESS" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Quemar todos tus tokens:" -ForegroundColor Yellow
Write-Host "   spl-token burn <cuenta_token> ALL" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Quemar cantidad específica:" -ForegroundColor Yellow
Write-Host "   spl-token burn <cuenta_token> <cantidad>" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Cerrar cuenta vacía (después de quemar):" -ForegroundColor Yellow
Write-Host "   spl-token close <cuenta_token>" -ForegroundColor Gray
Write-Host ""

Write-Host "=== ADVERTENCIAS ===" -ForegroundColor Red
Write-Host ""
Write-Host "⚠️ Quemar tokens es IRREVERSIBLE" -ForegroundColor Red
Write-Host "⚠️ El Mint Address siempre existirá en la blockchain" -ForegroundColor Yellow
Write-Host "⚠️ No puedes eliminar tokens de otros holders" -ForegroundColor Yellow
Write-Host "⚠️ El token seguirá visible en exploradores" -ForegroundColor Yellow
Write-Host ""

$opcion = Read-Host "¿Quieres ver los comandos específicos para quemar tus tokens? (s/n)"
if ($opcion -eq "s" -or $opcion -eq "S") {
    Write-Host ""
    Write-Host "=== PROCESO PASO A PASO ===" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "PASO 1: Configurar tu clave privada" -ForegroundColor Yellow
    Write-Host "  solana config set --keypair <ruta_a_tu_clave_privada.json>" -ForegroundColor Gray
    Write-Host ""
    Write-Host "PASO 2: Verificar tu dirección" -ForegroundColor Yellow
    Write-Host "  solana address" -ForegroundColor Gray
    Write-Host "  (Debe mostrar: $OWNER_ADDRESS)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "PASO 3: Ver tus cuentas de token" -ForegroundColor Yellow
    Write-Host "  spl-token accounts --owner $OWNER_ADDRESS" -ForegroundColor Gray
    Write-Host "  (Anota la dirección de la cuenta que tiene tokens)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "PASO 4: Quemar todos tus tokens" -ForegroundColor Yellow
    Write-Host "  spl-token burn <cuenta_token> ALL" -ForegroundColor Gray
    Write-Host "  (Reemplaza <cuenta_token> con la dirección del PASO 3)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "PASO 5: Verificar que se quemaron" -ForegroundColor Yellow
    Write-Host "  spl-token balance $MINT_ADDRESS" -ForegroundColor Gray
    Write-Host "  (Debe mostrar: 0)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "PASO 6: Cerrar la cuenta vacía (opcional)" -ForegroundColor Yellow
    Write-Host "  spl-token close <cuenta_token>" -ForegroundColor Gray
    Write-Host "  (Esto recupera ~0.002 SOL de rent)" -ForegroundColor Gray
}
