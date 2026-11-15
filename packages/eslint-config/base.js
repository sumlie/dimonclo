import stylistic from '@stylistic/eslint-plugin';
import babelParser from '@babel/eslint-parser';
import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import turboPlugin from 'eslint-plugin-turbo';
import onlyWarn from 'eslint-plugin-only-warn';

/**
 * A shared ESLint configuration for the repository.
 *
 * @type {import("eslint").Linter.Config[]}
 * */
export const config = [
  js.configs.recommended,
  eslintConfigPrettier,
  {
    plugins: { '@stylistic': stylistic },
    rules: {
      curly: ['error', 'all'],
      '@stylistic/padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: 'import', next: '*' },
        { blankLine: 'any', prev: 'import', next: 'import' },
        { blankLine: 'always', prev: 'directive', next: '*' },
        { blankLine: 'any', prev: 'directive', next: 'directive' },
        {
          blankLine: 'always',
          prev: ['const', 'let', 'var'],
          next: '*',
        },
        {
          blankLine: 'any',
          prev: ['const', 'let', 'var'],
          next: ['const', 'let', 'var'],
        },
        {
          blankLine: 'always',
          prev: '*',
          next: ['multiline-const', 'multiline-let', 'multiline-var'],
        },
        {
          blankLine: 'always',
          prev: ['multiline-const', 'multiline-let', 'multiline-var'],
          next: '*',
        },
        {
          blankLine: 'always',
          prev: '*',
          next: ['if', 'for', 'while', 'do', 'switch', 'try'],
        },
        {
          blankLine: 'always',
          prev: ['if', 'for', 'while', 'do', 'switch', 'try'],
          next: '*',
        },
        {
          blankLine: 'always',
          prev: '*',
          next: ['function', 'class', 'interface', 'type', 'return'],
        },
        {
          blankLine: 'always',
          prev: ['function', 'class', 'interface', 'type'],
          next: '*',
        },
        {
          blankLine: 'always',
          prev: '*',
          next: {
            selector:
              'ExportNamedDeclaration[declaration!=null], ExportDefaultDeclaration',
          },
        },
        {
          blankLine: 'always',
          prev: {
            selector:
              'ExportNamedDeclaration[declaration!=null], ExportDefaultDeclaration',
          },
          next: '*',
        },
      ],
    },
  },
  {
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        requireConfigFile: false,
        babelOptions: {
          presets: ['@babel/preset-typescript'],
        },
      },
    },
    plugins: {
      turbo: turboPlugin,
    },
    rules: {
      'turbo/no-undeclared-env-vars': 'warn',
    },
  },
  {
    files: ['**/*.{tsx,jsx}'],
    languageOptions: {
      parserOptions: {
        babelOptions: {
          parserOpts: { plugins: ['jsx'] },
        },
      },
    },
  },
  {
    plugins: {
      onlyWarn,
    },
  },
  {
    ignores: ['dist/**'],
  },
];
