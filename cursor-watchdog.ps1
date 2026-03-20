# Cursor OOM Watchdog - reinicia Cursor cuando la memoria supera ~3.2 GB
# Ejecutar: .\cursor-watchdog.ps1 (en PowerShell)
# Detener: Ctrl+C

$thresholdMB = 3200
$checkIntervalSec = 30

while ($true) {
    $procs = Get-Process -Name Cursor -ErrorAction SilentlyContinue
    $totalMB = 0
    foreach ($p in $procs) {
        $totalMB += [math]::Round($p.WorkingSet64 / 1MB)
    }
    if ($totalMB -gt $thresholdMB) {
        Write-Warning "Cursor usando $totalMB MB - umbral $thresholdMB MB. Guarda tu trabajo. Reinicio en 10 segundos..."
        Start-Sleep -Seconds 10
        Stop-Process -Name Cursor -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 5
        Start-Process cursor
        Write-Host "Cursor reiniciado."
    }
    else {
        Write-Host "$(Get-Date -Format 'HH:mm:ss') - Cursor: $totalMB MB (OK)"
    }
    Start-Sleep -Seconds $checkIntervalSec
}
