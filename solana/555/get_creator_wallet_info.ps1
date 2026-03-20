# Información completa de la wallet creadora del token
$address = "J3RX9CBrwB7vZmwNytRsJkJA9Wq7y6kwP25AZsX34TJa"
$outputFile = "C:\Users\Administrador\Desktop\creator_wallet_info_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"
$outputTxt = "C:\Users\Administrador\Desktop\creator_wallet_info_$(Get-Date -Format 'yyyyMMdd_HHmmss').txt"

Write-Host "=== INFORMACIÓN COMPLETA DE WALLET CREADORA ===" -ForegroundColor Cyan
Write-Host "Dirección: $address" -ForegroundColor Yellow
Write-Host "Esta es la wallet que creó el token SPL" -ForegroundColor Gray
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
        Write-Host "Error: $_" -ForegroundColor Red
        return $null
    }
}

$allInfo = @{
    address = $address
    timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    role = "Creador del Token SPL"
    tokenCreated = "DLyGgVVjcrsXvewd7PMr7H7FKpWiL96hymNvjZUCzeYf"
    data = @{}
}

Write-Host "1. Obteniendo balance SOL..." -ForegroundColor Green
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
        }
        Write-Host "   Owner: $($accountData.owner)" -ForegroundColor Cyan
        Write-Host "   Executable: $($accountData.executable)" -ForegroundColor Cyan
        Write-Host "   Rent Epoch: $($accountData.rentEpoch)" -ForegroundColor Cyan
    } else {
        Write-Host "   Cuenta no encontrada o sin datos" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   Error obteniendo información de cuenta" -ForegroundColor Red
}

Write-Host "3. Obteniendo tokens SPL asociados..." -ForegroundColor Green
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
                isCreatedToken = ($mint -eq "DLyGgVVjcrsXvewd7PMr7H7FKpWiL96hymNvjZUCzeYf")
            }
        }
        $allInfo.data.tokens = $tokens
        Write-Host "   Tokens encontrados: $($tokens.Count)" -ForegroundColor Cyan
        foreach ($token in $tokens) {
            $marker = if ($token.isCreatedToken) { " ⭐ (Token creado)" } else { "" }
            Write-Host "     - Mint: $($token.mint)$marker" -ForegroundColor $(if ($token.isCreatedToken) { "Green" } else { "Gray" })
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
        
        # Buscar la transacción de creación del token
        $creationTx = $transactions | Where-Object { $_.signature -eq "3tTW7tvfNEKX6oVUpKdEE4YkTLVvTj4NfEngy3c9Ws9zpjwvwCawwwNyCiWg9roWSbmbmLa1exev3gyne4esnCDz" }
        if ($creationTx) {
            Write-Host "   ⭐ Transacción de creación del token encontrada en el historial" -ForegroundColor Green
        }
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
            Write-Host "   Es un programa ejecutable" -ForegroundColor Cyan
        } else {
            $allInfo.data.isProgram = $false
            Write-Host "   No es un programa ejecutable (es una wallet)" -ForegroundColor Yellow
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
=== INFORMACIÓN COMPLETA DE WALLET CREADORA ===
Fecha: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
Dirección: $address
Rol: Creador del Token SPL
Token Creado: DLyGgVVjcrsXvewd7PMr7H7FKpWiL96hymNvjZUCzeYf

--- BALANCE SOL ---
$($allInfo.data.balance | ConvertTo-Json -Depth 5)

--- INFORMACIÓN DE CUENTA ---
$($allInfo.data.accountInfo | ConvertTo-Json -Depth 5)

--- TOKENS SPL ASOCIADOS ---
$($allInfo.data.tokens | ConvertTo-Json -Depth 5)

--- TRANSACCIONES RECIENTES ---
$($allInfo.data.recentTransactions | ConvertTo-Json -Depth 5)

--- INFORMACIÓN DE PROGRAMA ---
$($allInfo.data.isProgram)

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
    Write-Host "Balance SOL: $($allInfo.data.balance.sol) SOL" -ForegroundColor Green
}
if ($allInfo.data.tokens) {
    $createdToken = $allInfo.data.tokens | Where-Object { $_.isCreatedToken }
    if ($createdToken) {
        Write-Host "Token creado en wallet: $($createdToken.amount) tokens" -ForegroundColor Green
    }
    Write-Host "Total de tokens diferentes: $($allInfo.data.tokens.Count)" -ForegroundColor Green
}
if ($allInfo.data.recentTransactions) {
    Write-Host "Transacciones recientes: $($allInfo.data.recentTransactions.Count)" -ForegroundColor Green
}
if ($allInfo.data.isProgram) {
    Write-Host "Tipo: Programa ejecutable" -ForegroundColor Green
} else {
    Write-Host "Tipo: Wallet/Cuenta" -ForegroundColor Green
}

Write-Host ""
Write-Host "Ver información detallada en:" -ForegroundColor Cyan
Write-Host "  - $outputFile" -ForegroundColor Gray
Write-Host "  - $outputTxt" -ForegroundColor Gray
