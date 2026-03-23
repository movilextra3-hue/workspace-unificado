#!/usr/bin/env sh
# Copia opcional blockchain/trc20-token/.env desde el worktree principal (ROOT_WORKTREE_PATH).
# Si el origen no existe: no hace nada, exit 0.
# Si el origen existe: mkdir + cp deben tener éxito; cualquier fallo (permisos, E/S) → exit ≠ 0.
set -eu

if [ -z "${ROOT_WORKTREE_PATH:-}" ]; then
  exit 0
fi

src="$ROOT_WORKTREE_PATH/blockchain/trc20-token/.env"
if [ ! -f "$src" ]; then
  exit 0
fi

mkdir -p blockchain/trc20-token
cp "$src" blockchain/trc20-token/.env
echo "Copiado .env"
