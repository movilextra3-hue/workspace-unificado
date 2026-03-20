# Calcular el máximo que puedes enviar con tu balance actual
$OWNER_ADDRESS = "J3RX9CBrwB7vZmwNytRsJkJA9Wq7y6kwP25AZsX34TJa"
$BALANCE_WALLET = 0.00132799  # Balance mostrado en wallet
$FEE_CONSERVADOR = 0.00001  # Fee más conservador (por si acaso)

Write-Host "=== CÁLCULO: MÁXIMO QUE PUEDES ENVIAR ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "Balance en wallet: $BALANCE_WALLET SOL" -ForegroundColor Yellow
Write-Host ""

Write-Host "=== OPCIONES DE CÁLCULO ===" -ForegroundColor Cyan
Write-Host ""

# Opción 1: Fee mínimo
$feeMinimo = 0.000005
$maximoMinimo = $BALANCE_WALLET - $feeMinimo
Write-Host "OPCIÓN 1: Con fee mínimo (0.000005 SOL)" -ForegroundColor Green
Write-Host "  Puedes enviar: $([math]::Round($maximoMinimo, 9)) SOL" -ForegroundColor Green
Write-Host "  Balance: $BALANCE_WALLET - Fee: $feeMinimo = $([math]::Round($maximoMinimo, 9))" -ForegroundColor Gray
Write-Host ""

# Opción 2: Fee conservador
$maximoConservador = $BALANCE_WALLET - $FEE_CONSERVADOR
Write-Host "OPCIÓN 2: Con fee conservador (0.00001 SOL)" -ForegroundColor Yellow
Write-Host "  Puedes enviar: $([math]::Round($maximoConservador, 9)) SOL" -ForegroundColor Yellow
Write-Host "  Balance: $BALANCE_WALLET - Fee: $FEE_CONSERVADOR = $([math]::Round($maximoConservador, 9))" -ForegroundColor Gray
Write-Host ""

# Opción 3: Para $0.13 USD
$precioSOL = 104.67
$dolaresDeseados = 0.13
$solDeseado = $dolaresDeseados / $precioSOL
$totalNecesario = $solDeseado + $FEE_CONSERVADOR

Write-Host "OPCIÓN 3: Para enviar equivalente a `$$dolaresDeseados USD" -ForegroundColor Cyan
Write-Host "  SOL deseado: $([math]::Round($solDeseado, 9)) SOL" -ForegroundColor Gray
Write-Host "  Fee: $FEE_CONSERVADOR SOL" -ForegroundColor Gray
Write-Host "  Total necesario: $([math]::Round($totalNecesario, 9)) SOL" -ForegroundColor Gray
Write-Host "  Tienes: $BALANCE_WALLET SOL" -ForegroundColor Gray

if ($BALANCE_WALLET -ge $totalNecesario) {
    Write-Host "  ✅ SÍ puedes enviar $([math]::Round($solDeseado, 9)) SOL" -ForegroundColor Green
    $sobrante = $BALANCE_WALLET - $totalNecesario
    Write-Host "  Sobrante: $([math]::Round($sobrante, 9)) SOL" -ForegroundColor Green
} else {
    Write-Host "  ❌ NO puedes enviar $([math]::Round($solDeseado, 9)) SOL" -ForegroundColor Red
    $falta = $totalNecesario - $BALANCE_WALLET
    Write-Host "  Falta: $([math]::Round($falta, 9)) SOL" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Máximo que puedes enviar: $([math]::Round($maximoConservador, 9)) SOL" -ForegroundColor Yellow
    $dolaresMaximo = $maximoConservador * $precioSOL
    Write-Host "  Equivale a: `$$([math]::Round($dolaresMaximo, 2)) USD" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== RECOMENDACIÓN ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para enviar equivalente a `$0.13 USD de forma segura:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Cantidad a enviar: $([math]::Round($maximoConservador, 9)) SOL" -ForegroundColor Green
Write-Host "Fee reservado: $FEE_CONSERVADOR SOL" -ForegroundColor Gray
Write-Host "Total: $BALANCE_WALLET SOL" -ForegroundColor Gray
Write-Host ""
Write-Host "Esto te da un margen de seguridad por si el fee es mayor." -ForegroundColor Yellow
Write-Host ""

Write-Host "=== COMANDO RECOMENDADO ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para enviar el máximo seguro:" -ForegroundColor Yellow
Write-Host "solana transfer <DIRECCION_DESTINO> $([math]::Round($maximoConservador, 9)) --allow-unfunded-recipient" -ForegroundColor Green
Write-Host ""
Write-Host "O si quieres enviar exactamente para `$0.13 USD:" -ForegroundColor Yellow
Write-Host "solana transfer <DIRECCION_DESTINO> $([math]::Round($solDeseado, 9)) --allow-unfunded-recipient" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️ NOTA: Si la wallet sigue dando error, usa una cantidad ligeramente menor" -ForegroundColor Yellow
Write-Host "   Prueba con: $([math]::Round($maximoConservador - 0.000001, 9)) SOL" -ForegroundColor Gray
