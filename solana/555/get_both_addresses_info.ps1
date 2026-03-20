# Obtener información de ambas direcciones
$address1 = "3tTW7tvfNEKX6oVUpKdEE4YkTLVvTj4NfEngy3c9Ws9z"
$address2 = "pjwvwCawwwNyCiWg9roWSbmbmLa1exev3gyne4esnCDz"
$fullString = "3tTW7tvfNEKX6oVUpKdEE4YkTLVvTj4NfEngy3c9Ws9zpjwvwCawwwNyCiWg9roWSbmbmLa1exev3gyne4esnCDz"

Write-Host "=== ANÁLISIS COMPLETO DE LA CADENA ===" -ForegroundColor Cyan
Write-Host "Cadena completa (88 caracteres): $fullString" -ForegroundColor Yellow
Write-Host ""
Write-Host "División:" -ForegroundColor Green
Write-Host "  Dirección 1: $address1" -ForegroundColor Cyan
Write-Host "  Dirección 2: $address2" -ForegroundColor Cyan
Write-Host ""

function Get-AddressInfo {
    param([string]$address, [string]$label)
    
    Write-Host "=== $label ===" -ForegroundColor Yellow
    Write-Host "Dirección: $address" -ForegroundColor Cyan
    
    try {
        # Balance
        $balanceBody = @{
            jsonrpc = "2.0"
            id = 1
            method = "getBalance"
            params = @($address)
        } | ConvertTo-Json
        
        $balanceResponse = Invoke-RestMethod -Uri "https://api.mainnet-beta.solana.com" -Method POST -Headers @{ "Content-Type" = "application/json" } -Body $balanceBody
        
        if ($balanceResponse.result) {
            $balanceSOL = [math]::Round($balanceResponse.result.value / 1000000000, 9)
            Write-Host "  Balance: $balanceSOL SOL ($($balanceResponse.result.value) lamports)" -ForegroundColor Green
        }
        
        # Account Info
        $accountBody = @{
            jsonrpc = "2.0"
            id = 1
            method = "getAccountInfo"
            params = @($address, @{ encoding = "jsonParsed" })
        } | ConvertTo-Json
        
        $accountResponse = Invoke-RestMethod -Uri "https://api.mainnet-beta.solana.com" -Method POST -Headers @{ "Content-Type" = "application/json" } -Body $accountBody
        
        if ($accountResponse.result -and $accountResponse.result.value) {
            $acc = $accountResponse.result.value
            Write-Host "  Owner: $($acc.owner)" -ForegroundColor Cyan
            Write-Host "  Executable: $($acc.executable)" -ForegroundColor Cyan
            Write-Host "  Lamports: $($acc.lamports)" -ForegroundColor Cyan
            
            if ($acc.data -and $acc.data.parsed) {
                Write-Host "  Tipo: $($acc.data.parsed.type)" -ForegroundColor Cyan
                if ($acc.data.parsed.info) {
                    $info = $acc.data.parsed.info
                    if ($info.mint) { Write-Host "  Mint: $($info.mint)" -ForegroundColor Cyan }
                    if ($info.supply) { Write-Host "  Supply: $($info.supply)" -ForegroundColor Cyan }
                    if ($info.decimals) { Write-Host "  Decimals: $($info.decimals)" -ForegroundColor Cyan }
                }
            }
        } else {
            Write-Host "  Estado: Cuenta no encontrada o sin datos" -ForegroundColor Yellow
        }
        
        # Transacciones
        $txBody = @{
            jsonrpc = "2.0"
            id = 1
            method = "getSignaturesForAddress"
            params = @($address, @{ limit = 5 })
        } | ConvertTo-Json
        
        $txResponse = Invoke-RestMethod -Uri "https://api.mainnet-beta.solana.com" -Method POST -Headers @{ "Content-Type" = "application/json" } -Body $txBody
        
        if ($txResponse.result -and $txResponse.result.Count -gt 0) {
            Write-Host "  Transacciones: $($txResponse.result.Count) encontradas" -ForegroundColor Green
        } else {
            Write-Host "  Transacciones: Ninguna" -ForegroundColor Gray
        }
        
    } catch {
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host ""
}

Get-AddressInfo -address $address1 -label "DIRECCIÓN 1"
Get-AddressInfo -address $address2 -label "DIRECCIÓN 2"

Write-Host "=== ENLACES ===" -ForegroundColor Cyan
Write-Host "Dirección 1:" -ForegroundColor Yellow
Write-Host "  Explorer: https://explorer.solana.com/address/$address1" -ForegroundColor Gray
Write-Host "  Solscan: https://solscan.io/account/$address1" -ForegroundColor Gray
Write-Host ""
Write-Host "Dirección 2:" -ForegroundColor Yellow
Write-Host "  Explorer: https://explorer.solana.com/address/$address2" -ForegroundColor Gray
Write-Host "  Solscan: https://solscan.io/account/$address2" -ForegroundColor Gray
Write-Host ""

Write-Host "=== CONCLUSIÓN ===" -ForegroundColor Yellow
Write-Host "La cadena de 88 caracteres puede ser:" -ForegroundColor Cyan
Write-Host "  1. Dos direcciones concatenadas" -ForegroundColor Gray
Write-Host "  2. Una clave privada de Solana (88 caracteres Base58)" -ForegroundColor Gray
Write-Host ""
Write-Host "⚠️ Si es una clave privada, NO la compartas públicamente" -ForegroundColor Red
