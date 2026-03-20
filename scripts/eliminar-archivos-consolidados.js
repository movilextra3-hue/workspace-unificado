'use strict';
/**
 * Elimina los archivos que fueron consolidados en CONSOLIDACION_COMPLETA_TODO.md.
 * Mantiene solo CONSOLIDACION_COMPLETA_TODO.md en docs/vitacora.
 *
 * Uso: node scripts/eliminar-archivos-consolidados.js [--dry-run]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const VITACORA = path.join(ROOT, 'docs', 'vitacora');
const INVENTARIO = path.join(VITACORA, 'vitacora_inventario.json');
const MANTENER = ['CONSOLIDACION_COMPLETA_TODO.md'];

function main() {
  const dryRun = process.argv.includes('--dry-run');
  if (dryRun) console.log('Modo dry-run: no se eliminará nada.\n');

  const inv = JSON.parse(fs.readFileSync(INVENTARIO, 'utf8'));
  const archivos = inv.archivos || [];

  const aEliminar = archivos.filter((a) => {
    const base = path.basename(a.ruta);
    return !MANTENER.includes(base);
  });

  let eliminados = 0;
  let errores = 0;

  for (const a of aEliminar) {
    if (!fs.existsSync(a.ruta)) {
      console.log('No existe:', path.relative(VITACORA, a.ruta));
      continue;
    }
    if (dryRun) {
      console.log('Eliminaría:', path.relative(VITACORA, a.ruta));
      eliminados++;
      continue;
    }
    try {
      fs.unlinkSync(a.ruta);
      console.log('Eliminado:', path.relative(VITACORA, a.ruta));
      eliminados++;
    } catch (e) {
      console.error('Error:', a.ruta, e.message);
      errores++;
    }
  }

  console.log('\nEliminados:', eliminados);
  if (errores) console.log('Errores:', errores);
}

main();
