# Script para verificar dirección de Solana
$address = "DLyGgVVjcrsXvewd7PMr7H7FKpWiL96hymNvjZUCzeYf"

Write-Host "=== Verificación de Dirección Solana ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "Dirección: $address" -ForegroundColor Yellow
Write-Host "Longitud: $($address.Length) caracteres" -ForegroundColor Gray

# Verificar formato Base58
$base58Chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
$isBase58 = $true
foreach ($char in $address.ToCharArray()) {
    if ($base58Chars.IndexOf($char) -eq -1) {
        $isBase58 = $false
        break
    }
}

Write-Host "Formato Base58 válido: $isBase58" -ForegroundColor $(if ($isBase58) { "Green" } else { "Red" })

# Longitud típica de direcciones Solana
if ($address.Length -eq 44) {
    Write-Host "Longitud correcta para dirección Solana (44 caracteres)" -ForegroundColor Green
} else {
    Write-Host "Longitud inusual para dirección Solana" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Información ===" -ForegroundColor Cyan
Write-Host "Esta parece ser una dirección de wallet/programa de Solana"
Write-Host ""
Write-Host "Para verificar el balance, puedes usar:" -ForegroundColor Yellow
Write-Host "  solana balance $address" -ForegroundColor Gray
Write-Host ""
Write-Host "Para obtener información del programa:" -ForegroundColor Yellow
Write-Host "  solana program show $address" -ForegroundColor Gray
Write-Host ""
Write-Host "Para verificar en Solana Explorer:" -ForegroundColor Yellow
Write-Host "  https://explorer.solana.com/address/$address" -ForegroundColor Cyan
Write-Host "  https://solscan.io/account/$address" -ForegroundColor Cyan

# Guardar en archivo si se desea
$saveToFile = Read-Host "¿Deseas guardar esta dirección en un archivo? (S/N)"
if ($saveToFile -eq "S" -or $saveToFile -eq "s") {
    $outputFile = "C:\Users\Administrador\Desktop\solana_address.txt"
    $address | Out-File $outputFile -Encoding UTF8
    Write-Host "Dirección guardada en: $outputFile" -ForegroundColor Green
}
