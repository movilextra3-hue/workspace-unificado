# Busqueda eficiente de imagenes y videos en E: y D:
# Ejecutar: powershell -ExecutionPolicy Bypass -File ".\buscar-imagenes-videos.ps1"
$ErrorActionPreference = 'SilentlyContinue'
$ext = @('*.png', '*.jpg', '*.jpeg', '*.gif', '*.bmp', '*.webp', '*.tiff', '*.tif', '*.ico', '*.heic', '*.raw', '*.cr2', '*.nef',
  '*.mp4', '*.mkv', '*.avi', '*.mov', '*.wmv', '*.flv', '*.webm', '*.m4v', '*.mpg', '*.mpeg', '*.3gp')
$out = "E:\workspace-unificado\docs\vitacora\IMAGENES_VIDEOS_E_D.txt"
$csv = "E:\workspace-unificado\docs\vitacora\IMAGENES_VIDEOS_E_D.csv"

# Usar UTF8 sin BOM para salida legible
"=== Busqueda imagenes y videos E: + D: ===" | Out-File $out -Encoding ASCII
"Inicio: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" | Out-File $out -Append -Encoding ASCII
"" | Out-File $out -Append

# E:
Write-Host "Buscando en E:..."
$e = Get-ChildItem -Path "E:\" -Recurse -Include $ext -File -Force | Select-Object FullName, Length, LastWriteTime
"--- E: ($($e.Count) archivos) ---" | Out-File $out -Append
$e | ForEach-Object { "$($_.FullName)`t$([math]::Round($_.Length/1KB,1)) KB`t$($_.LastWriteTime)" } | Out-File $out -Append

# D: por carpetas de nivel superior (mas eficiente)
Write-Host "Buscando en D:..."
$dAll = @()
$dirs = Get-ChildItem "D:\" -Directory | Select-Object -ExpandProperty FullName
foreach ($d in $dirs) {
  $f = Get-ChildItem $d -Recurse -Include $ext -File -Force
  $dAll += $f
}
$dAll += Get-ChildItem "D:\" -Include $ext -File -Force
$dAll = $dAll | Sort-Object FullName -Unique

"" | Out-File $out -Append
"--- D: ($($dAll.Count) archivos) ---" | Out-File $out -Append
$dAll | ForEach-Object { "$($_.FullName)`t$([math]::Round($_.Length/1KB,1)) KB`t$($_.LastWriteTime)" } | Out-File $out -Append

# Resumen y CSV
"" | Out-File $out -Append
"Fin: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" | Out-File $out -Append
"Total E: $($e.Count) | Total D: $($dAll.Count)" | Out-File $out -Append

$all = $e + $dAll
$all | Export-Csv $csv -NoTypeInformation -Encoding utf8
"CSV: $csv" | Out-File $out -Append
Write-Host "Listo. E: $($e.Count) | D: $($dAll.Count) | Total: $($all.Count)"
Write-Host "Salida: $out"
