# Sincroniza .cursor/rules del repo hacia reglas globales de Cursor (cualquier workspace, p. ej. D:\).
# Destino principal: $env:USERPROFILE\.cursor\rules (lo que Cursor usa como User Rules).
# Uso (desde raíz del repo):
#   powershell -ExecutionPolicy Bypass -File scripts/sync-cursor-global-rules.ps1
#   powershell -ExecutionPolicy Bypass -File scripts/sync-cursor-global-rules.ps1 -MirrorPath 'D:\.cursor\rules'
param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [string]$MirrorPath = ''
)

$ErrorActionPreference = 'Stop'
$src = Join-Path $RepoRoot '.cursor\rules'
if (-not (Test-Path $src)) {
  throw "No existe la carpeta de reglas: $src"
}

$dst = Join-Path $env:USERPROFILE '.cursor\rules'
New-Item -ItemType Directory -Force -Path $dst | Out-Null
Copy-Item -Path (Join-Path $src '*.mdc') -Destination $dst -Force
Write-Host "OK: $($((Get-ChildItem (Join-Path $src '*.mdc')).Count)) reglas -> $dst"

if ($MirrorPath) {
  New-Item -ItemType Directory -Force -Path $MirrorPath | Out-Null
  Copy-Item -Path (Join-Path $src '*.mdc') -Destination $MirrorPath -Force
  Write-Host "OK: espejo -> $MirrorPath"
}
