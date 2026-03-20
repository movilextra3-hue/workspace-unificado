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

## Aplicación total

En cada interacción se aplican todas las reglas del workspace. Ver `.cursor/rules/aplicacion-total-reglas.mdc`.

## Orden de prioridad (sin contradicciones)

Si **ejecución explícita** y otra regla discrepan sobre **qué** hacer (alcance o entregables): primero lo pedido por el usuario; preguntar si falta criterio; el resto de normas rigen **cómo** ejecutar (incluida vitácora solo con acciones relevantes). Detalle: `.cursor/rules/aplicacion-total-reglas.mdc` — sección «Orden de prioridad cuando hay tensión entre reglas».

## Regla inviolable — Respuestas limpias (sin fugas de herramientas)

- **Nunca** incluir en respuestas al usuario: sintaxis de invocación de herramientas (p. ej. `mcp_web_fetch`, `url=...`), encabezados tipo "Content from URL", JSON crudo de APIs, ni salida de depuración.
- Siempre resumir y formatear datos de forma legible. Ver `.cursor/rules/respuestas-limpias.mdc`.

## Reglas detalladas

Ver `.cursor/rules/vitacora-registro.mdc`, `vitacora-obligatoria-todos-proyectos.mdc`, `respuestas-limpias.mdc` y `aplicacion-total-reglas.mdc`.
