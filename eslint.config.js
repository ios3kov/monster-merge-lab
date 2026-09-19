import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

const tsFiles = [
  'src/**/*.{ts,tsx}',
  'tests/**/*.ts',
  'e2e/**/*.ts',
  'playwright.config.ts',
];

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  { ...js.configs.recommended, files: ['src/**/*.{ts,tsx,js}', 'scripts/**/*.mjs'] },
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: tsFiles,
  })),
  {
    files: ['src/**/*.{ts,tsx,js}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.serviceworker },
    },
    plugins: { 'react-hooks': hooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
    },
  },
  {
    files: ['tests/**/*.ts', 'e2e/**/*.ts', 'playwright.config.ts', 'scripts/**/*.mjs'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
);
