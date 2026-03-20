'use strict';
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'docs', 'vitacora', 'CONSOLIDACION_COMPLETA_TODO.md');
const section = `

---

# Registro de interacciones (append-only)

**A partir de 2026-03-07:** Toda nueva información, cambios, logs, transcripts y documentación se añade aquí. No crear archivos nuevos en otros sitios.

Formato: \`- **YYYY-MM-DD HH:MM** — Descripción. (Contexto si aplica.)\`

---

## Entradas

- **2026-03-07** — Política de vitácora única: todo nuevo registro, cambio, log, transcript y documentación va solo en \`docs/vitacora\` y en este único archivo. Si alcanza 5 MB, crear \`CONSOLIDACION_COMPLETA_TODO_02.md\` como continuación. Reglas actualizadas: vitacora-registro.mdc, workspace-unificado.mdc.
`;
fs.appendFileSync(file, section, 'utf8');
console.log('Sección Registro añadida.');
