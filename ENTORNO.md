# Entorno de desarrollo (Windows / IDE)

## Errores frecuentes y soluciones

### 1. "Aderyn is only supported in WSL when using Windows!"

**Causa:** La extensión Aderyn solo puede ejecutarse en un entorno Linux (no nativo en Windows). Es una limitación del binario de Aderyn, no algo que se pueda “arreglar” desactivando la extensión.

**Corrección real (hacer que Aderyn funcione):**

- **Opción A – Abrir en contenedor Linux (recomendado):**  
  En este proyecto hay un **Dev Container** configurado (`.devcontainer/`). Al abrir la carpeta del proyecto:
  1. `Ctrl+Shift+P` → **“Dev Containers: Reopen in Container”**.
  2. Espera a que se construya el contenedor (instala Node, Aderyn CLI y dependencias del proyecto).
  3. Dentro del contenedor estás en **Linux**; la extensión Aderyn **sí funciona** y el análisis estático se ejecuta con normalidad.

- **Opción B – Usar WSL:**  
  Si prefieres WSL en lugar del contenedor: instala WSL, abre la carpeta del proyecto desde **WSL** (File → Open Folder → ruta tipo `\\wsl$\...`), instala la extensión Aderyn dentro de esa ventana y, en WSL, instala el CLI de Aderyn (por ejemplo con el script oficial o `npm install -g @cyfrin/aderyn`). En ese entorno la extensión también funciona.

En ambos casos la “corrección” es **usar un entorno Linux** (contenedor o WSL), que es el único donde Aderyn puede ejecutarse. No es una exclusión ni un parche: es la forma soportada de usar Aderyn en Windows.

**Si Aderyn sigue sin funcionar:** (1) Abre solo la carpeta `trc20-token`, no E:\ ni Cursor-Workspace. (2) Instala la extensión **Dev Containers** si no la tienes. (3) `Ctrl+Shift+P` → **Reopen in Container** y espera a que se construya. (4) Dentro del contenedor, en la terminal ejecuta `aderyn --version`; si no está, ejecuta `npm install -g @cyfrin/aderyn` y recarga la ventana. Más detalle en `.devcontainer/README.md`.

---

### 2. "Failed to create new chain"

**Causa:** Alguna extensión (p. ej. depuración o entorno local) intenta crear una cadena/red local y falla (binario no encontrado, permisos, etc.).

**Para este proyecto TRC-20 con TronBox:**

- **No hace falta** crear una cadena local para compilar, hacer lint o tests básicos.
- **Despliegue:** Usa redes remotas: `npm run deploy:nile`, `deploy:shasta` o `deploy:mainnet` (con `.env` y `PRIVATE_KEY`).
- **Red local (development):** En `tronbox.js` la red `development` apunta a `http://127.0.0.1:9090`. Solo necesitas "crear" una cadena local si quieres usar esa red; para eso debes levantar un nodo TRON local (p. ej. imagen Docker oficial de java-tron). Si no usas `development`, puedes ignorar el mensaje o desactivar la función que intenta crear la cadena en la extensión que lo muestre.

**Si la opción "create new chain" viene de una extensión concreta:** Revisa su configuración o desactívala para este workspace si no la usas.

---

### 3. Pointbreak debug bridge

El mensaje **"Pointbreak debug bridge is running (bundled binary)"** es informativo: indica que el puente de depuración está activo. No requiere acción.

---

## Resumen

| Aviso / Error              | Acción recomendada                                                                 |
|---------------------------|-------------------------------------------------------------------------------------|
| Aderyn solo WSL            | **Corrección real:** "Reopen in Container" (Dev Container de este repo) o abrir carpeta en WSL; así Aderyn funciona. |
| Failed to create new chain| Usar shasta/nile/mainnet; o levantar nodo TRON en 127.0.0.1:9090 si usas development. |
| Pointbreak running        | Ninguna; es informativo.                                                            |

*Última actualización: configuración Dev Container, pasos Aderyn y recomendación de extensión Dev Containers.*
