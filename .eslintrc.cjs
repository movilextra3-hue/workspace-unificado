module.exports = {
  root: true,
  env: { node: true, es2022: true },
  parserOptions: { ecmaVersion: 2022 },
  ignorePatterns: ['node_modules/', 'build/', 'archivos_delicados/', '**/bankcode-bic-master/**'],
  globals: {
    artifacts: 'readonly',
    contract: 'readonly',
    before: 'readonly',
    it: 'readonly',
    assert: 'readonly',
    describe: 'readonly',
    module: 'writable'
  },
  rules: {
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-undef': 'error',
    'no-unreachable': 'error',
    'no-constant-condition': 'error',
    'no-empty': 'error',
    'strict': ['error', 'global'],
    'semi': ['error', 'always'],
    'quotes': ['error', 'single', { avoidEscape: true }]
  },
  overrides: [
    {
      files: ['**/eslint.config.js', '**/eslint.config.mjs'],
      parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
      rules: { 'strict': 'off' }
    }
  ]
};
