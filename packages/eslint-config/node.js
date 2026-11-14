import globals from 'globals';
import { config as baseConfig } from './base.js';

export const nodeConfig = [
  ...baseConfig,
  { ignores: ['dist/**'] },
  {
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        babelOptions: {
          parserOpts: { plugins: ['decorators-legacy'] },
        },
      },
    },
  },
  {
    files: ['**/*.ts'],
    // TypeScript checks identifiers and unused declarations.
    rules: { 'no-undef': 'off', 'no-unused-vars': 'off' },
  },
];
