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

## Regla inviolable — Local con propósito mainnet / red objetivo

- El trabajo en repo sobre **contratos, deploy o verificación** debe **garantizar o mejorar** lo que está en **mainnet** (o la red objetivo), o demostrar **alineación** (`check:alignment`, `gate:mainnet`, etc.). Un resultado “solo local” sin ese vínculo **no cuenta** como cierre válido en ese ámbito.
- Regla completa: `.cursor/rules/local-proposito-mainnet.mdc`.

## Regla inviolable — No omitir, no excluir, no suponer, cero hipótesis

**Permanente. Sin excepciones.**

- No omitir información relevante.
- No excluir información por conveniencia.
- No suponer información no comprobada — solo afirmar lo verificable.
- No suponer procedimientos no comprobados — verificar antes de dar por válido.
- **Cero hipótesis:** Todo, absolutamente todo, debe estar comprobado y verificado. No conjeturas. No afirmar nada que no se haya comprobado.
- Solo información y procedimientos **comprobados y verificados**.

## Regla inviolable — Vitácora única

**Toda documentación, registros, logs, transcripts e información nueva de registro va SOLO en `docs/vitacora`:**

- **Operativo (obligatorio para entradas nuevas):** `docs/vitacora/registro/YYYY-MM-DD.md` — **un archivo por día** (fecha local). Varias entradas el mismo día en el mismo archivo.
- **Índice:** `docs/vitacora/REGISTRO_DIARIO_INDICE.md`
- **Guía:** `docs/vitacora/registro/README.md`
- **Histórico:** `CONSOLIDACION_COMPLETA_TODO.md` — solo lectura acotada; **no** registrar ahí el día a día (evita RAM/OOM).

**Nunca crear** archivos `.md`, `.txt`, `.log` o similares con documentación de registro fuera de `docs/vitacora`.

**Alcance:** Aplica a todos los proyectos del workspace (existentes y nuevos), en cualquier carpeta.

## Verificación antes de crear archivos

Antes de crear cualquier archivo de documentación:
1. ¿Va en `docs/vitacora/` (p. ej. `registro/`)? → Sí: usar el **archivo del día** o crear `registro/YYYY-MM-DD.md` si es el primer registro de ese día.
2. ¿Otra ruta? → No crear. Usar la vitácora.

## Obligatorio: registrar antes de finalizar

Antes de terminar cualquier respuesta en la que se ejecutó una acción: añadir una viñeta al **archivo del día** `docs/vitacora/registro/YYYY-MM-DD.md` (sección «Registro del día»). Actualizar el índice si abres un día nuevo. Sin excepciones.

## Registro diario — consulta y escritura sin OOM

1. **Consultar contexto reciente:** `REGISTRO_DIARIO_INDICE.md` + archivos `registro/YYYY-MM-DD.md` de hoy y días previos necesarios (típicamente pocos KB).
2. **Registrar:** append al final de «Registro del día» del archivo de hoy; no cargar el monolito.
3. **Histórico antiguo:** `CONSOLIDACION_COMPLETA_TODO.md` solo con grep, `offset`/`limit` o cola — nunca entero en contexto salvo necesidad excepcional.
4. **Búsqueda en workspace:** `docs/vitacora` sigue siendo buscable; los **watchers** pueden seguir excluyendo parte de vitácora en `.vscode/settings.json` para aligerar el IDE sin impedir leer/editar archivos pequeños del día.

## Aplicación total

En cada interacción se aplican todas las reglas del workspace. Ver `.cursor/rules/aplicacion-total-reglas.mdc`.

## Orden de prioridad (sin contradicciones)

Si **ejecución explícita** y otra regla discrepan sobre **qué** hacer (alcance o entregables): primero lo pedido por el usuario; preguntar si falta criterio; el resto de normas rigen **cómo** ejecutar (incluida vitácora solo con acciones relevantes). Detalle: `.cursor/rules/aplicacion-total-reglas.mdc` — sección «Orden de prioridad cuando hay tensión entre reglas».

## Regla inviolable — Respuestas limpias (sin fugas de herramientas)

- **Nunca** incluir en respuestas al usuario: sintaxis de invocación de herramientas (p. ej. `mcp_web_fetch`, `url=...`), encabezados tipo "Content from URL", JSON crudo de APIs, ni salida de depuración.
- Siempre resumir y formatear datos de forma legible. Ver `.cursor/rules/respuestas-limpias.mdc`.

## Reglas detalladas

Ver `.cursor/rules/vitacora-registro.mdc`, `vitacora-obligatoria-todos-proyectos.mdc`, `respuestas-limpias.mdc` y `aplicacion-total-reglas.mdc`.
