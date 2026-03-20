# Calcular cuánto enviar para dejar la wallet en 0
$OWNER_ADDRESS = "J3RX9CBrwB7vZmwNytRsJkJA9Wq7y6kwP25AZsX34TJa"
$FEE_MINIMO = 0.000005
$FEE_CONSERVADOR = 0.00001

Write-Host "=== VACIAR WALLET - DEJAR EN 0 ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "Obteniendo balance actual..." -ForegroundColor Green

try {
    $balanceBody = @{
        jsonrpc = "2.0"
        id = 1
        method = "getBalance"
        params = @($OWNER_ADDRESS)
    } | ConvertTo-Json
    
    $balanceResponse = Invoke-RestMethod -Uri "https://api.mainnet-beta.solana.com" -Method POST -Headers @{ "Content-Type" = "application/json" } -Body $balanceBody
    
    if ($balanceResponse.result) {
        $balanceLamports = $balanceResponse.result.value
        $balanceSOL = [math]::Round($balanceLamports / 1000000000, 9)
        
        Write-Host "✓ Balance actual: $balanceSOL SOL" -ForegroundColor Green
        Write-Host "  ($balanceLamports lamports)" -ForegroundColor Gray
        Write-Host ""
        
        Write-Host "=== CÁLCULOS PARA VACIAR WALLET ===" -ForegroundColor Cyan
        Write-Host ""
        
        # Opción 1: Dejar exactamente el fee
        $enviarConFeeMinimo = $balanceSOL - $FEE_MINIMO
        Write-Host "OPCIÓN 1: Dejar solo el fee mínimo" -ForegroundColor Green
        Write-Host "  Enviar: $([math]::Round($enviarConFeeMinimo, 9)) SOL" -ForegroundColor Green
        Write-Host "  Quedará: $FEE_MINIMO SOL (solo para el fee)" -ForegroundColor Gray
        Write-Host "  Balance: $balanceSOL - Enviar: $([math]::Round($enviarConFeeMinimo, 9)) = $FEE_MINIMO" -ForegroundColor Gray
        Write-Host ""
        
        # Opción 2: Más conservador (dejar un poco más)
        $enviarConservador = $balanceSOL - $FEE_CONSERVADOR
        Write-Host "OPCIÓN 2: Dejar fee conservador (más seguro)" -ForegroundColor Yellow
        Write-Host "  Enviar: $([math]::Round($enviarConservador, 9)) SOL" -ForegroundColor Yellow
        Write-Host "  Quedará: $FEE_CONSERVADOR SOL" -ForegroundColor Gray
        Write-Host "  Balance: $balanceSOL - Enviar: $([math]::Round($enviarConservador, 9)) = $FEE_CONSERVADOR" -ForegroundColor Gray
        Write-Host ""
        
        # Opción 3: Intentar dejar en 0 (riesgoso)
        $enviarTodo = $balanceSOL - 0.000001  # Dejar 0.000001 SOL mínimo
        Write-Host "OPCIÓN 3: Dejar mínimo posible (riesgoso)" -ForegroundColor Red
        Write-Host "  Enviar: $([math]::Round($enviarTodo, 9)) SOL" -ForegroundColor Red
        Write-Host "  Quedará: 0.000001 SOL (muy poco, puede no ser suficiente)" -ForegroundColor Red
        Write-Host "  ⚠️ NO RECOMENDADO - Puede fallar la transacción" -ForegroundColor Red
        Write-Host ""
        
        Write-Host "=== RECOMENDACIÓN ===" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "✅ RECOMENDADO: Opción 1 o 2" -ForegroundColor Green
        Write-Host "   Enviar: $([math]::Round($enviarConservador, 9)) SOL" -ForegroundColor Green
        Write-Host "   Esto deja $FEE_CONSERVADOR SOL en la wallet" -ForegroundColor Gray
        Write-Host "   Es seguro y deja la wallet prácticamente vacía" -ForegroundColor Gray
        Write-Host ""
        
        Write-Host "=== COMANDOS ===" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "OPCIÓN RECOMENDADA (dejar $FEE_CONSERVADOR SOL):" -ForegroundColor Yellow
        Write-Host "solana transfer <DIRECCION_DESTINO> $([math]::Round($enviarConservador, 9)) --allow-unfunded-recipient" -ForegroundColor Green
        Write-Host ""
        Write-Host "OPCIÓN ALTERNATIVA (dejar $FEE_MINIMO SOL):" -ForegroundColor Yellow
        Write-Host "solana transfer <DIRECCION_DESTINO> $([math]::Round($enviarConFeeMinimo, 9)) --allow-unfunded-recipient" -ForegroundColor Green
        Write-Host ""
        
        # Calcular en dólares
        $precioSOL = 104.67
        $dolaresEnviar = $enviarConservador * $precioSOL
        Write-Host "Cantidad a enviar: $([math]::Round($enviarConservador, 9)) SOL" -ForegroundColor Cyan
        Write-Host "Equivale a: `$$([math]::Round($dolaresEnviar, 2)) USD" -ForegroundColor Cyan
        Write-Host ""
        
        Write-Host "=== ADVERTENCIAS ===" -ForegroundColor Yellow
        Write-Host "1. Si dejas muy poco SOL, la wallet quedará inutilizable" -ForegroundColor Gray
        Write-Host "2. Necesitarás más SOL para futuras transacciones" -ForegroundColor Gray
        Write-Host "3. El fee puede variar ligeramente" -ForegroundColor Gray
        Write-Host "4. Después del envío, quedarán ~$FEE_CONSERVADOR SOL en la wallet" -ForegroundColor Gray
        
    } else {
        Write-Host "❌ No se pudo obtener el balance" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

Write-Host ""
$destino = Read-Host "Ingresa la dirección destino (o presiona Enter para solo ver el cálculo)"

if ($destino -and $destino.Length -eq 44) {
    Write-Host ""
    Write-Host "=== RESUMEN FINAL ===" -ForegroundColor Cyan
    Write-Host "Dirección destino: $destino" -ForegroundColor Yellow
    Write-Host "Cantidad a enviar: $([math]::Round($enviarConservador, 9)) SOL" -ForegroundColor Green
    Write-Host ""
    Write-Host "Comando completo:" -ForegroundColor Cyan
    Write-Host "solana transfer $destino $([math]::Round($enviarConservador, 9)) --allow-unfunded-recipient" -ForegroundColor Green
}
