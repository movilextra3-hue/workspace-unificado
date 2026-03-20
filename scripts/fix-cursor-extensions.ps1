# Requiere ejecutarse con Cursor cerrado.
# Elimina la extensión corrupta sonarlint_ondemand-analyzers que causa errores en output.log.
# Uso: powershell -ExecutionPolicy Bypass -File scripts/fix-cursor-extensions.ps1
$extPath = "$env:USERPROFILE\.cursor\extensions\sonarsource.sonarlint_ondemand-analyzers"
if (Test-Path $extPath) {
  try {
    Remove-Item -Path $extPath -Recurse -Force -ErrorAction Stop
    Write-Host "OK: Extensión sonarlint_ondemand-analyzers eliminada."
  }
  catch {
    Write-Host "ERROR: Cierre Cursor por completo y vuelva a ejecutar este script."
    Write-Host $_.Exception.Message
    exit 1
  }
}
else {
  Write-Host "OK: La extensión ya no existe."
}
exit 0
