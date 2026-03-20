# Instalación simple de Solana CLI
Write-Host "=== INSTALACIÓN DE SOLANA CLI ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "MÉTODO MÁS SIMPLE:" -ForegroundColor Green
Write-Host ""
Write-Host "1. Abre tu navegador" -ForegroundColor Yellow
Write-Host "2. Ve a esta URL:" -ForegroundColor Yellow
Write-Host "   https://github.com/solana-labs/solana/releases/latest" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Descarga el archivo:" -ForegroundColor Yellow
Write-Host "   solana-install-init-x86_64-pc-windows-msvc.exe" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Ejecuta el archivo .exe descargado" -ForegroundColor Yellow
Write-Host "5. Sigue las instrucciones del instalador" -ForegroundColor Yellow
Write-Host "6. Cierra y abre una nueva terminal PowerShell" -ForegroundColor Yellow
Write-Host "7. Verifica con: solana --version" -ForegroundColor Yellow
Write-Host ""

Write-Host "=== O USAR ESTE COMANDO EN POWERSHELL ===" -ForegroundColor Green
Write-Host ""
Write-Host "Ejecuta esto en PowerShell (como Administrador):" -ForegroundColor Yellow
Write-Host ""
Write-Host 'sh -c "$(curl -sSfL https://release.solana.com/stable/install)"' -ForegroundColor Cyan
Write-Host ""
Write-Host "O si eso no funciona, descarga manualmente desde:" -ForegroundColor Yellow
Write-Host "https://docs.solana.com/cli/install-solana-cli-tools" -ForegroundColor Cyan
Write-Host ""

Write-Host "=== ALTERNATIVA: USAR SIN CLI ===" -ForegroundColor Green
Write-Host ""
Write-Host "Si no puedes instalar la CLI, puedes usar los scripts JavaScript:" -ForegroundColor Yellow
Write-Host "1. Instala Node.js: https://nodejs.org/" -ForegroundColor Gray
Write-Host "2. Instala dependencias: npm install @solana/web3.js bs58" -ForegroundColor Gray
Write-Host "3. Usa el script enviar_sol.js que ya creamos" -ForegroundColor Gray
Write-Host ""

$abrir = Read-Host "¿Quieres que abra el navegador en la página de descarga? (s/n)"
if ($abrir -eq "s" -or $abrir -eq "S") {
    Start-Process "https://github.com/solana-labs/solana/releases/latest"
    Write-Host "Navegador abierto. Busca y descarga: solana-install-init-x86_64-pc-windows-msvc.exe" -ForegroundColor Green
}
