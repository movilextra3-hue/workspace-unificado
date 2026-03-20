# Verificar balance real y calcular cuánto se puede enviar
$OWNER_ADDRESS = "J3RX9CBrwB7vZmwNytRsJkJA9Wq7y6kwP25AZsX34TJa"
$CANTIDAD_DESEADA = 0.001236999  # SOL que quieres enviar
$FEE_ESTIMADO = 0.000005  # Fee de red

Write-Host "=== VERIFICACIÓN DE BALANCE Y CÁLCULO ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Dirección: $OWNER_ADDRESS" -ForegroundColor Yellow
Write-Host ""

Write-Host "Obteniendo balance real de la blockchain..." -ForegroundColor Green

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
        
        Write-Host "✓ Balance real en blockchain: $balanceSOL SOL" -ForegroundColor Green
        Write-Host "  ($balanceLamports lamports)" -ForegroundColor Gray
        Write-Host ""
        
        Write-Host "=== ANÁLISIS ===" -ForegroundColor Cyan
        Write-Host "Balance disponible: $balanceSOL SOL" -ForegroundColor Green
        Write-Host "Cantidad a enviar: $CANTIDAD_DESEADA SOL" -ForegroundColor Yellow
        Write-Host "Fee de red: $FEE_ESTIMADO SOL" -ForegroundColor Gray
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
        $totalNecesario = $CANTIDAD_DESEADA + $FEE_ESTIMADO
        Write-Host "Total necesario: $totalNecesario SOL" -ForegroundColor Cyan
        Write-Host ""
        
        $diferencia = $balanceSOL - $totalNecesario
        
        if ($diferencia -ge 0) {
            Write-Host "✅ TIENES SUFICIENTE SOL" -ForegroundColor Green
            Write-Host "Sobrante después del envío: $([math]::Round($diferencia, 9)) SOL" -ForegroundColor Green
            Write-Host ""
            Write-Host "Puedes enviar: $CANTIDAD_DESEADA SOL" -ForegroundColor Green
            Write-Host "Comando:" -ForegroundColor Cyan
            Write-Host "solana transfer <DIRECCION_DESTINO> $CANTIDAD_DESEADA --allow-unfunded-recipient" -ForegroundColor Yellow
        } else {
            Write-Host "❌ NO TIENES SUFICIENTE SOL" -ForegroundColor Red
            Write-Host "Falta: $([math]::Round([math]::Abs($diferencia), 9)) SOL" -ForegroundColor Red
            Write-Host ""
            
            # Calcular cuánto puede enviar realmente
            $maximoEnviable = $balanceSOL - $FEE_ESTIMADO
            if ($maximoEnviable -gt 0) {
                Write-Host "=== SOLUCIÓN ===" -ForegroundColor Cyan
                Write-Host "Puedes enviar máximo: $([math]::Round($maximoEnviable, 9)) SOL" -ForegroundColor Yellow
                Write-Host "(Balance - Fee = $balanceSOL - $FEE_ESTIMADO = $maximoEnviable)" -ForegroundColor Gray
                Write-Host ""
                Write-Host "Comando:" -ForegroundColor Cyan
                Write-Host "solana transfer <DIRECCION_DESTINO> $([math]::Round($maximoEnviable, 9)) --allow-unfunded-recipient" -ForegroundColor Yellow
            } else {
                Write-Host "❌ Tu balance es menor que el fee mínimo" -ForegroundColor Red
                Write-Host "Necesitas al menos $FEE_ESTIMADO SOL solo para el fee" -ForegroundColor Red
                Write-Host "Debes obtener más SOL primero" -ForegroundColor Yellow
            }
        }
        
        Write-Host ""
        Write-Host "=== COMPARACIÓN ===" -ForegroundColor Cyan
        Write-Host "Balance mostrado en wallet: 0.00132799 SOL" -ForegroundColor Gray
        Write-Host "Balance real en blockchain: $balanceSOL SOL" -ForegroundColor $(if ($balanceSOL -eq 0.00132799) { "Green" } else { "Yellow" })
        
        if ($balanceSOL -ne 0.00132799) {
            Write-Host ""
            Write-Host "⚠️ Diferencia detectada entre wallet y blockchain" -ForegroundColor Yellow
            Write-Host "Puede haber transacciones pendientes o el balance mostrado no está actualizado" -ForegroundColor Yellow
        }
        
    } else {
        Write-Host "❌ No se pudo obtener el balance" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Error al obtener balance: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== RECOMENDACIONES ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Verifica el balance real en:" -ForegroundColor Yellow
Write-Host "   https://explorer.solana.com/address/$OWNER_ADDRESS" -ForegroundColor Gray
Write-Host "   https://solscan.io/account/$OWNER_ADDRESS" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Si el balance es insuficiente:" -ForegroundColor Yellow
Write-Host "   - Reduce la cantidad a enviar" -ForegroundColor Gray
Write-Host "   - Obtén más SOL para cubrir el fee" -ForegroundColor Gray
Write-Host ""
Write-Host "3. El fee puede variar ligeramente:" -ForegroundColor Yellow
Write-Host "   - Fee típico: 0.000005 SOL" -ForegroundColor Gray
Write-Host "   - En momentos de congestión puede ser mayor" -ForegroundColor Gray
