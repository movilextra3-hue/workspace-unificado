# Cursor / memoria — aviso (opcional)
#
# IMPORTANTE (comprobado técnicamente):
# - El error "reason: oom" en Cursor suele ser del proceso del renderer (Electron/Chromium),
#   con límite práctico por proceso, NO "se acabaron los 128 GB del PC".
# - Por eso puede aparecer OOM aunque el Task Manager muestre mucha RAM libre en total.
#
# Este script YA NO mata Cursor a ~3.2 GB (eso era agresivo y podía cerrarte el IDE con RAM de sobra).
# Por defecto solo informa. Para intentar reinicio ante uso extremo, usa: -AllowKill
#
# Uso:  .\cursor-watchdog.ps1
#       .\cursor-watchdog.ps1 -WarnThresholdMB 12000 -KillThresholdMB 48000 -AllowKill

param(
    [int]$WarnThresholdMB = 8192,
    [int]$KillThresholdMB = 49152,
    [int]$CheckIntervalSec = 45,
    [switch]$AllowKill
)

while ($true) {
    $procs = Get-Process -Name Cursor -ErrorAction SilentlyContinue
    $totalMB = 0
    foreach ($p in $procs) {
        $totalMB += [math]::Round($p.WorkingSet64 / 1MB)
    }

    if ($totalMB -ge $KillThresholdMB -and $AllowKill) {
        Write-Warning "Cursor ~${totalMB} MB >= kill ${KillThresholdMB} MB. Reinicio en 15 s (AllowKill). Guarda trabajo."
        Start-Sleep -Seconds 15
        Stop-Process -Name Cursor -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 5
        Start-Process cursor
        Write-Host "Cursor reiniciado."
    }
    elseif ($totalMB -ge $WarnThresholdMB) {
        Write-Warning "$(Get-Date -Format 'HH:mm:ss') Cursor suma ~${totalMB} MB (aviso >= ${WarnThresholdMB} MB). Si ves OOM, cierra chats/pestañas o abre solo un subcarpeta del monorepo."
    }
    else {
        Write-Host "$(Get-Date -Format 'HH:mm:ss') Cursor: $totalMB MB (OK)"
    }

    Start-Sleep -Seconds $CheckIntervalSec
}
