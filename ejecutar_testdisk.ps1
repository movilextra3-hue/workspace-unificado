# TestDisk - Recuperación disco Disk 3 (PhysicalDrive3) - Sin perder datos
# Requiere ejecución como Administrador. Ruta absoluta para salida.
$outDir = "E:\workspace-unificado"
$logFile = Join-Path $outDir "testdisk_log.txt"
$salidaFile = Join-Path $outDir "testdisk_salida.txt"
$testdiskPath = "C:\Program Files\TestDisk\testdisk_win.exe"
if (-not (Test-Path $testdiskPath)) {
    $testdiskPath = (Get-Command testdisk_win -ErrorAction SilentlyContinue).Source
}
if (-not $testdiskPath) {
    Write-Host "TestDisk no encontrado"
    exit 1
}
Set-Location $outDir
& $testdiskPath /log /logname $logFile /cmd "\\.\PhysicalDrive3" partition_none, analyze, search 2>&1 | Out-File -FilePath $salidaFile -Encoding utf8
Write-Host "TestDisk finalizado. Log: $logFile"
