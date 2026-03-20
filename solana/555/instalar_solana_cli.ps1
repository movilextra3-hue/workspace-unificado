# Script para instalar Solana CLI en Windows
Write-Host "=== INSTALACIÓN DE SOLANA CLI EN WINDOWS ===" -ForegroundColor Cyan
Write-Host ""

# Verificar si ya está instalado
$solanaInstalled = Get-Command solana -ErrorAction SilentlyContinue

if ($solanaInstalled) {
    Write-Host "✓ Solana CLI ya está instalado" -ForegroundColor Green
    solana --version
    Write-Host ""
    Write-Host "Si quieres reinstalar o actualizar, continúa con el proceso." -ForegroundColor Yellow
    Write-Host ""
    $continuar = Read-Host "¿Deseas continuar con la instalación? (s/n)"
    if ($continuar -ne "s" -and $continuar -ne "S") {
        exit
    }
}

Write-Host "=== MÉTODO 1: INSTALADOR OFICIAL (RECOMENDADO) ===" -ForegroundColor Green
Write-Host ""

Write-Host "PASO 1: Descargar el instalador" -ForegroundColor Yellow
Write-Host "  Opción A: Desde GitHub (recomendado)" -ForegroundColor Cyan
Write-Host "    URL: https://github.com/solana-labs/solana/releases/latest" -ForegroundColor Gray
Write-Host "    Busca: solana-install-init-x86_64-pc-windows-msvc.exe" -ForegroundColor Gray
Write-Host ""
Write-Host "  Opción B: Usar el script de instalación automática" -ForegroundColor Cyan
Write-Host ""

$metodo = Read-Host "¿Quieres descargar automáticamente? (s/n)"

if ($metodo -eq "s" -or $metodo -eq "S") {
    Write-Host ""
    Write-Host "Descargando instalador..." -ForegroundColor Green
    
    try {
        # Obtener la última versión
        $releaseUrl = "https://api.github.com/repos/solana-labs/solana/releases/latest"
        $releaseInfo = Invoke-RestMethod -Uri $releaseUrl
        
        # Buscar el asset de Windows
        $windowsAsset = $releaseInfo.assets | Where-Object { $_.name -like "*windows*" -or $_.name -like "*x86_64-pc-windows*" }
        
        if ($windowsAsset) {
            $downloadUrl = $windowsAsset.browser_download_url
            $fileName = $windowsAsset.name
            $downloadPath = "$env:TEMP\$fileName"
            
            Write-Host "Descargando: $fileName" -ForegroundColor Cyan
            Write-Host "Desde: $downloadUrl" -ForegroundColor Gray
            
            Invoke-WebRequest -Uri $downloadUrl -OutFile $downloadPath
            
            Write-Host "✓ Descarga completada" -ForegroundColor Green
            Write-Host ""
            Write-Host "Archivo descargado en: $downloadPath" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "PASO 2: Ejecutar el instalador" -ForegroundColor Yellow
            Write-Host "  Ejecuta el archivo descargado o usa:" -ForegroundColor Gray
            Write-Host "  Start-Process '$downloadPath'" -ForegroundColor Yellow
            
            $ejecutar = Read-Host "¿Ejecutar instalador ahora? (s/n)"
            if ($ejecutar -eq "s" -or $ejecutar -eq "S") {
                Start-Process $downloadPath
                Write-Host "Instalador ejecutado. Sigue las instrucciones en pantalla." -ForegroundColor Green
            }
        } else {
            Write-Host "⚠️ No se encontró instalador de Windows en la última release" -ForegroundColor Yellow
            Write-Host "Usa el método manual desde: https://github.com/solana-labs/solana/releases" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "❌ Error al descargar: $_" -ForegroundColor Red
        Write-Host "Usa el método manual" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=== MÉTODO 2: INSTALACIÓN MANUAL ===" -ForegroundColor Green
Write-Host ""
Write-Host "PASO 1: Descargar desde GitHub" -ForegroundColor Yellow
Write-Host "  1. Ve a: https://github.com/solana-labs/solana/releases/latest" -ForegroundColor Gray
Write-Host "  2. Descarga: solana-install-init-x86_64-pc-windows-msvc.exe" -ForegroundColor Gray
Write-Host "  3. Ejecuta el instalador" -ForegroundColor Gray
Write-Host ""
Write-Host "PASO 2: Agregar al PATH (si es necesario)" -ForegroundColor Yellow
Write-Host "  El instalador normalmente agrega Solana al PATH automáticamente" -ForegroundColor Gray
Write-Host "  Si no funciona, agrega manualmente:" -ForegroundColor Gray
Write-Host "  C:\Users\$env:USERNAME\.local\share\solana\install\active_release\bin" -ForegroundColor Cyan
Write-Host ""

Write-Host "=== MÉTODO 3: USANDO CARGO (RUST) ===" -ForegroundColor Green
Write-Host ""
Write-Host "Si tienes Rust/Cargo instalado:" -ForegroundColor Yellow
Write-Host "  cargo install --git https://github.com/solana-labs/solana solana-cli --locked" -ForegroundColor Cyan
Write-Host ""

Write-Host "=== VERIFICAR INSTALACIÓN ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Después de instalar, cierra y abre una nueva terminal, luego ejecuta:" -ForegroundColor Yellow
Write-Host "  solana --version" -ForegroundColor Green
Write-Host ""

Write-Host "=== SOLUCIÓN DE PROBLEMAS ===" -ForegroundColor Yellow
Write-Host ""
Write-Host "Si 'solana' no se reconoce como comando:" -ForegroundColor Red
Write-Host ""
Write-Host "1. Cierra y abre una nueva terminal PowerShell" -ForegroundColor Gray
Write-Host "2. Verifica el PATH:" -ForegroundColor Gray
Write-Host "   `$env:PATH -split ';' | Select-String 'solana'" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Agrega manualmente al PATH si es necesario:" -ForegroundColor Gray
Write-Host "   [Environment]::SetEnvironmentVariable('Path', `$env:Path + ';C:\Users\$env:USERNAME\.local\share\solana\install\active_release\bin', 'User')" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Reinicia PowerShell después de agregar al PATH" -ForegroundColor Gray
Write-Host ""

Write-Host "=== ALTERNATIVA: USAR NPM ===" -ForegroundColor Green
Write-Host ""
Write-Host "Si tienes Node.js instalado, puedes usar:" -ForegroundColor Yellow
Write-Host "  npm install -g @solana/web3.js" -ForegroundColor Cyan
Write-Host "  (Esto instala las librerías, no la CLI completa)" -ForegroundColor Gray
Write-Host ""

$verificar = Read-Host "¿Quieres verificar si Solana CLI está instalado ahora? (s/n)"
if ($verificar -eq "s" -or $verificar -eq "S") {
    Write-Host ""
    Write-Host "Verificando..." -ForegroundColor Cyan
    $solanaCheck = Get-Command solana -ErrorAction SilentlyContinue
    if ($solanaCheck) {
        Write-Host "✓ Solana CLI encontrado" -ForegroundColor Green
        solana --version
    } else {
        Write-Host "❌ Solana CLI no encontrado en el PATH" -ForegroundColor Red
        Write-Host ""
        Write-Host "Ubicaciones comunes donde buscar:" -ForegroundColor Yellow
        $paths = @(
            "$env:USERPROFILE\.local\share\solana\install\active_release\bin",
            "$env:LOCALAPPDATA\solana\install\active_release\bin",
            "C:\Program Files\Solana\bin"
        )
        foreach ($path in $paths) {
            if (Test-Path $path) {
                Write-Host "  ✓ Encontrado en: $path" -ForegroundColor Green
                Write-Host "    Agrega esta ruta al PATH" -ForegroundColor Yellow
            } else {
                Write-Host "  ✗ No encontrado en: $path" -ForegroundColor Gray
            }
        }
    }
}
