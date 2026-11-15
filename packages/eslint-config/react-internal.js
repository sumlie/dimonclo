import pluginReactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import { config as baseConfig } from './base.js';

/**
 * A custom ESLint configuration for libraries that use React.
 *
 * @type {import("eslint").Linter.Config[]} */
export const config = [
  ...baseConfig,
  {
    languageOptions: {
      globals: {
        ...globals.serviceworker,
        ...globals.browser,
      },
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    // Core JavaScript rules do not understand TypeScript type declarations.
    rules: { 'no-undef': 'off', 'no-unused-vars': 'off' },
  },
  pluginReactHooks.configs.flat.recommended,
];
