#!/bin/bash
set -e
echo "=== Instalando Aderyn CLI (necesario para la extensión Aderyn) ==="

# Asegurar que el bin global de npm esté en PATH
export PATH="/usr/local/bin:$HOME/.local/bin:$(npm config get prefix 2>/dev/null)/bin:$PATH"

# 1) Intentar instalador oficial
if command -v curl &>/dev/null; then
  if curl --proto '=https' --tlsv1.2 -LsSf --max-time 15 "https://github.com/cyfrin/aderyn/releases/latest/download/aderyn-installer.sh" 2>/dev/null | bash 2>/dev/null; then
    export PATH="$HOME/.aderyn/bin:$PATH"
    echo 'export PATH="$HOME/.aderyn/bin:$PATH"' >> ~/.bashrc 2>/dev/null || true
  fi
fi

# 2) Si no hay aderyn, instalar vía npm (recomendado en contenedores Node)
if ! command -v aderyn &>/dev/null; then
  echo "Instalando Aderyn con npm..."
  npm install -g @cyfrin/aderyn
  export PATH="$(npm root -g)/../bin:$PATH"
  echo "export PATH=\"\$(npm root -g)/../bin:\$PATH\"" >> ~/.bashrc 2>/dev/null || true
fi

# 3) Verificación
if command -v aderyn &>/dev/null; then
  echo "Aderyn instalado: $(aderyn --version 2>/dev/null || echo 'OK')"
else
  echo "AVISO: Aderyn CLI no se pudo instalar. La extensión puede no funcionar. Prueba en terminal: npm install -g @cyfrin/aderyn"
fi

# Dependencias del proyecto
npm install
echo "=== Dev container listo. Usa la extensión Aderyn en esta ventana. ==="
