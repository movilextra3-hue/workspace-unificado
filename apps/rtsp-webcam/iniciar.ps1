# Script automatizado: entorno virtual, dependencias y servidor RTSP
$ErrorActionPreference = "Stop"
$baseDir = $PSScriptRoot
Set-Location $baseDir

Write-Host "=== Camara RTSP - Inicio automatico ===" -ForegroundColor Cyan

# 1. Crear venv si no existe
if (-not (Test-Path "venv\Scripts\python.exe")) {
    Write-Host "Creando entorno virtual..." -ForegroundColor Yellow
    python -m venv venv
    if ($LASTEXITCODE -ne 0) { throw "Error al crear venv. ¿Tienes Python instalado?" }
}

# 2. Instalar dependencias
Write-Host "Instalando dependencias..." -ForegroundColor Yellow
& ".\venv\Scripts\pip.exe" install -q -r requirements.txt
if ($LASTEXITCODE -ne 0) { throw "Error al instalar dependencias." }

# 3. Iniciar servidor
Write-Host "Iniciando servidor en http://127.0.0.1:5000" -ForegroundColor Green
Write-Host "Cierra esta ventana para detener el servidor." -ForegroundColor Gray
Start-Process "http://127.0.0.1:5000"
& ".\venv\Scripts\python.exe" app.py
