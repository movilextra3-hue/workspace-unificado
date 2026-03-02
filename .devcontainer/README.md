# Dev Container — Aderyn en Linux

Para que **Aderyn funcione** (análisis estático de Solidity), la extensión debe ejecutarse en **Linux**. Este contenedor proporciona ese entorno.

## Pasos (una sola vez)

1. **Abre la carpeta del proyecto**  
   File → Open Folder → selecciona la carpeta `trc20-token` (no la unidad E:\ ni Cursor-Workspace entero).

2. **Instala la extensión "Dev Containers"** (si no la tienes)  
   Extensiones → busca "Dev Containers" (Microsoft) → Install.

3. **Reabre en el contenedor**  
   `Ctrl+Shift+P` → escribe **"Reopen in Container"** → elige **Dev Containers: Reopen in Container**.

4. **Espera** a que se construya el contenedor (primera vez puede tardar 1–2 minutos). Verás la terminal ejecutando `post-create.sh` e instalando Aderyn.

5. Cuando termine, estarás **dentro del contenedor Linux**. La extensión Aderyn debería activarse y funcionar (panel "Cyfrin Aderyn Diagnostics" en la barra lateral).

## Si Aderyn sigue sin funcionar dentro del contenedor

- Abre la terminal integrada (`` Ctrl+` ``) y ejecuta:  
  `aderyn --version`  
  Si no está instalado:  
  `npm install -g @cyfrin/aderyn`  
  Luego recarga la ventana: `Ctrl+Shift+P` → "Developer: Reload Window".

## Alternativa: WSL

Si prefieres no usar contenedor:

1. Instala WSL (Windows Subsystem for Linux) si no lo tienes.
2. En Windows: abre Cursor, File → Open Folder → navega a `\\wsl$\Ubuntu\home\tu_usuario\trc20-token` (o la ruta donde tengas el proyecto en WSL).
3. En una terminal WSL, dentro de la carpeta del proyecto:  
   `npm install -g @cyfrin/aderyn`
4. En esa misma ventana de Cursor (con la carpeta abierta vía WSL), la extensión Aderyn funcionará.
