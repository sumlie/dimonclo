import { nextJsConfig } from '@repo/eslint-config/next-js';

const layers = ['app', 'views', 'widgets', 'features', 'entities', 'shared'];

export default [
  ...nextJsConfig,
  {
    ignores: [
      'src/shared/api/payload-types.ts',
      'app/(payload)/admin/importMap.js',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: { process: 'readonly' } },
    rules: { 'no-undef': 'off', 'no-unused-vars': 'off' },
  },
  {
    files: ['app/(payload)/admin/**/page.tsx', 'app/(payload)/api/**/route.ts'],
    rules: { '@stylistic/padding-line-between-statements': 'off' },
  },
  ...layers.map((layer, index) => ({
    files: [`src/${layer}/**/*.{ts,tsx}`],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: layers.slice(0, index).map((upper) => ({
            group: [`@/${upper}`, `@/${upper}/**`],
            message: 'FSD modules may only import lower layers.',
          })),
        },
      ],
    },
  })),
];
