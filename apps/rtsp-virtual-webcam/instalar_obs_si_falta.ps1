# Instala OBS (para OBS Virtual Camera) si no está instalado
$obs = Get-Command obs64.exe -ErrorAction SilentlyContinue
if ($obs) {
    Write-Host "OBS ya está instalado." -ForegroundColor Green
    exit 0
}
Write-Host "Instalando OBS Studio (necesario para la cámara virtual)..." -ForegroundColor Yellow
winget install --id OBSProject.OBSStudio -e --accept-source-agreements --accept-package-agreements
Write-Host "Listo. Reinicia esta app o el PC si la cámara virtual no aparece." -ForegroundColor Green
