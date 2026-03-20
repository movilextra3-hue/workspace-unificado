'use strict';
/** ESLint para bank-tokenization (Hardhat/Node). */
module.exports = {
  root: true,
  env: { node: true, es2022: true },
  parserOptions: { ecmaVersion: 2022 },
  ignorePatterns: ['node_modules/', 'artifacts/', 'cache/'],
  rules: {
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-undef': 'error',
    'strict': ['error', 'global'],
    'semi': ['error', 'always'],
    'quotes': ['error', 'single', { avoidEscape: true }]
  }
};
