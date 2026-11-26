import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**'
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: [ 'src/**/*.ts' ]
  })),
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser
      }
    }
  },
  {
    files: [ 'test/**', 'vite.config.js', 'vitest.config.js', 'eslint.config.js' ],
    languageOptions: {
      globals: {
        ...globals.node
      }
    }
  }
];
