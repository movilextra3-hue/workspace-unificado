#Requires -RunAsAdministrator
$path = 'HKLM:\Software\Microsoft\Windows\CurrentVersion\Run'
if (Get-ItemProperty -Path $path -Name 'UrbanVPN' -ErrorAction SilentlyContinue) {
  Remove-ItemProperty -Path $path -Name 'UrbanVPN' -Force
  Write-Host 'OK: eliminada entrada UrbanVPN de HKLM Run'
} else {
  Write-Host 'UrbanVPN ya no estaba en HKLM Run'
}
