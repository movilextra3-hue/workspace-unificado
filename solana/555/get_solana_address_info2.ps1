# Script completo para obtener toda la información de una dirección Solana
$address = "3tTW7tvfNEKX6oVUpKdEE4YkTLVvTj4NfEngy3c9Ws9zpjwvwCawwwNyCiWg9roWSbmbmLa1exev3gyne4esnCDz"
$outputFile = "C:\Users\Administrador\Desktop\solana_address_info2_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"
$outputTxt = "C:\Users\Administrador\Desktop\solana_address_info2_$(Get-Date -Format 'yyyyMMdd_HHmmss').txt"

Write-Host "=== Obteniendo información completa de dirección Solana ===" -ForegroundColor Cyan
Write-Host "Dirección: $address" -ForegroundColor Yellow
Write-Host ""

# Función para hacer peticiones HTTP
function Invoke-SolanaAPI {
    param(
        [string]$Url,
        [string]$Method = "GET",
        [object]$Body = $null
    )
    
    try {
        $headers = @{
            "Content-Type" = "application/json"
        }
        
        if ($Body) {
            $jsonBody = $Body | ConvertTo-Json -Depth 10
            $response = Invoke-RestMethod -Uri $Url -Method $Method -Headers $headers -Body $jsonBody -ErrorAction Stop
        } else {
            $response = Invoke-RestMethod -Uri $Url -Method $Method -Headers $headers -ErrorAction Stop
        }
        
        return $response
    } catch {
        Write-Host "Error al obtener datos: $_" -ForegroundColor Red
        return $null
    }
}

$allInfo = @{
    address = $address
    timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    data = @{}
}

Write-Host "1. Obteniendo balance..." -ForegroundColor Green
try {
    $balanceUrl = "https://api.mainnet-beta.solana.com"
    $balanceBody = @{
        jsonrpc = "2.0"
        id = 1
        method = "getBalance"
        params = @($address)
    }
    $balanceResponse = Invoke-SolanaAPI -Url $balanceUrl -Method "POST" -Body $balanceBody
    if ($balanceResponse -and $balanceResponse.result) {
        $balanceSOL = [math]::Round($balanceResponse.result.value / 1000000000, 9)
        $allInfo.data.balance = @{
            lamports = $balanceResponse.result.value
            sol = $balanceSOL
        }
        Write-Host "   Balance: $balanceSOL SOL ($($balanceResponse.result.value) lamports)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "   Error obteniendo balance" -ForegroundColor Red
}

Write-Host "2. Obteniendo información de la cuenta..." -ForegroundColor Green
try {
    $accountUrl = "https://api.mainnet-beta.solana.com"
    $accountBody = @{
        jsonrpc = "2.0"
        id = 1
        method = "getAccountInfo"
        params = @($address, @{ encoding = "jsonParsed" })
    }
    $accountResponse = Invoke-SolanaAPI -Url $accountUrl -Method "POST" -Body $accountBody
    if ($accountResponse -and $accountResponse.result -and $accountResponse.result.value) {
        $accountData = $accountResponse.result.value
        $allInfo.data.accountInfo = @{
            executable = $accountData.executable
            owner = $accountData.owner
            lamports = $accountData.lamports
            rentEpoch = $accountData.rentEpoch
            data = $accountData.data
        }
        Write-Host "   Owner: $($accountData.owner)" -ForegroundColor Cyan
        Write-Host "   Executable: $($accountData.executable)" -ForegroundColor Cyan
        Write-Host "   Rent Epoch: $($accountData.rentEpoch)" -ForegroundColor Cyan
        
        # Información adicional si es un token
        if ($accountData.data -and $accountData.data.parsed) {
            $parsed = $accountData.data.parsed
            Write-Host "   Tipo: $($parsed.type)" -ForegroundColor Cyan
            if ($parsed.info) {
                if ($parsed.info.mint) {
                    Write-Host "   Mint: $($parsed.info.mint)" -ForegroundColor Cyan
                }
                if ($parsed.info.supply) {
                    Write-Host "   Supply: $($parsed.info.supply)" -ForegroundColor Cyan
                }
                if ($parsed.info.decimals) {
                    Write-Host "   Decimals: $($parsed.info.decimals)" -ForegroundColor Cyan
                }
            }
        }
    } else {
        Write-Host "   Cuenta no encontrada o sin datos" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   Error obteniendo información de cuenta" -ForegroundColor Red
}

Write-Host "3. Obteniendo tokens asociados..." -ForegroundColor Green
try {
    $tokensUrl = "https://api.mainnet-beta.solana.com"
    $tokensBody = @{
        jsonrpc = "2.0"
        id = 1
        method = "getTokenAccountsByOwner"
        params = @($address, @{ programId = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" }, @{ encoding = "jsonParsed" })
    }
    $tokensResponse = Invoke-SolanaAPI -Url $tokensUrl -Method "POST" -Body $tokensBody
    if ($tokensResponse -and $tokensResponse.result -and $tokensResponse.result.value) {
        $tokens = @()
        foreach ($tokenAccount in $tokensResponse.result.value) {
            $tokenData = $tokenAccount.account.data.parsed.info
            $mint = $tokenData.mint
            $amount = $tokenData.tokenAmount.uiAmount
            $decimals = $tokenData.tokenAmount.decimals
            $tokens += @{
                account = $tokenAccount.pubkey
                mint = $mint
                amount = $amount
                decimals = $decimals
            }
        }
        $allInfo.data.tokens = $tokens
        Write-Host "   Tokens encontrados: $($tokens.Count)" -ForegroundColor Cyan
        foreach ($token in $tokens) {
            Write-Host "     - Mint: $($token.mint)" -ForegroundColor Gray
            Write-Host "       Amount: $($token.amount)" -ForegroundColor Gray
        }
    } else {
        Write-Host "   No se encontraron tokens" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   Error obteniendo tokens" -ForegroundColor Red
}

Write-Host "4. Obteniendo transacciones recientes..." -ForegroundColor Green
try {
    $signaturesUrl = "https://api.mainnet-beta.solana.com"
    $signaturesBody = @{
        jsonrpc = "2.0"
        id = 1
        method = "getSignaturesForAddress"
        params = @($address, @{ limit = 20 })
    }
    $signaturesResponse = Invoke-SolanaAPI -Url $signaturesUrl -Method "POST" -Body $signaturesBody
    if ($signaturesResponse -and $signaturesResponse.result) {
        $transactions = @()
        foreach ($sig in $signaturesResponse.result) {
            $transactions += @{
                signature = $sig.signature
                slot = $sig.slot
                err = $sig.err
                memo = $sig.memo
                blockTime = if ($sig.blockTime) { [DateTimeOffset]::FromUnixTimeSeconds($sig.blockTime).DateTime } else { $null }
            }
        }
        $allInfo.data.recentTransactions = $transactions
        Write-Host "   Transacciones encontradas: $($transactions.Count)" -ForegroundColor Cyan
    } else {
        Write-Host "   No se encontraron transacciones" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   Error obteniendo transacciones" -ForegroundColor Red
}

Write-Host "5. Verificando si es un programa..." -ForegroundColor Green
try {
    $programUrl = "https://api.mainnet-beta.solana.com"
    $programBody = @{
        jsonrpc = "2.0"
        id = 1
        method = "getAccountInfo"
        params = @($address)
    }
    $programResponse = Invoke-SolanaAPI -Url $programUrl -Method "POST" -Body $programBody
    if ($programResponse -and $programResponse.result -and $programResponse.result.value) {
        if ($programResponse.result.value.executable) {
            $allInfo.data.isProgram = $true
            $allInfo.data.programInfo = @{
                executable = $true
                owner = $programResponse.result.value.owner
                dataLength = $programResponse.result.value.data.Length
            }
            Write-Host "   Es un programa ejecutable" -ForegroundColor Cyan
            Write-Host "   Owner: $($programResponse.result.value.owner)" -ForegroundColor Cyan
        } else {
            $allInfo.data.isProgram = $false
            Write-Host "   No es un programa ejecutable" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "   Error verificando programa" -ForegroundColor Red
}

Write-Host "6. Obteniendo información de Solana Explorer..." -ForegroundColor Green
$allInfo.data.explorerLinks = @{
    solanaExplorer = "https://explorer.solana.com/address/$address"
    solscan = "https://solscan.io/account/$address"
    solanaBeach = "https://solanabeach.io/address/$address"
}

Write-Host ""
Write-Host "=== Información obtenida ===" -ForegroundColor Green

# Guardar en JSON
$allInfo | ConvertTo-Json -Depth 10 | Out-File $outputFile -Encoding UTF8
Write-Host "Datos guardados en JSON: $outputFile" -ForegroundColor Cyan

# Crear reporte en texto
$report = @"
=== INFORMACIÓN COMPLETA DE DIRECCIÓN SOLANA ===
Fecha: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
Dirección: $address

--- BALANCE ---
$($allInfo.data.balance | ConvertTo-Json -Depth 5)

--- INFORMACIÓN DE CUENTA ---
$($allInfo.data.accountInfo | ConvertTo-Json -Depth 5)

--- TOKENS ASOCIADOS ---
$($allInfo.data.tokens | ConvertTo-Json -Depth 5)

--- TRANSACCIONES RECIENTES ---
$($allInfo.data.recentTransactions | ConvertTo-Json -Depth 5)

--- INFORMACIÓN DE PROGRAMA ---
$($allInfo.data.programInfo | ConvertTo-Json -Depth 5)

--- ENLACES ÚTILES ---
Solana Explorer: $($allInfo.data.explorerLinks.solanaExplorer)
Solscan: $($allInfo.data.explorerLinks.solscan)
Solana Beach: $($allInfo.data.explorerLinks.solanaBeach)

--- DATOS COMPLETOS (JSON) ---
Ver archivo: $outputFile
"@

$report | Out-File $outputTxt -Encoding UTF8
Write-Host "Reporte guardado en texto: $outputTxt" -ForegroundColor Cyan

Write-Host ""
Write-Host "=== RESUMEN ===" -ForegroundColor Yellow
if ($allInfo.data.balance) {
    Write-Host "Balance: $($allInfo.data.balance.sol) SOL" -ForegroundColor Green
}
if ($allInfo.data.tokens) {
    Write-Host "Tokens: $($allInfo.data.tokens.Count)" -ForegroundColor Green
}
if ($allInfo.data.recentTransactions) {
    Write-Host "Transacciones recientes: $($allInfo.data.recentTransactions.Count)" -ForegroundColor Green
}
if ($allInfo.data.isProgram) {
    Write-Host "Tipo: Programa ejecutable" -ForegroundColor Green
} else {
    Write-Host "Tipo: Cuenta/Wallet" -ForegroundColor Green
}

Write-Host ""
Write-Host "Ver información detallada en:" -ForegroundColor Cyan
Write-Host "  - $outputFile" -ForegroundColor Gray
Write-Host "  - $outputTxt" -ForegroundColor Gray
