'use strict';
/**
 * Instala E:\.eslintrc.cjs para que ESLint no analice node_modules en toda E:\.
 * Ejecutar: node scripts/instalar-eslintrc-en-E.js
 * Si falla por permisos, ejecutar PowerShell como administrador y volver a ejecutar.
 */
const fs = require('fs');
const path = require('path');

const CONTENIDO = `'use strict';
// Configuración ESLint para toda E:\\\\ — excluye dependencias y builds.
// Solución real a los ~2100 problemas: no se lintan node_modules ni build.
module.exports = {
  root: true,
  env: { node: true, es2022: true },
  parserOptions: { ecmaVersion: 2022 },
  ignorePatterns: [
    '**/node_modules/**',
    '**/build/**',
    '**/dist/**',
    '**/archivos_delicados/**',
    '**/.git/**',
    '**/vendor/**',
    '**/*.min.js'
  ],
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-undef': 'error',
    'no-unreachable': 'error',
    'no-constant-condition': 'warn',
    'no-empty': 'warn',
    'strict': ['warn', 'global'],
    'semi': ['warn', 'always'],
    'quotes': ['warn', 'single', { avoidEscape: true }]
  }
};
`;

const ARCHIVO = 'E:\\.eslintrc.cjs';

function main() {
  try {
    fs.writeFileSync(ARCHIVO, CONTENIDO, 'utf8');
    console.log('OK: Creado', ARCHIVO);
    console.log('ESLint en E:\\ ya no analizará node_modules. Recarga la ventana del editor (Ctrl+Shift+P → Recargar ventana).');
  } catch (e) {
    console.error('No se pudo escribir en E:\\. Error:', e.message);
    console.error('');
    console.error('Solución: ejecuta PowerShell como administrador y luego:');
    console.error('  cd "' + path.join(__dirname, '..') + '"');
    console.error('  node scripts/instalar-eslintrc-en-E.js');
    console.error('');
    console.error('O crea manualmente el archivo E:\\.eslintrc.cjs con el contenido de scripts/eslintrc-para-E.txt');
    process.exit(1);
  }
}

main();
