# Guía para crear un nuevo token CON Mint Authority
# Si necesitas poder crear más tokens en el futuro

Write-Host "=== GUÍA: CREAR NUEVO TOKEN CON MINT AUTHORITY ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️ IMPORTANTE:" -ForegroundColor Yellow
Write-Host "  - Esto creará un NUEVO token (diferente al actual)" -ForegroundColor Yellow
Write-Host "  - El token actual NO se puede modificar" -ForegroundColor Yellow
Write-Host "  - Necesitas tener Solana CLI y SPL Token CLI instalados" -ForegroundColor Yellow
Write-Host ""

Write-Host "=== REQUISITOS ===" -ForegroundColor Green
Write-Host ""
Write-Host "1. Solana CLI instalado" -ForegroundColor Cyan
Write-Host "   Verificar: solana --version" -ForegroundColor Gray
Write-Host ""
Write-Host "2. SPL Token CLI instalado" -ForegroundColor Cyan
Write-Host "   Verificar: spl-token --version" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Clave privada configurada" -ForegroundColor Cyan
Write-Host "   Configurar: solana config set --keypair <ruta_clave>" -ForegroundColor Gray
Write-Host ""
Write-Host "4. SOL suficiente para fees" -ForegroundColor Cyan
Write-Host "   Necesitas ~0.01-0.02 SOL para crear el token" -ForegroundColor Gray
Write-Host ""

Write-Host "=== PASOS PARA CREAR NUEVO TOKEN ===" -ForegroundColor Green
Write-Host ""

Write-Host "PASO 1: Crear el token (esto te dará una nueva dirección)" -ForegroundColor Yellow
Write-Host "  spl-token create-token --decimals 6" -ForegroundColor Cyan
Write-Host "  # Esto mostrará: Creating token <NUEVA_DIRECCION>" -ForegroundColor Gray
Write-Host "  # Guarda esta dirección, es tu nuevo Mint Address" -ForegroundColor Gray
Write-Host ""

Write-Host "PASO 2: Crear una cuenta de token asociada" -ForegroundColor Yellow
Write-Host "  spl-token create-account <NUEVA_DIRECCION>" -ForegroundColor Cyan
Write-Host "  # Esto crea una cuenta para recibir los tokens iniciales" -ForegroundColor Gray
Write-Host ""

Write-Host "PASO 3: Crear tokens iniciales (MINT)" -ForegroundColor Yellow
Write-Host "  spl-token mint <NUEVA_DIRECCION> <cantidad>" -ForegroundColor Cyan
Write-Host "  # Ejemplo: spl-token mint <NUEVA_DIRECCION> 1000000000" -ForegroundColor Gray
Write-Host "  # Esto crea 1,000,000 tokens (con 6 decimales)" -ForegroundColor Gray
Write-Host ""

Write-Host "PASO 4: Verificar que tienes Mint Authority" -ForegroundColor Yellow
Write-Host "  spl-token display <NUEVA_DIRECCION>" -ForegroundColor Cyan
Write-Host "  # Debe mostrar tu dirección como Mint Authority" -ForegroundColor Gray
Write-Host ""

Write-Host "=== DIFERENCIAS CON TU TOKEN ACTUAL ===" -ForegroundColor Green
Write-Host ""
Write-Host "Token Actual:" -ForegroundColor Yellow
Write-Host "  - Mint Authority: NULL (ninguna)" -ForegroundColor Red
Write-Host "  - NO puedes crear más tokens" -ForegroundColor Red
Write-Host "  - Supply fijo: 500,000,000,000" -ForegroundColor Gray
Write-Host ""
Write-Host "Nuevo Token (con Mint Authority):" -ForegroundColor Yellow
Write-Host "  - Mint Authority: Tu dirección" -ForegroundColor Green
Write-Host "  - SÍ puedes crear más tokens" -ForegroundColor Green
Write-Host "  - Puedes controlar el supply" -ForegroundColor Green
Write-Host ""

Write-Host "=== COMANDOS ADICIONALES (con Mint Authority) ===" -ForegroundColor Green
Write-Host ""
Write-Host "Crear más tokens:" -ForegroundColor Cyan
Write-Host "  spl-token mint <NUEVA_DIRECCION> <cantidad>" -ForegroundColor Gray
Write-Host ""
Write-Host "Quemar tokens:" -ForegroundColor Cyan
Write-Host "  spl-token burn <cuenta_token> <cantidad>" -ForegroundColor Gray
Write-Host ""
Write-Host "Transferir Mint Authority a otra dirección:" -ForegroundColor Cyan
Write-Host "  spl-token authorize <NUEVA_DIRECCION> mint <nueva_autoridad>" -ForegroundColor Gray
Write-Host ""
Write-Host "Revocar Mint Authority (hacerlo NULL):" -ForegroundColor Cyan
Write-Host "  spl-token authorize <NUEVA_DIRECCION> mint --disable" -ForegroundColor Gray
Write-Host "  ⚠️ Esto es IRREVERSIBLE" -ForegroundColor Red
Write-Host ""

Write-Host "=== COSTOS APROXIMADOS ===" -ForegroundColor Green
Write-Host ""
Write-Host "Crear token: ~0.01 SOL" -ForegroundColor Gray
Write-Host "Crear cuenta: ~0.002 SOL" -ForegroundColor Gray
Write-Host "Mint tokens: ~0.000005 SOL por transacción" -ForegroundColor Gray
Write-Host "Total estimado: ~0.012 SOL" -ForegroundColor Cyan
Write-Host ""

Write-Host "=== ¿DEBES CREAR UN NUEVO TOKEN? ===" -ForegroundColor Yellow
Write-Host ""
Write-Host "SÍ, si:" -ForegroundColor Green
Write-Host "  - Necesitas poder crear más tokens en el futuro" -ForegroundColor Gray
Write-Host "  - Quieres controlar el supply" -ForegroundColor Gray
Write-Host "  - Estás empezando un nuevo proyecto" -ForegroundColor Gray
Write-Host ""
Write-Host "NO, si:" -ForegroundColor Red
Write-Host "  - Tu token actual ya está en uso" -ForegroundColor Gray
Write-Host "  - Prefieres supply fijo (más descentralizado)" -ForegroundColor Gray
Write-Host "  - No necesitas crear más tokens" -ForegroundColor Gray
Write-Host ""

$continuar = Read-Host "¿Deseas ver más información sobre cómo crear el token? (s/n)"
if ($continuar -eq "s" -or $continuar -eq "S") {
    Write-Host ""
    Write-Host "=== EJEMPLO COMPLETO ===" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "# 1. Crear token con 6 decimales" -ForegroundColor Gray
    Write-Host "spl-token create-token --decimals 6" -ForegroundColor Yellow
    Write-Host "# Output: Creating token ABC123..." -ForegroundColor Gray
    Write-Host ""
    Write-Host "# 2. Crear cuenta asociada" -ForegroundColor Gray
    Write-Host "spl-token create-account ABC123..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "# 3. Crear 1 millón de tokens iniciales" -ForegroundColor Gray
    Write-Host "spl-token mint ABC123... 1000000000000" -ForegroundColor Yellow
    Write-Host "# (1,000,000 tokens con 6 decimales = 1,000,000,000,000 unidades mínimas)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "# 4. Verificar" -ForegroundColor Gray
    Write-Host "spl-token display ABC123..." -ForegroundColor Yellow
    Write-Host "spl-token balance ABC123..." -ForegroundColor Yellow
}
