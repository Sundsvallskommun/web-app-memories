import js from '@eslint/js';
import coreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import tseslint from 'typescript-eslint';
import globals from 'globals';

const config = [
  {
    ignores: ['.next/**', '**/dist/**', 'coverage/**', '**/*.jsx', '**/*.d.ts', 'src/data-contracts/backend/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...coreWebVitals,
  ...nextTypescript,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
        ...globals.jest,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      // New in eslint-config-next 16 (React Compiler aware). It flags six
      // pre-existing effects that reset state when a prop changes. Fixing them
      // means refactoring components that HYDRAN-2742 and HYDRAN-2743 rewrite
      // anyway, so keep it visible as a warning rather than blocking the
      // upgrade on an unrelated behavioural change.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
];

export default config;
