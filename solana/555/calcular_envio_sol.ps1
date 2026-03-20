# Calcular cuánto SOL se puede enviar con $0.13 restando la comisión
$MONTO_DOLARES = 0.13
$FEE_ESTIMADO = 0.000005  # Fee de red Solana (~0.000005 SOL)

Write-Host "=== CÁLCULO: ENVÍO DE SOL CON $MONTO_DOLARES USD ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "Obteniendo precio actual de SOL..." -ForegroundColor Green

try {
    # Obtener precio de SOL desde CoinGecko API
    $priceUrl = "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
    $priceResponse = Invoke-RestMethod -Uri $priceUrl -Method GET -ErrorAction Stop
    
    if ($priceResponse.solana.usd) {
        $precioSOL = $priceResponse.solana.usd
        Write-Host "✓ Precio actual de SOL: `$$precioSOL USD" -ForegroundColor Green
        Write-Host ""
        
        # Calcular cuántos SOL son $0.13
        $solDisponible = $MONTO_DOLARES / $precioSOL
        
        Write-Host "=== CÁLCULOS ===" -ForegroundColor Cyan
        Write-Host "Monto disponible: `$$MONTO_DOLARES USD" -ForegroundColor Yellow
        Write-Host "Precio de SOL: `$$precioSOL USD" -ForegroundColor Gray
        Write-Host "SOL disponible: $solDisponible SOL" -ForegroundColor Green
        Write-Host ""
        
        # Restar la comisión
        $solParaEnviar = $solDisponible - $FEE_ESTIMADO
        
        Write-Host "=== RESULTADO ===" -ForegroundColor Cyan
        Write-Host "SOL disponible: $([math]::Round($solDisponible, 9)) SOL" -ForegroundColor Green
        Write-Host "Fee de red: $FEE_ESTIMADO SOL" -ForegroundColor Gray
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
        Write-Host "SOL a enviar: $([math]::Round($solParaEnviar, 9)) SOL" -ForegroundColor Yellow
        Write-Host ""
        
        # Mostrar en diferentes formatos
        Write-Host "=== DESGLOSE ===" -ForegroundColor Cyan
        Write-Host "Cantidad exacta a enviar: $([math]::Round($solParaEnviar, 9)) SOL" -ForegroundColor Green
        Write-Host "En lamports: $([math]::Round($solParaEnviar * 1000000000, 0)) lamports" -ForegroundColor Gray
        Write-Host ""
        
        # Advertencia si es muy poco
        if ($solParaEnviar -lt 0.001) {
            Write-Host "⚠️ ADVERTENCIA: La cantidad es muy pequeña" -ForegroundColor Red
            Write-Host "   El fee puede ser una porción significativa del monto" -ForegroundColor Yellow
        }
        
        # Mostrar porcentaje del fee
        $porcentajeFee = ($FEE_ESTIMADO / $solDisponible) * 100
        Write-Host "Fee representa: $([math]::Round($porcentajeFee, 2))% del monto total" -ForegroundColor Gray
        Write-Host ""
        
        # Mostrar comando para enviar
        Write-Host "=== COMANDO PARA ENVIAR ===" -ForegroundColor Cyan
        Write-Host "Si tienes Solana CLI configurado:" -ForegroundColor Yellow
        Write-Host "solana transfer <DIRECCION_DESTINO> $([math]::Round($solParaEnviar, 9)) --allow-unfunded-recipient" -ForegroundColor Green
        Write-Host ""
        Write-Host "Cantidad exacta: $([math]::Round($solParaEnviar, 9)) SOL" -ForegroundColor Cyan
        
    } else {
        Write-Host "❌ No se pudo obtener el precio de SOL" -ForegroundColor Red
        Write-Host "Usando precio estimado de $150 USD por SOL" -ForegroundColor Yellow
        $precioSOL = 150
        $solDisponible = $MONTO_DOLARES / $precioSOL
        $solParaEnviar = $solDisponible - $FEE_ESTIMADO
        Write-Host ""
        Write-Host "SOL disponible: $([math]::Round($solDisponible, 9)) SOL" -ForegroundColor Green
        Write-Host "SOL a enviar: $([math]::Round($solParaEnviar, 9)) SOL" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Error al obtener precio actual" -ForegroundColor Red
    Write-Host "Usando precio estimado de $150 USD por SOL" -ForegroundColor Yellow
    Write-Host ""
    
    $precioSOL = 150
    $solDisponible = $MONTO_DOLARES / $precioSOL
    $solParaEnviar = $solDisponible - $FEE_ESTIMADO
    
    Write-Host "=== CÁLCULO CON PRECIO ESTIMADO ===" -ForegroundColor Cyan
    Write-Host "Monto disponible: `$$MONTO_DOLARES USD" -ForegroundColor Yellow
    Write-Host "Precio estimado SOL: `$$precioSOL USD" -ForegroundColor Gray
    Write-Host "SOL disponible: $([math]::Round($solDisponible, 9)) SOL" -ForegroundColor Green
    Write-Host "Fee de red: $FEE_ESTIMADO SOL" -ForegroundColor Gray
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host "SOL a enviar: $([math]::Round($solParaEnviar, 9)) SOL" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "⚠️ NOTA: Este es un cálculo estimado. Verifica el precio actual de SOL." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== RESUMEN ===" -ForegroundColor Cyan
Write-Host "Con `$$MONTO_DOLARES USD puedes enviar aproximadamente:" -ForegroundColor Yellow
Write-Host "$([math]::Round($solParaEnviar, 9)) SOL" -ForegroundColor Green
Write-Host ""
Write-Host "El destinatario recibirá esta cantidad después de deducir el fee." -ForegroundColor Gray
