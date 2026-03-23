# Registro diario de la vitácora

## Objetivo

Evitar abrir el monolito `CONSOLIDACION_COMPLETA_TODO.md` (cientos de miles de líneas) para **cada** consulta o registro, reduciendo RAM y cierres por OOM en Cursor.

## Convención

| Qué | Dónde |
|-----|--------|
| **Registro nuevo** (cada acción relevante del agente o del equipo) | `docs/vitacora/registro/YYYY-MM-DD.md` — **un archivo por día civil** (fecha local). |
| **Varias entradas el mismo día** | Mismo archivo del día: añadir viñetas al final de la sección «Registro del día» (append intra-archivo). |
| **Índice ligero** | `docs/vitacora/REGISTRO_DIARIO_INDICE.md` — actualizar con una línea al **crear** un archivo de día nuevo (opcional si ya existe fila para esa fecha). |
| **Histórico masivo** | `CONSOLIDACION_COMPLETA_TODO.md` y continuaciones `_02`, etc. — **solo lectura acotada** (grep, offset/limit, cola); **no** append de registro operativo. |

## Formato de cada archivo diario

Nombre: **`YYYY-MM-DD.md`** (ej. `2026-03-22.md`).

Plantilla:

```markdown
# Vitácora — YYYY-MM-DD

## Registro del día

- **YYYY-MM-DD HH:MM** — Descripción breve. (Contexto: archivos, comandos, commits si aplica.)
```

## Procedimiento para el agente

1. **Registrar:** Si no existe `registro/YYYY-MM-DD.md` para hoy, crearlo con la plantilla (y actualizar el índice).
2. **Añadir entrada:** Una viñeta por acción relevante al final de «Registro del día» (no reescribir el archivo entero salvo corrección mínima).
3. **Consultar contexto reciente:** Leer `REGISTRO_DIARIO_INDICE.md` + archivos de los últimos 1–7 días según necesidad — **no** cargar `CONSOLIDACION_COMPLETA_TODO.md` completo.
4. **Buscar en histórico antiguo:** Usar búsqueda en workspace o `Select-String` sobre el monolito por patrón, sin abrir el archivo entero en el editor.

## Nota sobre CONSOLIDACION_COMPLETA_TODO.md

Sigue siendo la copia consolidada legada; su crecimiento ya no debe alimentarse con el registro cotidiano.
