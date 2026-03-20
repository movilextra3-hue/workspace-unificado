# Verificar dirección en todas las redes de Solana
$address = "3tTW7tvfNEKX6oVUpKdEE4YkTLVvTj4NfEngy3c9Ws9zpjwvwCawwwNyCiWg9roWSbmbmLa1exev3gyne4esnCDz"

Write-Host "=== Verificando dirección en todas las redes de Solana ===" -ForegroundColor Cyan
Write-Host "Dirección: $address" -ForegroundColor Yellow
Write-Host ""

$networks = @(
    @{ Name = "Mainnet"; Url = "https://api.mainnet-beta.solana.com" },
    @{ Name = "Testnet"; Url = "https://api.testnet.solana.com" },
    @{ Name = "Devnet"; Url = "https://api.devnet.solana.com" }
)

$results = @{}

foreach ($network in $networks) {
    Write-Host "Verificando en $($network.Name)..." -ForegroundColor Green
    try {
        $body = @{
            jsonrpc = "2.0"
            id = 1
            method = "getBalance"
            params = @($address)
        }
        
        $response = Invoke-RestMethod -Uri $network.Url -Method "POST" -Headers @{ "Content-Type" = "application/json" } -Body ($body | ConvertTo-Json) -ErrorAction Stop
        
        if ($response -and $response.result) {
            $balanceSOL = [math]::Round($response.result.value / 1000000000, 9)
            $results[$network.Name] = @{
                found = $true
                balance = $balanceSOL
                lamports = $response.result.value
            }
            Write-Host "  ✓ Encontrada - Balance: $balanceSOL SOL" -ForegroundColor Cyan
        } else {
            $results[$network.Name] = @{
                found = $false
                balance = 0
            }
            Write-Host "  ✗ No encontrada" -ForegroundColor Yellow
        }
    } catch {
        $results[$network.Name] = @{
            found = $false
            error = $_.Exception.Message
        }
        Write-Host "  ✗ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== RESUMEN ===" -ForegroundColor Yellow
foreach ($networkName in $results.Keys) {
    $result = $results[$networkName]
    if ($result.found) {
        Write-Host "$networkName : $($result.balance) SOL" -ForegroundColor Green
    } else {
        Write-Host "$networkName : No encontrada" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "=== Verificación de formato ===" -ForegroundColor Cyan
Write-Host "Longitud: $($address.Length) caracteres" -ForegroundColor Gray
if ($address.Length -eq 44) {
    Write-Host "✓ Longitud correcta para dirección Solana" -ForegroundColor Green
} else {
    Write-Host "✗ Longitud incorrecta (debe ser 44 caracteres)" -ForegroundColor Red
}

# Verificar Base58
$base58Chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
$isBase58 = $true
foreach ($char in $address.ToCharArray()) {
    if ($base58Chars.IndexOf($char) -eq -1) {
        $isBase58 = $false
        break
    }
}

if ($isBase58) {
    Write-Host "✓ Formato Base58 válido" -ForegroundColor Green
} else {
    Write-Host "✗ Formato Base58 inválido" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Conclusión ===" -ForegroundColor Cyan
if ($results.Values | Where-Object { $_.found }) {
    Write-Host "La dirección existe en al menos una red de Solana" -ForegroundColor Green
} else {
    Write-Host "La dirección no se encontró en ninguna red de Solana" -ForegroundColor Yellow
    Write-Host "Posibles razones:" -ForegroundColor Yellow
    Write-Host "  - Dirección nunca utilizada" -ForegroundColor Gray
    Write-Host "  - Dirección cerrada (cero balance y sin datos)" -ForegroundColor Gray
    Write-Host "  - Dirección inválida o mal formada" -ForegroundColor Gray
}
