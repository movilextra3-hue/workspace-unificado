#Requires -Version 5.1
<#
.SYNOPSIS
    Cierra Cursor, elimina la extensión corrupta sonarlint_ondemand-analyzers y opcionalmente reabre Cursor.
.DESCRIPTION
    Script para corregir errores de E:\output.log (Unable to read sonarlint_ondemand-analyzers\package.json).
    Debe ejecutarse con privilegios normales. Cierra Cursor automáticamente antes de eliminar la extensión.
.EXAMPLE
    powershell -ExecutionPolicy Bypass -File "E:\workspace-unificado\scripts\cerrar-cursor-y-fix-extensions.ps1"
#>
param(
    [switch]$Reabrir = $false
)

$ErrorActionPreference = 'Stop'
$CursorExe = "$env:LOCALAPPDATA\Programs\cursor\Cursor.exe"
$extPath = "$env:USERPROFILE\.cursor\extensions\sonarsource.sonarlint_ondemand-analyzers"

Write-Host "=== Cerrar Cursor y corregir extensiones ===" -ForegroundColor Cyan

# 1. Cerrar procesos de Cursor
$procesos = Get-Process -Name "Cursor" -ErrorAction SilentlyContinue
if ($procesos) {
    Write-Host "Cerrando Cursor ($($procesos.Count) proceso(s))..." -ForegroundColor Yellow
    $procesos | Stop-Process -Force
    Start-Sleep -Seconds 3
    $restantes = Get-Process -Name "Cursor" -ErrorAction SilentlyContinue
    if ($restantes) {
        Write-Host "Forzando cierre de procesos restantes..." -ForegroundColor Yellow
        $restantes | Stop-Process -Force
        Start-Sleep -Seconds 2
    }
    Write-Host "Cursor cerrado." -ForegroundColor Green
} else {
    Write-Host "Cursor no estaba en ejecucion." -ForegroundColor Gray
}

# 2. Eliminar extensión corrupta
if (Test-Path $extPath) {
    try {
        Remove-Item -Path $extPath -Recurse -Force -ErrorAction Stop
        Write-Host "OK: Extension sonarlint_ondemand-analyzers eliminada." -ForegroundColor Green
    } catch {
        Write-Host "ERROR: No se pudo eliminar. Ejecute este script de nuevo con Cursor cerrado." -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "OK: La extension corrupta ya no existe." -ForegroundColor Green
}

# 3. Opcional: reabrir Cursor
if ($Reabrir -and (Test-Path $CursorExe)) {
    Write-Host "Reabriendo Cursor..." -ForegroundColor Cyan
    Start-Process -FilePath $CursorExe
    Write-Host "Listo." -ForegroundColor Green
} else {
    Write-Host "Puede reabrir Cursor manualmente." -ForegroundColor Gray
}

Write-Host "`nProceso completado." -ForegroundColor Cyan
