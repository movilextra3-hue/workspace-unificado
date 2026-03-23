#Requires -RunAsAdministrator
$lnk = 'C:\ProgramData\Microsoft\Windows\Start Menu\Programs\StartUp\FxSound.lnk'
if (Test-Path $lnk) {
  Remove-Item -Path $lnk -Force
  Write-Host 'OK: eliminado FxSound.lnk de ProgramData Startup'
} else {
  Write-Host 'FxSound.lnk no encontrado'
}
