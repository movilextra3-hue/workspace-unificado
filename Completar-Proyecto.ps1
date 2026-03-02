# Completar proyecto trc20-token: npm install, .env desde .env.example, tronbox compile.
# Ejecutar desde la raiz del proyecto: powershell -ExecutionPolicy Bypass -File .\Completar-Proyecto.ps1
$ErrorActionPreference = "Continue"
$root = $PSScriptRoot
if (-not (Test-Path "$root\package.json")) {
    Write-Host "ERROR: Ejecuta este script desde la carpeta trc20-token." -ForegroundColor Red
    exit 1
}

Set-Location $root

Write-Host "=== Completar proyecto trc20-token ===" -ForegroundColor Cyan
if (-not (Test-Path "node_modules")) {
    Write-Host "npm install..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) { Write-Host "npm install fallo." -ForegroundColor Red; exit 1 }
}
if (-not (Test-Path ".env") -and (Test-Path ".env.example")) {
    Copy-Item ".env.example" ".env"
    Write-Host ".env creado desde .env.example. Configura PRIVATE_KEY para shasta/nile/mainnet." -ForegroundColor Yellow
}
Write-Host "tronbox compile..." -ForegroundColor Yellow
npm run compile:tronbox
Write-Host "Listo." -ForegroundColor Green
