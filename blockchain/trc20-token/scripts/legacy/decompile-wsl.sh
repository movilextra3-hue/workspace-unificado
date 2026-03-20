#!/bin/bash
# Descompila bytecode TXaXTSUK en WSL 2 (Linux).
# Panoramix funciona correctamente en Linux (SIGALRM disponible).
#
# Uso desde PowerShell/CMD: wsl -d Ubuntu -- bash -e /mnt/e/workspace-unificado/blockchain/trc20-token/scripts/decompile-wsl.sh
# O desde WSL: cd /mnt/e/workspace-unificado/blockchain/trc20-token && bash scripts/decompile-wsl.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
OUT_DIR="$ROOT/verification/TXaXTSUK-verification"
BYTECODE="$OUT_DIR/bytecode.hex"
OUT_PYR="$OUT_DIR/TRC20TokenUpgradeable-decompiled-wsl.pyr"

echo "=== Descompilación en WSL ===="
echo ""

if [ ! -f "$BYTECODE" ]; then
  echo "Falta $BYTECODE. Ejecuta primero: npm run generate:verification"
  exit 1
fi

# Instalar panoramix si no está
if ! python3 -c "import panoramix" 2>/dev/null; then
  echo "Instalando panoramix-decompiler..."
  pip3 install --user panoramix-decompiler 2>/dev/null || {
    echo "Instalando pip..."
    sudo apt-get update -qq && sudo apt-get install -y python3-pip
    pip3 install panoramix-decompiler
  }
fi

echo "Descompilando con Panoramix..."
BYTECODE_HEX="0x$(cat "$BYTECODE" | tr -d '\n')"
python3 -m panoramix "$BYTECODE_HEX" > "$OUT_PYR" 2>&1

if [ -s "$OUT_PYR" ]; then
  echo "Guardado: $OUT_PYR"
  echo ""
  echo "--- Vista previa ---"
  head -100 "$OUT_PYR"
  echo ""
  wc -l "$OUT_PYR"
else
  echo "Error: Panoramix no generó salida"
  exit 1
fi
