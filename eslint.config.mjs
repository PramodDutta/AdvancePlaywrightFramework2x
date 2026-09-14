// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';

/**
 * Flat config (ESLint 9+). Run with `npm run lint`.
 *
 * Type-aware rules are on deliberately. The single most common bug in a
 * Playwright suite is a missing `await`: the assertion resolves after the test
 * has ended, so the test passes while checking nothing. Only a type-aware rule
 * (`no-floating-promises`) can see that, and it is the reason this config costs
 * a few seconds per run rather than milliseconds.
 */
export default tseslint.config(
    {
        // Generated output and vendored code. Everything here is rebuilt by a run.
        ignores: [
            'node_modules/**',
            'test-results/**',
            'playwright-report/**',
            'blob-report/**',
            'tta-report/**',
            'reports/**',
            'logs/**',
            'docs/**',
            'learnings/**',
            'playwright/.cache/**',
            '.claude/**',   // agent skills, not project source
        ],
    },

    js.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,

    {
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            // A missing await in a Playwright spec is a test that asserts nothing.
            '@typescript-eslint/no-floating-promises': 'error',
            '@typescript-eslint/await-thenable': 'error',

            // Unused code is dead weight, but an _-prefixed binding is a
            // deliberate discard (see toApiPayload in dataGenAgent).
            '@typescript-eslint/no-unused-vars': ['error', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
                caughtErrorsIgnorePattern: '^_',
            }],

            // `any` erases the type checking this repo relies on.
            '@typescript-eslint/no-explicit-any': 'warn',

            // `response.json()` and `JSONPath()` both return `any`, so these fire
            // across every raw API spec. They are worth seeing, not worth blocking
            // a build over: the real contract check is the Ajv schema at Level 05,
            // which validates the whole body at run time. Warn, so the count stays
            // visible and does not quietly grow.
            '@typescript-eslint/no-unsafe-assignment': 'warn',
            '@typescript-eslint/no-unsafe-member-access': 'warn',
            '@typescript-eslint/no-unsafe-argument': 'warn',
            '@typescript-eslint/no-unsafe-call': 'warn',
            '@typescript-eslint/no-unsafe-return': 'warn',

            // An async function with no await is usually interface conformance
            // (a reporter hook, an agent signature), not a mistake.
            '@typescript-eslint/require-await': 'warn',

            // Autofix removes casts that are load-bearing when the source is
            // `any`: stripping `as number[]` from a JSONPath call left callbacks
            // with implicit any and broke the build. Keep it visible, never auto.
            '@typescript-eslint/no-unnecessary-type-assertion': 'warn',

            'no-console': 'off',            // the reporter prints to the console by design
            'eqeqeq': ['error', 'always'],
            'prefer-const': 'error',
        },
    },

    // Spec files: Playwright's own rules, which catch focused tests and
    // conditional assertions that would silently reduce coverage.
    {
        files: ['src/tests/**/*.spec.ts'],
        ...playwright.configs['flat/recommended'],
        rules: {
            ...playwright.configs['flat/recommended'].rules,
            // A committed test.only silently skips the rest of the file.
            'playwright/no-focused-test': 'error',
            // Demo specs legitimately skip on an env flag.
            'playwright/no-skipped-test': 'off',
            // test.step callbacks read better without a return-await rule fighting them.
            'playwright/no-standalone-expect': 'off',
        },
    },

    // Config files run in Node and are not part of the tsconfig program.
    {
        files: ['*.config.ts', '*.config.mjs', 'eslint.config.mjs'],
        ...tseslint.configs.disableTypeChecked,
    },
);
