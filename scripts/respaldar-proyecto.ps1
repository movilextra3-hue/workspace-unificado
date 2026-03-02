# Respaldo del proyecto trc20-token (excluye node_modules y build; incluye .env en el respaldo)
# Ejecutar desde PowerShell: .\scripts\respaldar-proyecto.ps1
# Opcional: .\scripts\respaldar-proyecto.ps1 -Destino "D:\Backups"

param(
    [string]$Destino = "E:\Backup"
)

$NombreProyecto = "trc20-token"
$Fecha = Get-Date -Format "yyyyMMdd_HHmm"
$CarpetaDestino = Join-Path $Destino "${NombreProyecto}_$Fecha"
$Origen = $PSScriptRoot + "\.."

if (-not (Test-Path $Origen)) {
    Write-Error "No se encuentra la carpeta del proyecto: $Origen"
    exit 1
}

New-Item -ItemType Directory -Path $CarpetaDestino -Force | Out-Null

$Excluir = @("node_modules", "build", ".git", "archivos_delicados")
$Items = Get-ChildItem -Path $Origen -Force | Where-Object { $_.Name -notin $Excluir }

foreach ($item in $Items) {
    $dest = Join-Path $CarpetaDestino $item.Name
    if ($item.PSIsContainer) {
        Copy-Item -Path $item.FullName -Destination $dest -Recurse -Force
    } else {
        Copy-Item -Path $item.FullName -Destination $dest -Force
    }
    Write-Host "Copiado: $($item.Name)"
}

Write-Host "`nRespaldo completado en: $CarpetaDestino"
Write-Host "IMPORTANTE: .env (claves privadas) está incluido. Guarda esta carpeta en un lugar seguro y no la subas a internet."
