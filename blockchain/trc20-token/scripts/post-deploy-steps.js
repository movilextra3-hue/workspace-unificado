#!/usr/bin/env node
'use strict';
/**
 * Pasos automáticos tras el despliegue: actualiza ABI/artefactos e imprime datos para Tronscan.
 * No sustituye los pasos manuales (perfil y verificación en Tronscan).
 * Uso: npm run post-deploy:steps
 */
const path = require('node:path');
const { execSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');

function run(name, script) {
  console.log('');
  console.log('--- ' + name + ' ---');
  try {
    execSync(script, { cwd: ROOT, stdio: 'inherit' });
  } catch (e) {
    console.error(name + ' falló (exit ' + (e.status || 1) + ').');
    process.exit(e.status || 1);
  }
}

console.log('Pasos post-despliegue (automatizados + recordatorio manual)');
run('Actualizar ABI y artefactos', 'node scripts/update-abi.js');
run('Datos para perfil Tronscan', 'node scripts/post-deploy-perfil.js');

console.log('');
console.log('========== RECORDATORIO: pasos manuales ==========');
console.log('1. Guarda una copia de deploy-info.json en un lugar seguro.');
console.log('2. Perfil en Tronscan:');
console.log('   - Opción A: npm run perfil:tronscan:open (abre la página y rellena los campos; tú conectas wallet y guardas).');
console.log('   - Opción B: npm run check:perfil (valida que todo esté listo) y luego abre https://tronscan.org/#/tokens/create/TRC20 y pega los datos.');
console.log('3. Verifica los contratos en https://tronscan.org/#/contracts/verify (Proxy, Implementation, ProxyAdmin).');
console.log('Ver: docs/vitacora/CONSOLIDACION_COMPLETA_TODO.md');
console.log('');
