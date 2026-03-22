# Instrucciones para el agente

## OBLIGATORIO PRIMERO — Consultar y aplicar TODAS las reglas

**Antes de cada respuesta:** Consultar `.cursor/rules/` y aplicar TODAS las reglas establecidas. Sin excepciones.
- Archivo maestro: `.cursor/rules/00-INSTRUCCION-PRIMERA-OBLIGATORIA.mdc`
- No actuar sin haber consultado las reglas.
- No finalizar sin registrar en vitácora si hubo acciones.

## Regla inviolable — Seguimiento en tiempo real hasta finalizar

- Realizar seguimiento en tiempo real de cada procedimiento hasta completarlo.
- Comprobar que todo esté correcto; si hay errores, corregirlos y continuar.
- No finalizar hasta brindar una solución completa, efectiva y exitosa.

## Regla inviolable — Tareas activas y continuidad (sin tiempos muertos)

- Mantener el flujo de trabajo con **pasos ejecutables encadenados** hasta completar lo pedido (sin ampliar alcance).
- **No** cerrar el turno dejando trabajo que el agente aún puede ejecutar; usar lista de tareas en encargos multi-paso.
- Regla completa: `.cursor/rules/tareas-activas-flujo-continuidad.mdc`.

## Regla inviolable — Flujo automatizado TRC20 + checkpoint

- En `blockchain/trc20-token`, ante procedimientos multi-paso (lint → test → gate mainnet → pipeline), **priorizar** `npm run flujo:continuo` y retoma con `flujo:continuo:resume` / `--from-step` para no perder avance entre sesiones.
- Regla completa: `.cursor/rules/flujo-automatizado-checkpoint-trc20.mdc`.

## Regla inviolable — No omitir, no excluir, no suponer, cero hipótesis

**Permanente. Sin excepciones.**

- No omitir información relevante.
- No excluir información por conveniencia.
- No suponer información no comprobada — solo afirmar lo verificable.
- No suponer procedimientos no comprobados — verificar antes de dar por válido.
- **Cero hipótesis:** Todo, absolutamente todo, debe estar comprobado y verificado. No conjeturas. No afirmar nada que no se haya comprobado.
- Solo información y procedimientos **comprobados y verificados**.

## Regla inviolable — Vitácora única

**Toda documentación, registros, logs, transcripts e información nueva va SOLO en:**

- `docs/vitacora/CONSOLIDACION_COMPLETA_TODO.md` (o su continuación si supera 5 MB)

**Nunca crear** archivos `.md`, `.txt`, `.log` o similares con documentación fuera de `docs/vitacora`.

**Alcance:** Aplica a todos los proyectos del workspace (existentes y nuevos), en cualquier carpeta.

## Verificación antes de crear archivos

Antes de crear cualquier archivo de documentación:
1. ¿Va en `docs/vitacora/`? → Sí: añadir al archivo único (sección "Registro de interacciones").
2. ¿Otra ruta? → No crear. Usar la vitácora.

## Obligatorio: registrar antes de finalizar

Antes de terminar cualquier respuesta en la que se ejecutó una acción: añadir al final de `docs/vitacora/CONSOLIDACION_COMPLETA_TODO.md` las acciones realizadas. Sin excepciones.

## Vitácora monolítica — consulta y registro sin OOM ni errores de herramienta

`CONSOLIDACION_COMPLETA_TODO.md` puede ser **muy grande**. Para cumplir vitácora sin saturar memoria ni fallar:

1. **No abrir ni leer el archivo completo** sin acotar: usar lectura con **rango de líneas** (`offset` + `limit`) o solo el **final** del archivo (últimas 80–200 líneas donde suele estar «Registro de interacciones (append)»).
2. **Localizar texto** con búsqueda por patrón (p. ej. `Registro de interacciones (append)` o la fecha/entrada más reciente) antes de editar; no asumir números de línea fijos.
3. **Registrar (append):** usar sustitución anclada en **una línea reciente única** del registro (p. ej. la última entrada `- **20…** —`) para insertar la nueva línea justo debajo; evitar reescribir el archivo entero.
4. **Si la lectura directa falla** por tamaño o permisos: usar la terminal del workspace con comandos que lean solo cola o busquen patrón (PowerShell `Select-String`, `Get-Content -Tail`), sin volcar el monolito entero al contexto.
5. **Workspace:** `docs/vitacora` **no** está excluida de búsqueda en archivos (`search.exclude`) para que consultas y el agente puedan localizar entradas; los **watchers** siguen excluyendo esa ruta donde aplica para aligerar el IDE (no impide leer ni editar).

## Aplicación total

En cada interacción se aplican todas las reglas del workspace. Ver `.cursor/rules/aplicacion-total-reglas.mdc`.

## Orden de prioridad (sin contradicciones)

Si **ejecución explícita** y otra regla discrepan sobre **qué** hacer (alcance o entregables): primero lo pedido por el usuario; preguntar si falta criterio; el resto de normas rigen **cómo** ejecutar (incluida vitácora solo con acciones relevantes). Detalle: `.cursor/rules/aplicacion-total-reglas.mdc` — sección «Orden de prioridad cuando hay tensión entre reglas».

## Regla inviolable — Respuestas limpias (sin fugas de herramientas)

- **Nunca** incluir en respuestas al usuario: sintaxis de invocación de herramientas (p. ej. `mcp_web_fetch`, `url=...`), encabezados tipo "Content from URL", JSON crudo de APIs, ni salida de depuración.
- Siempre resumir y formatear datos de forma legible. Ver `.cursor/rules/respuestas-limpias.mdc`.

## Reglas detalladas

Ver `.cursor/rules/vitacora-registro.mdc`, `vitacora-obligatoria-todos-proyectos.mdc`, `respuestas-limpias.mdc` y `aplicacion-total-reglas.mdc`.
