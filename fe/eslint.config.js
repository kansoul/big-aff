import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import importPlugin from 'eslint-plugin-import'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import js from '@eslint/js'

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs', 'eslint.config.js', 'dist/**', 'node_modules/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      sourceType: 'module',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json',
        },
      },
    },
  },
  {
    plugins: {
      import: importPlugin,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['off', { allowConstantExport: true }],
      'prettier/prettier': [
        'error',
        {
          semi: false,
          singleQuote: true,
          printWidth: 100,
          tabWidth: 2,
          useTabs: false,
          trailingComma: 'all',
          arrowParens: 'always',
          endOfLine: 'lf',
          jsxSingleQuote: false,
          bracketSpacing: true,
        },
      ],
      '@typescript-eslint/no-empty-function': [
        'error',
        {
          allow: ['functions', 'constructors'],
        },
      ],
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/require-await': 'warn',
      '@typescript-eslint/no-misused-promises': 'warn',
      '@typescript-eslint/only-throw-error': 'warn',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  eslintPluginPrettierRecommended,
)
