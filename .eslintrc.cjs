/**
 * ESLint config — sane defaults for a React + TypeScript SPA.
 *
 * Includes:
 *  • @typescript-eslint   — TS-aware rules
 *  • react-hooks          — exhaustive-deps + rules-of-hooks
 *  • jsx-a11y             — accessibility lint
 *  • react-refresh        — keep HMR-safe exports
 *
 * Rules are deliberately tuned to "warn" rather than "error" for non-critical
 * issues so existing code can adopt incrementally without blocking CI.
 */
module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks', 'jsx-a11y', 'react-refresh'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
  ],
  settings: {
    react: { version: 'detect' },
  },
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'react/no-unescaped-entities': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-empty-object-type': 'off',
    'react-refresh/only-export-components': 'warn',
    'jsx-a11y/no-static-element-interactions': 'warn',
    'jsx-a11y/click-events-have-key-events': 'warn',
    'jsx-a11y/anchor-is-valid': 'warn',
  },
  ignorePatterns: ['dist', 'node_modules', 'coverage', 'public', '*.config.*'],
};
