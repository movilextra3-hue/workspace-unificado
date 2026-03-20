# Instalación automática de Solana CLI
Write-Host "=== INSTALACIÓN AUTOMÁTICA DE SOLANA CLI ===" -ForegroundColor Cyan
Write-Host ""

# Verificar si ya está instalado
$solanaCheck = Get-Command solana -ErrorAction SilentlyContinue
if ($solanaCheck) {
    Write-Host "✓ Solana CLI ya está instalado" -ForegroundColor Green
    solana --version
    Write-Host ""
    Write-Host "Si quieres reinstalar, continúa." -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "MÉTODO 1: Descarga e instalación automática" -ForegroundColor Green
Write-Host ""

# Crear directorio temporal
$tempDir = "$env:TEMP\solana_install"
if (-not (Test-Path $tempDir)) {
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
}

Write-Host "PASO 1: Descargando instalador..." -ForegroundColor Yellow

try {
    # URL del instalador de Solana para Windows
    $installerUrl = "https://release.solana.com/stable/install"
    $installerScript = "$tempDir\install_solana.ps1"
    
    Write-Host "Descargando desde: $installerUrl" -ForegroundColor Cyan
    Invoke-WebRequest -Uri $installerUrl -OutFile $installerScript -ErrorAction Stop
    
    Write-Host "✓ Descarga completada" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "PASO 2: Ejecutando instalador..." -ForegroundColor Yellow
    Write-Host "Esto puede tardar unos minutos..." -ForegroundColor Gray
    Write-Host ""
    
    # Ejecutar el script de instalación
    & powershell -ExecutionPolicy Bypass -File $installerScript
    
    Write-Host ""
    Write-Host "✓ Instalación completada" -ForegroundColor Green
    Write-Host ""
    
} catch {
    Write-Host "❌ Error en la descarga automática: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Usando método alternativo..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== MÉTODO ALTERNATIVO: INSTALACIÓN MANUAL ===" -ForegroundColor Green
Write-Host ""

Write-Host "OPCIÓN A: Desde el sitio oficial" -ForegroundColor Cyan
Write-Host "1. Abre tu navegador" -ForegroundColor Gray
Write-Host "2. Ve a: https://docs.solana.com/cli/install-solana-cli-tools" -ForegroundColor Yellow
Write-Host "3. Sigue las instrucciones para Windows" -ForegroundColor Gray
Write-Host ""

Write-Host "OPCIÓN B: Descargar desde GitHub" -ForegroundColor Cyan
Write-Host "1. Ve a: https://github.com/solana-labs/solana/releases/latest" -ForegroundColor Yellow
Write-Host "2. Descarga: solana-install-init-x86_64-pc-windows-msvc.exe" -ForegroundColor Yellow
Write-Host "3. Ejecuta el archivo .exe descargado" -ForegroundColor Gray
Write-Host ""

Write-Host "OPCIÓN C: Usar Chocolatey (si lo tienes instalado)" -ForegroundColor Cyan
Write-Host "  choco install solana-cli" -ForegroundColor Yellow
Write-Host ""

Write-Host "=== VERIFICAR INSTALACIÓN ===" -ForegroundColor Cyan
Write-Host ""

# Esperar un momento y verificar
Start-Sleep -Seconds 2

# Verificar en ubicaciones comunes
$solanaPaths = @(
    "$env:USERPROFILE\.local\share\solana\install\active_release\bin\solana.exe",
    "$env:LOCALAPPDATA\solana\install\active_release\bin\solana.exe",
    "C:\Program Files\Solana\bin\solana.exe"
)

$solanaFound = $false
foreach ($path in $solanaPaths) {
    if (Test-Path $path) {
        Write-Host "✓ Solana encontrado en: $path" -ForegroundColor Green
        $solanaFound = $true
        
        # Agregar al PATH si no está
        $binPath = Split-Path $path -Parent
        $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
        
        if ($currentPath -notlike "*$binPath*") {
            Write-Host ""
            Write-Host "Agregando al PATH..." -ForegroundColor Yellow
            [Environment]::SetEnvironmentVariable("Path", "$currentPath;$binPath", "User")
            $env:Path += ";$binPath"
            Write-Host "✓ Agregado al PATH" -ForegroundColor Green
            Write-Host ""
            Write-Host "⚠️ IMPORTANTE: Cierra y abre una nueva terminal PowerShell" -ForegroundColor Yellow
            Write-Host "   para que los cambios surtan efecto" -ForegroundColor Yellow
        }
        
        # Intentar ejecutar
        Write-Host ""
        Write-Host "Probando ejecución..." -ForegroundColor Cyan
        try {
            & $path --version
            Write-Host "✓ Solana CLI funciona correctamente" -ForegroundColor Green
        } catch {
            Write-Host "⚠️ Solana encontrado pero no se puede ejecutar" -ForegroundColor Yellow
        }
        break
    }
}

if (-not $solanaFound) {
    Write-Host "❌ Solana CLI no encontrado en ubicaciones comunes" -ForegroundColor Red
    Write-Host ""
    Write-Host "=== SOLUCIÓN ===" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Descarga manualmente desde:" -ForegroundColor Cyan
    Write-Host "   https://github.com/solana-labs/solana/releases/latest" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "2. O usa el instalador web:" -ForegroundColor Cyan
    Write-Host "   https://docs.solana.com/cli/install-solana-cli-tools" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "3. Después de instalar, agrega al PATH manualmente:" -ForegroundColor Cyan
    Write-Host "   [Environment]::SetEnvironmentVariable('Path', `$env:Path + ';C:\Users\$env:USERNAME\.local\share\solana\install\active_release\bin', 'User')" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "4. Reinicia PowerShell" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "=== ALTERNATIVA: USAR SIN CLI ===" -ForegroundColor Green
Write-Host ""
Write-Host "Si no puedes instalar la CLI, puedes usar:" -ForegroundColor Yellow
Write-Host "1. Scripts JavaScript con Node.js" -ForegroundColor Gray
Write-Host "2. Scripts Python" -ForegroundColor Gray
Write-Host "3. APIs web directamente" -ForegroundColor Gray
Write-Host ""
Write-Host "Ya tienes creados scripts JavaScript que puedes usar sin CLI" -ForegroundColor Cyan
