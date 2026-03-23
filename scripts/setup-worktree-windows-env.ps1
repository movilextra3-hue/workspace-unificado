# Copia opcional blockchain/trc20-token/.env desde el worktree principal (ROOT_WORKTREE_PATH).
# Si el origen no existe: no hace nada, exit 0.
# Si el origen existe: la copia debe tener éxito; fallos de permisos/E/S → excepción (exit ≠ 0).
$ErrorActionPreference = 'Stop'

if (-not $env:ROOT_WORKTREE_PATH) {
  exit 0
}

$p = Join-Path $env:ROOT_WORKTREE_PATH 'blockchain\trc20-token\.env'
if (-not (Test-Path -LiteralPath $p)) {
  exit 0
}

New-Item -ItemType Directory -Force -Path 'blockchain\trc20-token' | Out-Null
Copy-Item -LiteralPath $p -Destination 'blockchain\trc20-token\.env' -Force
Write-Host 'Copiado .env'
