# CoinGecko CLI - Terminal para consultar CoinGecko API
# Uso: .\coingecko_cli.ps1 [comando] [parámetros]

param(
    [Parameter(Position=0)]
    [string]$Comando = "help",
    
    [Parameter(Position=1)]
    [string]$Parametro1 = "",
    
    [Parameter(Position=2)]
    [string]$Parametro2 = ""
)

$API_BASE = "https://api.coingecko.com/api/v3"

function Show-Help {
    Write-Host ""
    Write-Host "=== COINGECKO CLI ===" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "COMANDOS DISPONIBLES:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  search <token>              - Buscar token por nombre/símbolo" -ForegroundColor Gray
    Write-Host "  price <token_id>            - Obtener precio de un token" -ForegroundColor Gray
    Write-Host "  info <token_id>             - Información completa del token" -ForegroundColor Gray
    Write-Host "  market <token_id>           - Datos de mercado del token" -ForegroundColor Gray
    Write-Host "  platforms                  - Listar todas las plataformas" -ForegroundColor Gray
    Write-Host "  trending                   - Tokens en tendencia" -ForegroundColor Gray
    Write-Host "  global                     - Estadísticas globales del mercado" -ForegroundColor Gray
    Write-Host "  compare <id1> <id2>        - Comparar dos tokens" -ForegroundColor Gray
    Write-Host "  list <platform>            - Listar tokens por plataforma" -ForegroundColor Gray
    Write-Host ""
    Write-Host "EJEMPLOS:" -ForegroundColor Yellow
    Write-Host "  .\coingecko_cli.ps1 search bitcoin" -ForegroundColor Gray
    Write-Host "  .\coingecko_cli.ps1 price bitcoin" -ForegroundColor Gray
    Write-Host "  .\coingecko_cli.ps1 info ethereum" -ForegroundColor Gray
    Write-Host "  .\coingecko_cli.ps1 compare bitcoin ethereum" -ForegroundColor Gray
    Write-Host "  .\coingecko_cli.ps1 list binance-smart-chain" -ForegroundColor Gray
    Write-Host ""
}

function Search-Token {
    param([string]$Query)
    
    if ([string]::IsNullOrWhiteSpace($Query)) {
        Write-Host "ERROR: Debes especificar un término de búsqueda" -ForegroundColor Red
        return
    }
    
    Write-Host "Buscando: $Query..." -ForegroundColor Cyan
    
    try {
        $url = "$API_BASE/search?query=$Query"
        $response = Invoke-RestMethod -Uri $url -Method Get
        
        Write-Host ""
        Write-Host "=== RESULTADOS DE BÚSQUEDA ===" -ForegroundColor Yellow
        Write-Host ""
        
        if ($response.coins.Count -gt 0) {
            Write-Host "TOKENS ENCONTRADOS:" -ForegroundColor Green
            $response.coins | Select-Object -First 10 | ForEach-Object {
                Write-Host "  • $($_.name) ($($_.symbol))" -ForegroundColor White
                Write-Host "    ID: $($_.id)" -ForegroundColor Gray
                Write-Host "    Market Cap Rank: $($_.market_cap_rank)" -ForegroundColor Gray
                Write-Host ""
            }
        } else {
            Write-Host "No se encontraron resultados" -ForegroundColor Red
        }
    } catch {
        Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
}

function Get-Price {
    param([string]$TokenId)
    
    if ([string]::IsNullOrWhiteSpace($TokenId)) {
        Write-Host "ERROR: Debes especificar el ID del token" -ForegroundColor Red
        return
    }
    
    Write-Host "Obteniendo precio de: $TokenId..." -ForegroundColor Cyan
    
    try {
        $url = "$API_BASE/simple/price?ids=$TokenId&vs_currencies=usd,btc,eth&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true"
        $response = Invoke-RestMethod -Uri $url -Method Get
        
        $token = $response.$TokenId
        
        Write-Host ""
        Write-Host "=== PRECIO: $TokenId ===" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "USD:  `$$($token.usd)" -ForegroundColor Green
        Write-Host "BTC:  $($token.btc)" -ForegroundColor Yellow
        Write-Host "ETH:  $($token.eth)" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Market Cap: `$$([math]::Round($token.usd_market_cap / 1e9, 2))B" -ForegroundColor White
        Write-Host "Volumen 24h: `$$([math]::Round($token.usd_24h_vol / 1e6, 2))M" -ForegroundColor White
        Write-Host "Cambio 24h: $($token.usd_24h_change)%" -ForegroundColor $(if ($token.usd_24h_change -ge 0) { "Green" } else { "Red" })
        Write-Host ""
    } catch {
        Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "Verifica que el ID del token sea correcto" -ForegroundColor Yellow
    }
}

function Get-Info {
    param([string]$TokenId)
    
    if ([string]::IsNullOrWhiteSpace($TokenId)) {
        Write-Host "ERROR: Debes especificar el ID del token" -ForegroundColor Red
        return
    }
    
    Write-Host "Obteniendo información de: $TokenId..." -ForegroundColor Cyan
    
    try {
        $url = "$API_BASE/coins/$TokenId"
        $response = Invoke-RestMethod -Uri $url -Method Get
        
        Write-Host ""
        Write-Host "=== INFORMACIÓN: $($response.name) ===" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Símbolo: $($response.symbol)" -ForegroundColor White
        Write-Host "ID: $($response.id)" -ForegroundColor Gray
        Write-Host "Ranking: #$($response.market_cap_rank)" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Precio Actual:" -ForegroundColor Yellow
        Write-Host "  USD: `$$($response.market_data.current_price.usd)" -ForegroundColor Green
        Write-Host "  BTC: $($response.market_data.current_price.btc)" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Market Cap:" -ForegroundColor Yellow
        Write-Host "  USD: `$$([math]::Round($response.market_data.market_cap.usd / 1e9, 2))B" -ForegroundColor White
        Write-Host ""
        Write-Host "Volumen 24h:" -ForegroundColor Yellow
        Write-Host "  USD: `$$([math]::Round($response.market_data.total_volume.usd / 1e6, 2))M" -ForegroundColor White
        Write-Host ""
        Write-Host "Cambios:" -ForegroundColor Yellow
        Write-Host "  24h: $([math]::Round($response.market_data.price_change_percentage_24h, 2))%" -ForegroundColor $(if ($response.market_data.price_change_percentage_24h -ge 0) { "Green" } else { "Red" })
        Write-Host "  7d:  $([math]::Round($response.market_data.price_change_percentage_7d, 2))%" -ForegroundColor $(if ($response.market_data.price_change_percentage_7d -ge 0) { "Green" } else { "Red" })
        Write-Host ""
        
        if ($response.platforms) {
            Write-Host "Plataformas:" -ForegroundColor Yellow
            $response.platforms.PSObject.Properties | ForEach-Object {
                Write-Host "  $($_.Name): $($_.Value)" -ForegroundColor Gray
            }
            Write-Host ""
        }
        
        Write-Host "Descripción (ES):" -ForegroundColor Yellow
        $desc = $response.description.es
        if ([string]::IsNullOrWhiteSpace($desc)) {
            $desc = $response.description.en
        }
        if ($desc) {
            $desc = $desc -replace '<[^>]+>', ''  # Remove HTML tags
            $desc = $desc.Substring(0, [Math]::Min(500, $desc.Length))
            Write-Host "  $desc..." -ForegroundColor Gray
        }
        Write-Host ""
        
    } catch {
        Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
}

function Get-Market {
    param([string]$TokenId)
    
    if ([string]::IsNullOrWhiteSpace($TokenId)) {
        Write-Host "ERROR: Debes especificar el ID del token" -ForegroundColor Red
        return
    }
    
    Write-Host "Obteniendo datos de mercado de: $TokenId..." -ForegroundColor Cyan
    
    try {
        $url = "$API_BASE/coins/$TokenId"
        $response = Invoke-RestMethod -Uri $url -Method Get
        
        $market = $response.market_data
        
        Write-Host ""
        Write-Host "=== DATOS DE MERCADO: $($response.name) ===" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Precio:" -ForegroundColor Cyan
        Write-Host "  Actual: `$$($market.current_price.usd)" -ForegroundColor Green
        Write-Host "  24h Alto: `$$($market.high_24h.usd)" -ForegroundColor White
        Write-Host "  24h Bajo: `$$($market.low_24h.usd)" -ForegroundColor White
        Write-Host ""
        Write-Host "Market Cap:" -ForegroundColor Cyan
        Write-Host "  Actual: `$$([math]::Round($market.market_cap.usd / 1e9, 2))B" -ForegroundColor White
        Write-Host "  Rank: #$($response.market_cap_rank)" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Volumen:" -ForegroundColor Cyan
        Write-Host "  24h: `$$([math]::Round($market.total_volume.usd / 1e6, 2))M" -ForegroundColor White
        Write-Host ""
        Write-Host "Suministro:" -ForegroundColor Cyan
        Write-Host "  Circulante: $([math]::Round($market.circulating_supply / 1e6, 2))M" -ForegroundColor White
        Write-Host "  Total: $([math]::Round($market.total_supply / 1e6, 2))M" -ForegroundColor White
        if ($market.max_supply) {
            Write-Host "  Máximo: $([math]::Round($market.max_supply / 1e6, 2))M" -ForegroundColor White
        }
        Write-Host ""
        Write-Host "Cambios:" -ForegroundColor Cyan
        Write-Host "  1h:  $([math]::Round($market.price_change_percentage_1h_in_currency.usd, 2))%" -ForegroundColor $(if ($market.price_change_percentage_1h_in_currency.usd -ge 0) { "Green" } else { "Red" })
        Write-Host "  24h: $([math]::Round($market.price_change_percentage_24h, 2))%" -ForegroundColor $(if ($market.price_change_percentage_24h -ge 0) { "Green" } else { "Red" })
        Write-Host "  7d:  $([math]::Round($market.price_change_percentage_7d, 2))%" -ForegroundColor $(if ($market.price_change_percentage_7d -ge 0) { "Green" } else { "Red" })
        Write-Host "  30d: $([math]::Round($market.price_change_percentage_30d, 2))%" -ForegroundColor $(if ($market.price_change_percentage_30d -ge 0) { "Green" } else { "Red" })
        Write-Host ""
        
    } catch {
        Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
}

function Get-Trending {
    Write-Host "Obteniendo tokens en tendencia..." -ForegroundColor Cyan
    
    try {
        $url = "$API_BASE/search/trending"
        $response = Invoke-RestMethod -Uri $url -Method Get
        
        Write-Host ""
        Write-Host "=== TOKENS EN TENDENCIA ===" -ForegroundColor Yellow
        Write-Host ""
        
        $response.coins | ForEach-Object {
            $coin = $_.item
            Write-Host "🔥 $($coin.name) ($($coin.symbol))" -ForegroundColor Red
            Write-Host "   ID: $($coin.id)" -ForegroundColor Gray
            Write-Host "   Market Cap Rank: $($coin.market_cap_rank)" -ForegroundColor Gray
            Write-Host ""
        }
    } catch {
        Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
}

function Get-Global {
    Write-Host "Obteniendo estadísticas globales..." -ForegroundColor Cyan
    
    try {
        $url = "$API_BASE/global"
        $response = Invoke-RestMethod -Uri $url -Method Get
        
        $data = $response.data
        
        Write-Host ""
        Write-Host "=== ESTADÍSTICAS GLOBALES DEL MERCADO ===" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Market Cap Total:" -ForegroundColor Cyan
        Write-Host "  USD: `$$([math]::Round($data.total_market_cap.usd / 1e12, 2))T" -ForegroundColor Green
        Write-Host ""
        Write-Host "Volumen Total 24h:" -ForegroundColor Cyan
        Write-Host "  USD: `$$([math]::Round($data.total_volume.usd / 1e9, 2))B" -ForegroundColor White
        Write-Host ""
        Write-Host "Dominancia de Bitcoin:" -ForegroundColor Cyan
        Write-Host "  $($data.market_cap_percentage.btc)%" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Dominancia de Ethereum:" -ForegroundColor Cyan
        Write-Host "  $($data.market_cap_percentage.eth)%" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Criptomonedas Activas: $($data.active_cryptocurrencies)" -ForegroundColor White
        Write-Host "Mercados: $($data.markets)" -ForegroundColor White
        Write-Host ""
    } catch {
        Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
}

function Compare-Tokens {
    param([string]$TokenId1, [string]$TokenId2)
    
    if ([string]::IsNullOrWhiteSpace($TokenId1) -or [string]::IsNullOrWhiteSpace($TokenId2)) {
        Write-Host "ERROR: Debes especificar dos IDs de tokens" -ForegroundColor Red
        return
    }
    
    Write-Host "Comparando: $TokenId1 vs $TokenId2..." -ForegroundColor Cyan
    
    try {
        $url = "$API_BASE/simple/price?ids=$TokenId1,$TokenId2&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true"
        $response = Invoke-RestMethod -Uri $url -Method Get
        
        $token1 = $response.$TokenId1
        $token2 = $response.$TokenId2
        
        Write-Host ""
        Write-Host "=== COMPARACIÓN ===" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "$TokenId1" -ForegroundColor Cyan
        Write-Host "  Precio: `$$($token1.usd)" -ForegroundColor Green
        Write-Host "  Market Cap: `$$([math]::Round($token1.usd_market_cap / 1e9, 2))B" -ForegroundColor White
        Write-Host "  Volumen 24h: `$$([math]::Round($token1.usd_24h_vol / 1e6, 2))M" -ForegroundColor White
        Write-Host "  Cambio 24h: $($token1.usd_24h_change)%" -ForegroundColor $(if ($token1.usd_24h_change -ge 0) { "Green" } else { "Red" })
        Write-Host ""
        Write-Host "$TokenId2" -ForegroundColor Cyan
        Write-Host "  Precio: `$$($token2.usd)" -ForegroundColor Green
        Write-Host "  Market Cap: `$$([math]::Round($token2.usd_market_cap / 1e9, 2))B" -ForegroundColor White
        Write-Host "  Volumen 24h: `$$([math]::Round($token2.usd_24h_vol / 1e6, 2))M" -ForegroundColor White
        Write-Host "  Cambio 24h: $($token2.usd_24h_change)%" -ForegroundColor $(if ($token2.usd_24h_change -ge 0) { "Green" } else { "Red" })
        Write-Host ""
        
        $ratio = $token1.usd / $token2.usd
        Write-Host "Ratio: 1 $TokenId1 = $([math]::Round($ratio, 4)) $TokenId2" -ForegroundColor Yellow
        Write-Host ""
        
    } catch {
        Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
}

function Get-Platforms {
    Write-Host "Obteniendo lista de plataformas..." -ForegroundColor Cyan
    
    try {
        $url = "$API_BASE/asset_platforms"
        $response = Invoke-RestMethod -Uri $url -Method Get
        
        Write-Host ""
        Write-Host "=== PLATAFORMAS DISPONIBLES ===" -ForegroundColor Yellow
        Write-Host ""
        
        $response | Select-Object -First 20 | ForEach-Object {
            Write-Host "  • $($_.name) (ID: $($_.id))" -ForegroundColor White
        }
        Write-Host ""
        Write-Host "Total: $($response.Count) plataformas" -ForegroundColor Gray
        Write-Host ""
    } catch {
        Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
}

function List-Platform {
    param([string]$Platform)
    
    if ([string]::IsNullOrWhiteSpace($Platform)) {
        Write-Host "ERROR: Debes especificar una plataforma" -ForegroundColor Red
        Write-Host "Ejemplo: binance-smart-chain, ethereum, solana" -ForegroundColor Yellow
        return
    }
    
    Write-Host "Listando tokens en: $Platform..." -ForegroundColor Cyan
    
    try {
        $url = "$API_BASE/coins/markets?vs_currency=usd&category=$Platform&order=market_cap_desc&per_page=20&page=1"
        $response = Invoke-RestMethod -Uri $url -Method Get
        
        Write-Host ""
        Write-Host "=== TOKENS EN $Platform ===" -ForegroundColor Yellow
        Write-Host ""
        
        $response | ForEach-Object {
            Write-Host "$($_.name) ($($_.symbol))" -ForegroundColor White
            Write-Host "  Precio: `$$($_.current_price)" -ForegroundColor Green
            Write-Host "  Market Cap: `$$([math]::Round($_.market_cap / 1e6, 2))M" -ForegroundColor Gray
            Write-Host "  Cambio 24h: $([math]::Round($_.price_change_percentage_24h, 2))%" -ForegroundColor $(if ($_.price_change_percentage_24h -ge 0) { "Green" } else { "Red" })
            Write-Host ""
        }
    } catch {
        Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "Intenta con: ethereum, binance-smart-chain, solana, polygon-pos, etc." -ForegroundColor Yellow
    }
}

# Main
switch ($Comando.ToLower()) {
    "help" { Show-Help }
    "search" { Search-Token -Query $Parametro1 }
    "price" { Get-Price -TokenId $Parametro1 }
    "info" { Get-Info -TokenId $Parametro1 }
    "market" { Get-Market -TokenId $Parametro1 }
    "trending" { Get-Trending }
    "global" { Get-Global }
    "compare" { Compare-Tokens -TokenId1 $Parametro1 -TokenId2 $Parametro2 }
    "platforms" { Get-Platforms }
    "list" { List-Platform -Platform $Parametro1 }
    default {
        Write-Host "Comando desconocido: $Comando" -ForegroundColor Red
        Show-Help
    }
}
