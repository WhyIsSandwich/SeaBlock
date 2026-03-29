import js from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier'
import importPlugin from 'eslint-plugin-import'
import pluginVue from 'eslint-plugin-vue'
import unusedImports from 'eslint-plugin-unused-imports'
import globals from 'globals'

const unusedImportsRules = {
  'no-unused-vars': 'off',
  'unused-imports/no-unused-imports': 'error',
  'unused-imports/no-unused-vars': [
    'warn',
    {
      vars: 'all',
      varsIgnorePattern: '^_',
      args: 'after-used',
      argsIgnorePattern: '^_'
    }
  ]
}

export default [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      'reports/**',
      'generated/**',
      'docs/.vitepress/cache/**',
      'docs/.vitepress/dist/**',
      'docs/public/assets/**',
      '**/*.snap'
    ]
  },
  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module'
    },
    plugins: {
      import: importPlugin,
      'unused-imports': unusedImports
    },
    rules: {
      ...importPlugin.configs.recommended.rules,
      ...unusedImportsRules
    },
    settings: {
      'import/resolver': {
        node: { extensions: ['.js', '.mjs', '.cjs', '.vue'] }
      }
    }
  },
  {
    files: ['**/*.vue'],
    plugins: {
      import: importPlugin,
      'unused-imports': unusedImports
    },
    rules: {
      ...importPlugin.configs.recommended.rules,
      ...unusedImportsRules
    },
    settings: {
      'import/resolver': {
        node: { extensions: ['.js', '.mjs', '.cjs', '.vue'] }
      }
    }
  },
  {
    files: ['scripts/**/*.js', 'scripts/**/*.mjs'],
    languageOptions: {
      globals: globals.node
    }
  },
  {
    files: [
      'vitest.config.js',
      'vite.extracted.config.js',
      'docs/.vitepress/config.js',
      'docs/.vitepress/config-data.js'
    ],
    languageOptions: {
      globals: { ...globals.node }
    }
  },
  {
    files: ['src/**/*.js', 'docs/.vitepress/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      }
    }
  },
  {
    files: [
      'src/**/__tests__/**/*.js',
      'src/**/*.test.js',
      'src/utils/**/__tests__/**/*.js',
      'test/**/*.js'
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...(globals.vitest ?? globals.jest)
      }
    }
  },
  eslintConfigPrettier
]
