import globals from 'globals';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import reactRefreshPlugin from 'eslint-plugin-react-refresh';

export default [
    // TypeScript + React source files
    {
        files: ['apps/web/src/**/*.{ts,tsx}', 'apps/widget/src/**/*.{ts,tsx}'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
                ecmaFeatures: { jsx: true },
            },
            globals: {
                ...globals.browser,
                ...globals.es2021,
                ...globals.node,
            },
        },
        plugins: {
            '@typescript-eslint': tsPlugin,
            react: reactPlugin,
            'react-hooks': reactHooksPlugin,
            'react-refresh': reactRefreshPlugin,
        },
        rules: {
            // ── TypeScript ───────────────────────────────────────────────────────
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unused-vars': [
                'warn',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
            ],

            // ── React ────────────────────────────────────────────────────────────
            'react/react-in-jsx-scope': 'off',   // Not needed with React 17+ JSX transform
            'react/prop-types': 'off',           // TypeScript handles prop types
            'react/no-unescaped-entities': 'off', // Allow ' and " in JSX text
            'react/jsx-no-comment-textnodes': 'warn',

            // ── React Hooks ──────────────────────────────────────────────────────
            ...reactHooksPlugin.configs.recommended.rules,

            // ── React Refresh (HMR) ──────────────────────────────────────────────
            'react-refresh/only-export-components': [
                'warn',
                { allowConstantExport: true },
            ],
        },
        settings: {
            react: {
                version: 'detect',
            },
        },
    },
];
