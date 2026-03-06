# Por qué Cursor abre otra ventana de ejecución y el archivo tronbox.js

Análisis realizado en el workspace para identificar el origen del comportamiento.

---

## Resumen

**No hay en el repo** ninguna tarea, script ni configuración que ordene abrir `tronbox.js` o una ventana nueva. El comportamiento viene de la **combinación de Cursor + extensiones + cómo se usa el proyecto** (qué scripts se ejecutan y qué archivos tocan).

---

## 1. Orígenes identificados (en el repo y en el flujo)

### A) Scripts que cargan `tronbox.js`

Estos archivos hacen `require('.../tronbox.js')` en tiempo de ejecución:

| Archivo | Uso |
|--------|-----|
| `scripts/verify-before-migrate-3.js` | Lee `tronbox.js` para obtener `feeLimit` de mainnet. |
| `migrations/3_deploy_impl_and_proxy_reuse_admin.js` | Lee `tronbox.js` para validar `feeLimit` en mainnet. |

**Efecto:** Cuando ejecutas `npm run verify:before-migrate-3`, `npm run migrate-3-safe` o cuando el agente lanza esos comandos, Node carga `tronbox.js`. Cursor puede interpretar ese archivo como “contexto de la ejecución” y **abrirlo o mostrarlo** en el editor (comportamiento del IDE, no del script).

### B) ESLint incluye `tronbox.js` de forma explícita

En `package.json`:

```json
"lint:js": "eslint scripts migrations test tronbox.js --ext .js"
```

**Efecto:** Si ESLint se ejecuta al guardar o al lanzar la tarea (desde Cursor o desde una extensión), recorre `tronbox.js`. Algunas extensiones o el propio IDE pueden **poner el foco o abrir** el archivo que se está analizando o que tiene diagnósticos.

### C) Regla de Cursor que menciona tronbox

En `.cursor/rules/workspace-unificado.mdc`:

- Se indica usar la carpeta `blockchain/trc20-token` y se menciona “npm, **tronbox**, .env”.

**Efecto:** El agente, al trabajar en el token TRON, tiende a leer o referenciar `tronbox.js` (configuración). Cuando el agente “usa” ese archivo, Cursor puede **mostrarlo o abrirlo** como parte del contexto mostrado al usuario.

### D) “Otra ventana de ejecución”

Cuando se ejecuta un comando (terminal, tarea, o el agente ejecutando algo), Cursor suele abrir o cambiar al **panel de terminal / ejecución**. Eso se percibe como “se abre otra ventana”. Es el comportamiento normal del IDE al ejecutar algo; no está definido en el repo.

---

## 2. Qué no está causándolo (comprobado en el repo)

- No existe `.vscode/tasks.json` ni tareas con `reveal` / `panel: "new"` que abran archivos.
- No hay scripts que invoquen `code`/`cursor` para abrir un archivo.
- `postinstall` solo ejecuta `setup-env.js` (no toca `tronbox.js`).
- Las configuraciones de `.vscode` y `.cursor` no tienen opciones de “abrir archivo” o “reveal” al ejecutar.

---

## 3. Regla añadida en el proyecto

En **`.cursor/rules/workspace-unificado.mdc`** se añadió:

- No abrir ni poner foco en `tronbox.js` salvo que el usuario pida editarlo o verlo explícitamente.

Así el agente evita referenciar ese archivo de forma que se abra la pestaña. Si aun así se sigue abriendo, aplica los puntos de la sección siguiente.

---

## 4. Cómo mitigarlo (desde tu lado)

### En Cursor (ajustes del IDE)

1. **Settings (Ctrl+,)**  
   Busca opciones relacionadas con:
   - “reveal” / “focus” cuando se ejecutan tareas o terminal.
   - “open file” / “preview” cuando el agente usa un archivo.
   Si hay algo tipo “Reveal file when running task” o “Focus editor when showing context”, **desactívalo** o ponlo en “never” si quieres evitar que se abra `tronbox.js` al ejecutar.

2. **Extensiones**  
   Tienes recomendadas:
   - `ackeeblockchain.tools-for-solidity`
   - `JuanBlanco.solidity`  
   Prueba a **desactivar una u otra** (o ambas) temporalmente. Algunas abren el “archivo de configuración del proyecto” (p. ej. `tronbox.js`) al detectar un proyecto blockchain. Si al desactivar deja de abrirse `tronbox.js`, el origen es esa extensión.

3. **Panel de terminal**  
   Si lo que te molesta es que “se abra otra ventana” (el panel de ejecución), en Settings busca opciones del **terminal** (dónde se abre, si en panel nuevo, etc.) y ajústalas a tu gusto.

### En el repo (opcional, sin cambiar comportamiento funcional)

- El `require('tronbox.js')` en `verify-before-migrate-3.js` y en la migración 3 **debe seguir** para leer el `feeLimit`; no conviene quitarlo.
- Se podría cambiar `lint:js` para no listar `tronbox.js` por su nombre y usar un glob (p. ej. `eslint "scripts/**/*.js" "migrations/**/*.js" "tronbox.js"` o similar), pero ESLint seguiría analizando `tronbox.js`; el cambio solo afectaría cómo se invoca ESLint, no necesariamente si Cursor abre el archivo.

---

## 5. Conclusión

| Qué pasa | Dónde se genera |
|---------|------------------|
| Se abre el archivo `tronbox.js` | Cursor (o extensión) al “mostrar contexto” de la ejecución o del agente, o al enfocar archivos que se lintan. Los scripts solo cargan el archivo con `require`, no lo abren. |
| Se abre “otra ventana” de ejecución | Cursor al abrir o enfocar el panel de terminal/ejecución cuando se corre un comando. |

Para que deje de ocurrir hay que actuar en **configuración de Cursor y/o desactivar extensiones**, no en el código del proyecto.
