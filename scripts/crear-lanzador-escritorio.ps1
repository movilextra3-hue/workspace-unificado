# Crea un acceso directo en el escritorio para ejecutar cerrar-cursor-y-fix-extensions.ps1
# Uso: powershell -ExecutionPolicy Bypass -File scripts/crear-lanzador-escritorio.ps1
$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$mainScript = Join-Path $scriptDir 'cerrar-cursor-y-fix-extensions.ps1'
$desktop = [Environment]::GetFolderPath('Desktop')
$batPath = Join-Path $desktop 'Fix-Cursor-Extensions.bat'

$batLines = @(
    '@echo off',
    'chcp 65001 >nul',
    'title Fix Cursor - Extensiones',
    'echo Cerrando Cursor y corrigiendo extensiones...',
    "powershell -ExecutionPolicy Bypass -NoProfile -File `"$mainScript`" -Reabrir",
    'pause'
)
$batContent = $batLines -join "`r`n"

[System.IO.File]::WriteAllText($batPath, $batContent)
Write-Host "OK: Creado $batPath"
Write-Host "Ejecuta doble clic en ese archivo desde el escritorio."
exit 0
