# Push a GitHub. Repo: https://github.com/movilextra3-hue/workspace-unificado
# GitHub NO acepta contraseña para Git; solo Personal Access Token (PAT).
# Crear PAT: https://github.com/settings/tokens (permiso repo). Al pedir "Password", pegar el PAT.
# Ejecutar en la terminal de Cursor. Ver docs/GITHUB_PUSH.md.
Set-Location $PSScriptRoot\..
Write-Host "Push a origin master (usuario movilextra3-hue en la URL). Si pide password, escribelo y Enter." -ForegroundColor Yellow
git push -u origin master
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "Si da 403: GitHub exige PAT (no contraseña). Crea uno en https://github.com/settings/tokens (permiso repo)." -ForegroundColor Red
  Write-Host "Si ya usaste PAT y sigue fallando, borra credenciales guardadas: cmdkey /list | findstr git" -ForegroundColor Red
  Write-Host "  Luego: cmdkey /delete:LegacyGeneric:target=git:https://TU_USUARIO@github.com" -ForegroundColor Red
  Write-Host "  y/o:   cmdkey /delete:git:https://github.com" -ForegroundColor Red
  Write-Host "Vuelve a ejecutar: .\scripts\push-a-github.ps1"
}
