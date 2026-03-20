# Script para analizar tokens de CoinGecko y comparar con los contratos
Write-Host "=== ANÁLISIS DE TOKENS COINGECKO ===" -ForegroundColor Cyan
Write-Host ""

$jsonPath = "C:\Users\Administrador\Desktop\tokens_coingecko.json"

if (-not (Test-Path $jsonPath)) {
    Write-Host "ERROR: No se encuentra el archivo JSON" -ForegroundColor Red
    exit 1
}

# Leer JSON
$tokens = Get-Content $jsonPath | ConvertFrom-Json

Write-Host "Total de tokens en la lista: $($tokens.Count)" -ForegroundColor Yellow
Write-Host ""

# Buscar tokens relacionados con los contratos
Write-Host "=== BÚSQUEDA DE TOKENS RELACIONADOS ===" -ForegroundColor Cyan
Write-Host ""

# BitcoinMexicano (BTCMX)
$btcmx = $tokens | Where-Object { $_.symbol -eq "btcmx" -or $_.name -like "*bitcoin*mexicano*" -or $_.name -like "*btcmx*" }
if ($btcmx) {
    Write-Host "✅ BITCOINMEXICANO (BTCMX) ENCONTRADO:" -ForegroundColor Green
    $btcmx | Format-List id, symbol, name, platforms
} else {
    Write-Host "❌ BitcoinMexicano (BTCMX) NO encontrado en la lista" -ForegroundColor Red
}

Write-Host ""

# QryptaQuantumToken (QRYP)
$qryp = $tokens | Where-Object { $_.symbol -eq "qryp" -or $_.name -like "*qrypta*" -or $_.name -like "*quantum*" }
if ($qryp) {
    Write-Host "✅ QRYPTAQUANTUMTOKEN (QRYP) ENCONTRADO:" -ForegroundColor Green
    $qryp | Format-List id, symbol, name, platforms
} else {
    Write-Host "❌ QryptaQuantumToken (QRYP) NO encontrado en la lista" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== ANÁLISIS DE PLATAFORMAS ===" -ForegroundColor Cyan
Write-Host ""

# Contar tokens por plataforma
$platforms = @{}
foreach ($token in $tokens) {
    if ($token.platforms) {
        $platformNames = $token.platforms.PSObject.Properties.Name
        foreach ($platform in $platformNames) {
            if (-not $platforms.ContainsKey($platform)) {
                $platforms[$platform] = 0
            }
            $platforms[$platform]++
        }
    }
}

Write-Host "Distribución de tokens por plataforma:" -ForegroundColor Yellow
$platforms.GetEnumerator() | Sort-Object Value -Descending | Format-Table -AutoSize

Write-Host ""
Write-Host "=== TOKENS EN BINANCE-SMART-CHAIN ===" -ForegroundColor Cyan
$bscTokens = $tokens | Where-Object { $_.platforms.'binance-smart-chain' }
Write-Host "Total: $($bscTokens.Count)" -ForegroundColor Yellow
$bscTokens | Select-Object -First 10 id, symbol, name, @{Name='BSC_Address';Expression={$_.platforms.'binance-smart-chain'}} | Format-Table -AutoSize

Write-Host ""
Write-Host "=== TOKENS EN SOLANA ===" -ForegroundColor Cyan
$solanaTokens = $tokens | Where-Object { $_.platforms.solana }
Write-Host "Total: $($solanaTokens.Count)" -ForegroundColor Yellow
$solanaTokens | Select-Object -First 10 id, symbol, name, @{Name='Solana_Address';Expression={$_.platforms.solana}} | Format-Table -AutoSize

Write-Host ""
Write-Host "=== CONCLUSIÓN ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Este JSON contiene tokens listados en CoinGecko." -ForegroundColor Gray
Write-Host "Para que un token aparezca aquí, necesita:" -ForegroundColor Gray
Write-Host "1. Estar desplegado en una blockchain" -ForegroundColor Gray
Write-Host "2. Tener liquidez en un DEX" -ForegroundColor Gray
Write-Host "3. Cumplir requisitos de CoinGecko (volumen, holders, etc.)" -ForegroundColor Gray
Write-Host "4. Ser enviado para listado (o tener suficiente volumen)" -ForegroundColor Gray
