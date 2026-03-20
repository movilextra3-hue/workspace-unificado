# Explicación sobre Owner vs Mint Authority
$MINT_ADDRESS = "DLyGgVVjcrsXvewd7PMr7H7FKpWiL96hymNvjZUCzeYf"
$OWNER_ADDRESS = "J3RX9CBrwB7vZmwNytRsJkJA9Wq7y6kwP25AZsX34TJa"

Write-Host "=== EXPLICACIÓN: OWNER vs MINT AUTHORITY ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "⚠️ DIFERENCIA IMPORTANTE:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. OWNER/CREADOR DE LA WALLET:" -ForegroundColor Green
Write-Host "   - Eres el dueño de la wallet que creó el token" -ForegroundColor Gray
Write-Host "   - Puedes transferir los tokens que tienes" -ForegroundColor Gray
Write-Host "   - Puedes ver información del token" -ForegroundColor Gray
Write-Host "   - NO puedes crear nuevos tokens" -ForegroundColor Red
Write-Host ""
Write-Host "2. MINT AUTHORITY:" -ForegroundColor Green
Write-Host "   - Es quien tiene el PODER de crear nuevos tokens" -ForegroundColor Gray
Write-Host "   - Se configura DURANTE la creación del token" -ForegroundColor Gray
Write-Host "   - Puede ser una dirección o NULL (ninguna)" -ForegroundColor Gray
Write-Host "   - Si es NULL, es IRREVERSIBLE" -ForegroundColor Red
Write-Host ""

Write-Host "=== VERIFICANDO TU TOKEN ===" -ForegroundColor Cyan
Write-Host ""

try {
    $body = @{
        jsonrpc = "2.0"
        id = 1
        method = "getAccountInfo"
        params = @($MINT_ADDRESS, @{ encoding = "jsonParsed" })
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "https://api.mainnet-beta.solana.com" -Method POST -Headers @{ "Content-Type" = "application/json" } -Body $body
    
    if ($response.result -and $response.result.value) {
        $mintInfo = $response.result.value.data.parsed.info
        
        Write-Host "Información del Token:" -ForegroundColor Yellow
        Write-Host "  Mint Address: $MINT_ADDRESS" -ForegroundColor Cyan
        Write-Host "  Owner Wallet: $OWNER_ADDRESS" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "  Mint Authority: " -NoNewline
        if ($mintInfo.mintAuthority) {
            Write-Host "$($mintInfo.mintAuthority)" -ForegroundColor Green
            Write-Host "  ✅ Tienes Mint Authority" -ForegroundColor Green
            Write-Host "  Puedes crear nuevos tokens" -ForegroundColor Green
        } else {
            Write-Host "NINGUNA (NULL)" -ForegroundColor Red
            Write-Host "  ❌ NO tienes Mint Authority" -ForegroundColor Red
            Write-Host "  NO puedes crear nuevos tokens" -ForegroundColor Red
            Write-Host "  Esto es IRREVERSIBLE" -ForegroundColor Red
        }
        Write-Host ""
        Write-Host "  Freeze Authority: " -NoNewline
        if ($mintInfo.freezeAuthority) {
            Write-Host "$($mintInfo.freezeAuthority)" -ForegroundColor Cyan
        } else {
            Write-Host "NINGUNA (NULL)" -ForegroundColor Gray
        }
        Write-Host ""
        Write-Host "  Supply Total: $($mintInfo.supply)" -ForegroundColor Cyan
        Write-Host "  Decimals: $($mintInfo.decimals)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "Error al obtener información: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== ¿POR QUÉ NO PUEDES CREAR MÁS TOKENS? ===" -ForegroundColor Yellow
Write-Host ""
Write-Host "Cuando creaste el token, se configuró:" -ForegroundColor Cyan
Write-Host "  Mint Authority = NULL (ninguna)" -ForegroundColor Red
Write-Host ""
Write-Host "Esto significa:" -ForegroundColor Cyan
Write-Host "  ❌ El supply está FIJO en 500,000,000,000 tokens" -ForegroundColor Red
Write-Host "  ❌ NO se pueden crear nuevos tokens" -ForegroundColor Red
Write-Host "  ❌ NO se pueden quemar tokens" -ForegroundColor Red
Write-Host "  ❌ Esto es IRREVERSIBLE" -ForegroundColor Red
Write-Host ""
Write-Host "Ventajas de esto:" -ForegroundColor Green
Write-Host "  ✅ El token es completamente descentralizado" -ForegroundColor Green
Write-Host "  ✅ Nadie puede crear más tokens (incluido tú)" -ForegroundColor Green
Write-Host "  ✅ Mayor confianza para los holders" -ForegroundColor Green
Write-Host "  ✅ No hay riesgo de inflación" -ForegroundColor Green
Write-Host ""

Write-Host "=== ¿QUÉ PODRÍAS HABER HECHO DIFERENTE? ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Si hubieras querido poder crear más tokens:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Durante la creación, configurar:" -ForegroundColor Cyan
Write-Host "   Mint Authority = Tu dirección ($OWNER_ADDRESS)" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Luego podrías:" -ForegroundColor Cyan
Write-Host "   ✅ Crear nuevos tokens cuando quieras" -ForegroundColor Green
Write-Host "   ✅ Quemar tokens si es necesario" -ForegroundColor Green
Write-Host "   ✅ Controlar el supply" -ForegroundColor Green
Write-Host ""
Write-Host "3. O configurar un programa como Mint Authority:" -ForegroundColor Cyan
Write-Host "   Para tener lógica programática de creación" -ForegroundColor Gray
Write-Host ""

Write-Host "=== ¿QUÉ PUEDES HACER AHORA? ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Opciones disponibles:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Transferir tus tokens existentes" -ForegroundColor Green
Write-Host "   Tienes 50,565.810654 tokens que puedes transferir" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Crear un NUEVO token (si necesitas más supply)" -ForegroundColor Green
Write-Host "   Pero sería un token diferente con nueva dirección" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Aceptar que el supply está fijo" -ForegroundColor Green
Write-Host "   Esto es común y preferido para muchos tokens" -ForegroundColor Gray
Write-Host ""

Write-Host "=== CONCLUSIÓN ===" -ForegroundColor Yellow
Write-Host ""
Write-Host "Eres el OWNER de la wallet que creó el token," -ForegroundColor Cyan
Write-Host "pero NO tienes MINT AUTHORITY porque se configuró como NULL." -ForegroundColor Cyan
Write-Host ""
Write-Host "Esto es IRREVERSIBLE y es una característica del token," -ForegroundColor Yellow
Write-Host "no un error. Muchos tokens se crean así para mayor descentralización." -ForegroundColor Yellow
Write-Host ""
