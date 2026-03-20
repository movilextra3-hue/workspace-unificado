'use strict';
/** ESLint para la raíz del workspace (scripts/, etc.). */
module.exports = {
  root: true,
  env: { node: true, es2022: true },
  parserOptions: { ecmaVersion: 2022 },
  ignorePatterns: ['node_modules/', '**/node_modules/', '**/build/', '**/venv/'],
  rules: {
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-undef': 'error',
    'strict': ['error', 'global'],
    'semi': ['error', 'always'],
    'quotes': ['error', 'single', { avoidEscape: true }]
  }
};
