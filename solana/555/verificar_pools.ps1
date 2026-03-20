# Script para verificar pools de liquidez
Write-Host "=== VERIFICACIÓN DE POOLS DE LIQUIDEZ ===" -ForegroundColor Cyan
Write-Host ""

# BitcoinMexicano - PancakeSwap en BSC
$BTCMX_ROUTER = "0x10ED43C718714eb63d5aA57B78B54704E256024E"  # PancakeSwap Router
$BSC_RPC = "https://bsc-dataseed1.binance.org"

Write-Host "=== BITCOINMEXICANO (BTCMX) ===" -ForegroundColor Yellow
Write-Host ""
Write-Host "Router: $BTCMX_ROUTER (PancakeSwap)" -ForegroundColor Gray
Write-Host ""
Write-Host "Para verificar el pool:" -ForegroundColor Cyan
Write-Host "1. Necesitas la dirección del contrato BTCMX" -ForegroundColor Gray
Write-Host "2. Calcula la dirección del pair:" -ForegroundColor Gray
Write-Host "   - Usa el Factory de PancakeSwap" -ForegroundColor Gray
Write-Host "   - Pair = createPair(BTCMX, WETH)" -ForegroundColor Gray
Write-Host "3. Verifica balances del pair en BSCScan" -ForegroundColor Gray
Write-Host ""

Write-Host "=== EXPLICACIÓN: ¿POR QUÉ ES 'GRATIS'? ===" -ForegroundColor Green
Write-Host ""
Write-Host "1. CREAR UN PAIR:" -ForegroundColor Yellow
Write-Host "   - Función del protocolo DEX (Uniswap/PancakeSwap)" -ForegroundColor Gray
Write-Host "   - No requiere tokens ni BNB" -ForegroundColor Gray
Write-Host "   - Solo cuesta gas de transacción (~100k-200k gas)" -ForegroundColor Gray
Write-Host "   - Equivale a ~$0.10-0.50 USD" -ForegroundColor Gray
Write-Host "   - ✅ Es 'gratis' en el sentido de que no requiere capital" -ForegroundColor Green
Write-Host ""
Write-Host "2. AGREGAR LIQUIDEZ:" -ForegroundColor Yellow
Write-Host "   - Requiere tokens del proyecto" -ForegroundColor Gray
Write-Host "   - Requiere BNB equivalente" -ForegroundColor Gray
Write-Host "   - Requiere gas adicional" -ForegroundColor Gray
Write-Host "   - ❌ Esto SÍ cuesta dinero real" -ForegroundColor Red
Write-Host ""

Write-Host "=== ESTADO TÍPICO DESPUÉS DEL DEPLOYMENT ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "BitcoinMexicano:" -ForegroundColor Yellow
Write-Host "  ✅ Pair creado (gratis - solo gas)" -ForegroundColor Green
Write-Host "  ✅ Tokens minteados al owner" -ForegroundColor Green
Write-Host "  ❌ Pool VACÍO (sin liquidez)" -ForegroundColor Red
Write-Host "  ⚠️  Owner debe agregar liquidez después" -ForegroundColor Yellow
Write-Host ""
Write-Host "QryptaQuantumToken:" -ForegroundColor Yellow
Write-Host "  ❓ Pair puede no estar creado" -ForegroundColor Gray
Write-Host "  ✅ Tokens minteados al owner" -ForegroundColor Green
Write-Host "  ❓ Pool puede no existir o estar vacío" -ForegroundColor Gray
Write-Host ""

Write-Host "=== CÓMO VERIFICAR SI TIENEN LIQUIDEZ ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Método 1: BSCScan/Etherscan" -ForegroundColor Yellow
Write-Host "  1. Busca la dirección del pair" -ForegroundColor Gray
Write-Host "  2. Ve a la pestaña 'Token' o 'Read Contract'" -ForegroundColor Gray
Write-Host "  3. Verifica balanceOf para el token y WETH" -ForegroundColor Gray
Write-Host "  4. Si ambos > 0 → Tiene liquidez" -ForegroundColor Green
Write-Host "  5. Si ambos = 0 → Pool vacío" -ForegroundColor Red
Write-Host ""
Write-Host "Método 2: PancakeSwap/Uniswap Interface" -ForegroundColor Yellow
Write-Host "  1. Ve a la interfaz del DEX" -ForegroundColor Gray
Write-Host "  2. Busca el par token/WETH" -ForegroundColor Gray
Write-Host "  3. Si aparece y tiene precio → Tiene liquidez" -ForegroundColor Green
Write-Host "  4. Si no aparece o precio = 0 → Sin liquidez" -ForegroundColor Red
Write-Host ""
Write-Host "Método 3: API del DEX" -ForegroundColor Yellow
Write-Host "  Usa la API de PancakeSwap/Uniswap" -ForegroundColor Gray
Write-Host "  Consulta reserves del pair" -ForegroundColor Gray
Write-Host ""

Write-Host "=== CONCLUSIÓN ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Crear un pair es 'gratis' (solo gas)" -ForegroundColor Green
Write-Host "❌ Agregar liquidez SÍ cuesta (tokens + BNB)" -ForegroundColor Red
Write-Host "⚠️  Tener un pair ≠ Tener liquidez" -ForegroundColor Yellow
Write-Host "⚠️  Ambos pueden tener pairs pero vacíos" -ForegroundColor Yellow
Write-Host ""
Write-Host "Para que un pool sea funcional:" -ForegroundColor Cyan
Write-Host "  1. Pair debe estar creado ✅" -ForegroundColor Gray
Write-Host "  2. Debe tener liquidez agregada ❌ (esto cuesta)" -ForegroundColor Gray
