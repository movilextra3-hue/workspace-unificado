# Push a GitHub. Ejecutar DESPUÉS de crear el repo "workspace-unificado" en https://github.com/movilextra3-hue
# Crear repo: https://github.com/new?name=workspace-unificado (inicia sesión y clic en "Create repository")
Set-Location $PSScriptRoot\..
git push -u origin master
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "Si falla: crea el repo en https://github.com/new?name=workspace-unificado (sin README, sin .gitignore)."
  Write-Host "Luego ejecuta de nuevo: .\scripts\push-a-github.ps1"
}
