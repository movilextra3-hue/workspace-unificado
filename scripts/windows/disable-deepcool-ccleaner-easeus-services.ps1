#Requires -RunAsAdministrator
$ErrorActionPreference = 'Stop'
$names = @(
  'Deep Cool Display Service',
  'Deep Cool Helper Service',
  'CCleanerPerformanceOptimizerService',
  'EaseUS UPDATE SERVICE'
)
foreach ($n in $names) {
  try {
    Stop-Service -Name $n -Force -ErrorAction Stop
  }
  catch { Write-Host "Stop $n : $($_.Exception.Message)" }
  try {
    Set-Service -Name $n -StartupType Disabled -ErrorAction Stop
    Write-Host "OK Disabled: $n"
  }
  catch { Write-Host "Set-Service $n : $($_.Exception.Message)" }
}
$tasks = @('CCleanerSkipUAC - oman_', 'CCleanerSkipUAC - GBTRSD')
foreach ($t in $tasks) {
  try {
    Disable-ScheduledTask -TaskName $t -ErrorAction Stop | Out-Null
    Write-Host "OK Disabled task: $t"
  }
  catch { Write-Host "Task $t : $($_.Exception.Message)" }
}
Write-Host 'Listo. Reinicia sesion si algo sigue en memoria.'
