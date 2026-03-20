# Análisis completo de la cadena Solana
$string = "3tTW7tvfNEKX6oVUpKdEE4YkTLVvTj4NfEngy3c9Ws9zpjwvwCawwwNyCiWg9roWSbmbmLa1exev3gyne4esnCDz"

Write-Host "=== ANÁLISIS DE CADENA SOLANA ===" -ForegroundColor Cyan
Write-Host "Cadena: $string" -ForegroundColor Yellow
Write-Host "Longitud: $($string.Length) caracteres" -ForegroundColor Gray
Write-Host ""

# Verificar si puede dividirse en dos direcciones de 44 caracteres
if ($string.Length -eq 88) {
    Write-Host "=== POSIBLE DIVISIÓN EN DOS DIRECCIONES ===" -ForegroundColor Green
    $address1 = $string.Substring(0, 44)
    $address2 = $string.Substring(44, 44)
    
    Write-Host "Dirección 1 (primeros 44): $address1" -ForegroundColor Cyan
    Write-Host "Dirección 2 (últimos 44): $address2" -ForegroundColor Cyan
    Write-Host ""
    
    # Verificar ambas direcciones
    $addresses = @($address1, $address2)
    foreach ($addr in $addresses) {
        Write-Host "Verificando: $addr" -ForegroundColor Yellow
        try {
            $body = @{
                jsonrpc = "2.0"
                id = 1
                method = "getBalance"
                params = @($addr)
            }
            
            $response = Invoke-RestMethod -Uri "https://api.mainnet-beta.solana.com" -Method "POST" -Headers @{ "Content-Type" = "application/json" } -Body ($body | ConvertTo-Json) -ErrorAction Stop
            
            if ($response -and $response.result) {
                $balanceSOL = [math]::Round($response.result.value / 1000000000, 9)
                Write-Host "  ✓ Encontrada - Balance: $balanceSOL SOL" -ForegroundColor Green
            } else {
                Write-Host "  ✗ No encontrada en mainnet" -ForegroundColor Gray
            }
        } catch {
            Write-Host "  ✗ Error: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "=== VERIFICACIÓN COMO CLAVE PRIVADA ===" -ForegroundColor Green
Write-Host "Las claves privadas de Solana tienen 64 bytes (128 caracteres hex) o 88 caracteres en Base58"
Write-Host "Esta cadena tiene $($string.Length) caracteres, lo cual coincide con una clave privada en Base58" -ForegroundColor Yellow
Write-Host ""
Write-Host "⚠️ ADVERTENCIA: Si esta es una clave privada, NO la compartas públicamente" -ForegroundColor Red
Write-Host ""

# Verificar formato Base58
$base58Chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
$isBase58 = $true
foreach ($char in $string.ToCharArray()) {
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
Write-Host "=== POSIBLES INTERPRETACIONES ===" -ForegroundColor Cyan
Write-Host "1. Clave privada de Solana (88 caracteres Base58)" -ForegroundColor Gray
Write-Host "2. Dos direcciones concatenadas (44 + 44 caracteres)" -ForegroundColor Gray
Write-Host "3. Una dirección extendida o mal formada" -ForegroundColor Gray
Write-Host ""

Write-Host "=== RECOMENDACIONES ===" -ForegroundColor Yellow
Write-Host "Si es una clave privada:" -ForegroundColor Yellow
Write-Host "  - NO la compartas" -ForegroundColor Red
Write-Host "  - Guárdala de forma segura" -ForegroundColor Yellow
Write-Host "  - Úsala solo en entornos seguros" -ForegroundColor Yellow
Write-Host ""
Write-Host "Si son dos direcciones:" -ForegroundColor Yellow
Write-Host "  - Verifica cada una por separado" -ForegroundColor Yellow
Write-Host "  - Pueden ser direcciones relacionadas" -ForegroundColor Yellow
