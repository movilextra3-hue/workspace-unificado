# Script para administrar el Token SPL
# Token: DLyGgVVjcrsXvewd7PMr7H7FKpWiL96hymNvjZUCzeYf

$MINT_ADDRESS = "DLyGgVVjcrsXvewd7PMr7H7FKpWiL96hymNvjZUCzeYf"
$OWNER_ADDRESS = "J3RX9CBrwB7vZmwNytRsJkJA9Wq7y6kwP25AZsX34TJa"

Write-Host "=== ADMINISTRACIÓN DE TOKEN SPL ===" -ForegroundColor Cyan
Write-Host "Mint Address: $MINT_ADDRESS" -ForegroundColor Yellow
Write-Host "Owner Address: $OWNER_ADDRESS" -ForegroundColor Yellow
Write-Host ""

function Get-TokenInfo {
    Write-Host "=== INFORMACIÓN DEL TOKEN ===" -ForegroundColor Green
    
    try {
        # Obtener información del mint
        $body = @{
            jsonrpc = "2.0"
            id = 1
            method = "getAccountInfo"
            params = @($MINT_ADDRESS, @{ encoding = "jsonParsed" })
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "https://api.mainnet-beta.solana.com" -Method POST -Headers @{ "Content-Type" = "application/json" } -Body $body
        
        if ($response.result -and $response.result.value) {
            $mintInfo = $response.result.value.data.parsed.info
            Write-Host "Supply Total: $($mintInfo.supply)" -ForegroundColor Cyan
            Write-Host "Decimals: $($mintInfo.decimals)" -ForegroundColor Cyan
            Write-Host "Mint Authority: $(if ($mintInfo.mintAuthority) { $mintInfo.mintAuthority } else { 'Ninguna (irreversible)' })" -ForegroundColor Cyan
            Write-Host "Freeze Authority: $(if ($mintInfo.freezeAuthority) { $mintInfo.freezeAuthority } else { 'Ninguna' })" -ForegroundColor Cyan
            Write-Host "Is Initialized: $($mintInfo.isInitialized)" -ForegroundColor Cyan
        }
    } catch {
        Write-Host "Error: $_" -ForegroundColor Red
    }
}

function Get-TokenSupply {
    Write-Host "=== SUPPLY ACTUAL DEL TOKEN ===" -ForegroundColor Green
    
    try {
        $body = @{
            jsonrpc = "2.0"
            id = 1
            method = "getTokenSupply"
            params = @($MINT_ADDRESS)
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "https://api.mainnet-beta.solana.com" -Method POST -Headers @{ "Content-Type" = "application/json" } -Body $body
        
        if ($response.result -and $response.result.value) {
            $supply = $response.result.value.uiAmount
            $decimals = $response.result.value.decimals
            Write-Host "Supply en circulación: $supply tokens" -ForegroundColor Cyan
            Write-Host "Decimals: $decimals" -ForegroundColor Cyan
        }
    } catch {
        Write-Host "Error: $_" -ForegroundColor Red
    }
}

function Get-OwnerTokens {
    Write-Host "=== TOKENS DEL OWNER ===" -ForegroundColor Green
    
    try {
        $body = @{
            jsonrpc = "2.0"
            id = 1
            method = "getTokenAccountsByOwner"
            params = @($OWNER_ADDRESS, @{ mint = $MINT_ADDRESS }, @{ encoding = "jsonParsed" })
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "https://api.mainnet-beta.solana.com" -Method POST -Headers @{ "Content-Type" = "application/json" } -Body $body
        
        if ($response.result -and $response.result.value) {
            foreach ($account in $response.result.value) {
                $amount = $account.account.data.parsed.info.tokenAmount.uiAmount
                $accountAddress = $account.pubkey
                Write-Host "Cuenta: $accountAddress" -ForegroundColor Cyan
                Write-Host "  Cantidad: $amount tokens" -ForegroundColor Gray
            }
        } else {
            Write-Host "No se encontraron cuentas de token" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "Error: $_" -ForegroundColor Red
    }
}

function Get-TokenHolders {
    Write-Host "=== BÚSQUEDA DE HOLDERS ===" -ForegroundColor Green
    Write-Host "NOTA: Esta función requiere usar la CLI de Solana o APIs especializadas" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Comandos sugeridos:" -ForegroundColor Cyan
    Write-Host "  # Usando Solana CLI" -ForegroundColor Gray
    Write-Host "  solana account $MINT_ADDRESS" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  # Usando SPL Token CLI" -ForegroundColor Gray
    Write-Host "  spl-token display $MINT_ADDRESS" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  # Ver todas las cuentas de este token" -ForegroundColor Gray
    Write-Host "  spl-token accounts $MINT_ADDRESS --output json" -ForegroundColor Gray
}

function Show-TransferCommands {
    Write-Host "=== COMANDOS PARA TRANSFERIR TOKENS ===" -ForegroundColor Green
    Write-Host ""
    Write-Host "1. Transferir tokens SPL:" -ForegroundColor Cyan
    Write-Host "   spl-token transfer $MINT_ADDRESS <cantidad> <direccion_destino> --owner <ruta_clave_privada>" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Transferir todos los tokens:" -ForegroundColor Cyan
    Write-Host "   spl-token transfer $MINT_ADDRESS ALL <direccion_destino> --owner <ruta_clave_privada)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Transferir con decimales específicos:" -ForegroundColor Cyan
    Write-Host "   spl-token transfer $MINT_ADDRESS <cantidad> <destino> --decimals 6 --owner <ruta_clave_privada>" -ForegroundColor Gray
}

function Show-MintBurnCommands {
    Write-Host "=== COMANDOS PARA MINT/BURN (si tienes autoridad) ===" -ForegroundColor Green
    Write-Host ""
    Write-Host "NOTA: Tu token NO tiene Mint Authority (irreversible)" -ForegroundColor Yellow
    Write-Host "Por lo tanto, NO puedes crear nuevos tokens ni quemar tokens existentes" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Si tuvieras Mint Authority, los comandos serían:" -ForegroundColor Cyan
    Write-Host "  # Crear nuevos tokens" -ForegroundColor Gray
    Write-Host "  spl-token mint $MINT_ADDRESS <cantidad> --owner <ruta_clave_privada>" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  # Quemar tokens" -ForegroundColor Gray
    Write-Host "  spl-token burn <cuenta_token> <cantidad> --owner <ruta_clave_privada>" -ForegroundColor Gray
}

function Show-FreezeCommands {
    Write-Host "=== COMANDOS PARA FREEZE/UNFREEZE (si tienes autoridad) ===" -ForegroundColor Green
    Write-Host ""
    Write-Host "NOTA: Tu token NO tiene Freeze Authority" -ForegroundColor Yellow
    Write-Host "Por lo tanto, NO puedes congelar/descongelar cuentas" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Si tuvieras Freeze Authority, los comandos serían:" -ForegroundColor Cyan
    Write-Host "  # Congelar cuenta" -ForegroundColor Gray
    Write-Host "  spl-token freeze <cuenta_token> --owner <ruta_clave_privada>" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  # Descongelar cuenta" -ForegroundColor Gray
    Write-Host "  spl-token thaw <cuenta_token> --owner <ruta_clave_privada>" -ForegroundColor Gray
}

# Menú principal
Write-Host "=== MENÚ DE ADMINISTRACIÓN ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Ver información del token" -ForegroundColor Green
Write-Host "2. Ver supply actual" -ForegroundColor Green
Write-Host "3. Ver tokens del owner" -ForegroundColor Green
Write-Host "4. Ver comandos para transferir" -ForegroundColor Green
Write-Host "5. Ver comandos para mint/burn" -ForegroundColor Green
Write-Host "6. Ver comandos para freeze/unfreeze" -ForegroundColor Green
Write-Host "7. Ver información de holders" -ForegroundColor Green
Write-Host "8. Ver todo" -ForegroundColor Green
Write-Host ""

$opcion = Read-Host "Selecciona una opción (1-8)"

switch ($opcion) {
    "1" { Get-TokenInfo }
    "2" { Get-TokenSupply }
    "3" { Get-OwnerTokens }
    "4" { Show-TransferCommands }
    "5" { Show-MintBurnCommands }
    "6" { Show-FreezeCommands }
    "7" { Get-TokenHolders }
    "8" {
        Get-TokenInfo
        Write-Host ""
        Get-TokenSupply
        Write-Host ""
        Get-OwnerTokens
        Write-Host ""
        Show-TransferCommands
        Write-Host ""
        Show-MintBurnCommands
        Write-Host ""
        Show-FreezeCommands
    }
    default {
        Write-Host "Opción no válida" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== ENLACES ÚTILES ===" -ForegroundColor Cyan
Write-Host "Explorer: https://explorer.solana.com/address/$MINT_ADDRESS" -ForegroundColor Yellow
Write-Host "Solscan: https://solscan.io/token/$MINT_ADDRESS" -ForegroundColor Yellow
