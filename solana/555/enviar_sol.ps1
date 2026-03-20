# Script para enviar SOL restando la tarifa de red
$OWNER_ADDRESS = "J3RX9CBrwB7vZmwNytRsJkJA9Wq7y6kwP25AZsX34TJa"
$CANTIDAD_NETA = 0.00132799  # Cantidad que debe recibir el destinatario
$FEE_ESTIMADO = 0.000005  # Fee aproximado de Solana (puede variar)

Write-Host "=== ENVIAR SOL RESTANDO TARIFA DE RED ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Cantidad neta a recibir: $CANTIDAD_NETA SOL" -ForegroundColor Yellow
Write-Host "Fee estimado: ~$FEE_ESTIMADO SOL" -ForegroundColor Gray
Write-Host "Cantidad total a enviar: $($CANTIDAD_NETA + $FEE_ESTIMADO) SOL" -ForegroundColor Green
Write-Host ""

# Verificar que Solana CLI está instalado
$solanaInstalled = Get-Command solana -ErrorAction SilentlyContinue

if (-not $solanaInstalled) {
    Write-Host "❌ Solana CLI no está instalado" -ForegroundColor Red
    Write-Host "Instala desde: https://docs.solana.com/cli/install-solana-cli-tools" -ForegroundColor Yellow
    exit
}

Write-Host "✓ Solana CLI verificado" -ForegroundColor Green
Write-Host ""

# Solicitar dirección destino
Write-Host "=== INFORMACIÓN REQUERIDA ===" -ForegroundColor Cyan
$destino = Read-Host "Ingresa la dirección destino (44 caracteres)"

if ($destino.Length -ne 44) {
    Write-Host "❌ Error: La dirección debe tener 44 caracteres" -ForegroundColor Red
    Write-Host "Longitud recibida: $($destino.Length)" -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "Dirección destino: $destino" -ForegroundColor Cyan
Write-Host ""

# Verificar balance actual
Write-Host "=== VERIFICANDO BALANCE ===" -ForegroundColor Green
try {
    Write-Host "Ejecutando: solana balance" -ForegroundColor Cyan
    $balanceOutput = solana balance 2>&1
    Write-Host $balanceOutput -ForegroundColor Cyan
    
    # Extraer el balance numérico
    if ($balanceOutput -match "(\d+\.?\d*)\s*SOL") {
        $balanceActual = [double]$matches[1]
        Write-Host ""
        Write-Host "Balance actual: $balanceActual SOL" -ForegroundColor Green
        
        $cantidadTotal = $CANTIDAD_NETA + $FEE_ESTIMADO
        if ($balanceActual -lt $cantidadTotal) {
            Write-Host ""
            Write-Host "❌ Error: Balance insuficiente" -ForegroundColor Red
            Write-Host "Necesitas: $cantidadTotal SOL" -ForegroundColor Red
            Write-Host "Tienes: $balanceActual SOL" -ForegroundColor Red
            Write-Host "Falta: $($cantidadTotal - $balanceActual) SOL" -ForegroundColor Red
            exit
        }
    }
} catch {
    Write-Host "⚠️ No se pudo obtener el balance automáticamente" -ForegroundColor Yellow
    Write-Host "Asegúrate de tener configurada tu clave privada:" -ForegroundColor Yellow
    Write-Host "  solana config set --keypair <ruta_clave_privada.json>" -ForegroundColor Gray
    Write-Host ""
}

Write-Host ""
Write-Host "=== OBTENIENDO FEE REAL ===" -ForegroundColor Green
Write-Host "Calculando fee actual de la red..." -ForegroundColor Cyan

# Obtener fee real de la red
try {
    $feeBody = @{
        jsonrpc = "2.0"
        id = 1
        method = "getRecentPrioritizationFees"
        params = @()
    } | ConvertTo-Json
    
    $feeResponse = Invoke-RestMethod -Uri "https://api.mainnet-beta.solana.com" -Method POST -Headers @{ "Content-Type" = "application/json" } -Body $feeBody
    
    if ($feeResponse.result -and $feeResponse.result.Count -gt 0) {
        # Obtener el fee promedio
        $fees = $feeResponse.result | ForEach-Object { $_.prioritizationFee }
        $feePromedio = ($fees | Measure-Object -Average).Average
        $feeSOL = [math]::Round($feePromedio / 1000000000, 9)
        
        Write-Host "Fee promedio de la red: $feeSOL SOL" -ForegroundColor Cyan
        
        # Fee base de Solana es ~0.000005 SOL, pero puede variar
        $feeFinal = [math]::Max(0.000005, $feeSOL)
    } else {
        $feeFinal = $FEE_ESTIMADO
        Write-Host "Usando fee estimado: $feeFinal SOL" -ForegroundColor Yellow
    }
} catch {
    $feeFinal = $FEE_ESTIMADO
    Write-Host "Usando fee estimado: $feeFinal SOL" -ForegroundColor Yellow
}

$cantidadTotal = $CANTIDAD_NETA + $feeFinal

Write-Host ""
Write-Host "=== RESUMEN DE LA TRANSACCIÓN ===" -ForegroundColor Cyan
Write-Host "Cantidad neta a recibir: $CANTIDAD_NETA SOL" -ForegroundColor Green
Write-Host "Fee estimado: $feeFinal SOL" -ForegroundColor Gray
Write-Host "Cantidad total a enviar: $cantidadTotal SOL" -ForegroundColor Yellow
Write-Host "Dirección destino: $destino" -ForegroundColor Cyan
Write-Host ""

# Confirmar
Write-Host "⚠️ ADVERTENCIA:" -ForegroundColor Red
Write-Host "  - Esta transacción es IRREVERSIBLE" -ForegroundColor Red
Write-Host "  - Verifica bien la dirección destino" -ForegroundColor Yellow
Write-Host ""

$confirmar = Read-Host "¿Confirmas el envío? (s/n)"

if ($confirmar -ne "s" -and $confirmar -ne "S") {
    Write-Host "Operación cancelada." -ForegroundColor Yellow
    exit
}

Write-Host ""
Write-Host "=== EJECUTANDO TRANSFERENCIA ===" -ForegroundColor Green
Write-Host ""

# Ejecutar transferencia
Write-Host "Comando a ejecutar:" -ForegroundColor Cyan
Write-Host "solana transfer $destino $cantidadTotal --allow-unfunded-recipient" -ForegroundColor Yellow
Write-Host ""

$ejecutar = Read-Host "¿Ejecutar ahora? (s/n)"

if ($ejecutar -eq "s" -or $ejecutar -eq "S") {
    try {
        Write-Host "Ejecutando transferencia..." -ForegroundColor Cyan
        $resultado = solana transfer $destino $cantidadTotal --allow-unfunded-recipient 2>&1
        
        Write-Host ""
        Write-Host "=== RESULTADO ===" -ForegroundColor Green
        Write-Host $resultado -ForegroundColor Cyan
        
        # Extraer signature si existe
        if ($resultado -match "Signature:\s*(\w+)") {
            $signature = $matches[1]
            Write-Host ""
            Write-Host "✅ Transacción enviada exitosamente" -ForegroundColor Green
            Write-Host "Signature: $signature" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "Verificar en:" -ForegroundColor Yellow
            Write-Host "  https://explorer.solana.com/tx/$signature" -ForegroundColor Gray
            Write-Host "  https://solscan.io/tx/$signature" -ForegroundColor Gray
            Write-Host ""
            Write-Host "Verificando confirmación..." -ForegroundColor Cyan
            Start-Sleep -Seconds 3
            solana confirm $signature
        }
    } catch {
        Write-Host ""
        Write-Host "❌ Error al ejecutar la transferencia" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
        Write-Host ""
        Write-Host "Verifica:" -ForegroundColor Yellow
        Write-Host "  1. Que tu clave privada esté configurada" -ForegroundColor Gray
        Write-Host "  2. Que tengas suficiente balance" -ForegroundColor Gray
        Write-Host "  3. Que la dirección destino sea válida" -ForegroundColor Gray
    }
} else {
    Write-Host ""
    Write-Host "=== COMANDO PARA EJECUTAR MANUALMENTE ===" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Ejecuta este comando:" -ForegroundColor Yellow
    Write-Host "solana transfer $destino $cantidadTotal --allow-unfunded-recipient" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "O si quieres especificar el fee exacto:" -ForegroundColor Gray
    Write-Host "solana transfer $destino $cantidadTotal --fee-payer <ruta_clave> --allow-unfunded-recipient" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== NOTAS ===" -ForegroundColor Yellow
Write-Host "1. El fee puede variar ligeramente según la congestión de la red" -ForegroundColor Gray
Write-Host "2. La cantidad neta recibida puede ser ligeramente menor si el fee real es mayor" -ForegroundColor Gray
Write-Host "3. Usa '--allow-unfunded-recipient' si la dirección destino no tiene SOL" -ForegroundColor Gray
Write-Host "4. Verifica siempre la dirección destino antes de enviar" -ForegroundColor Gray
