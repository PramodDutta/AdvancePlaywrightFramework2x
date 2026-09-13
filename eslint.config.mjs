/**
 * ESLint owns one half of the gate: things that are wrong regardless of taste.
 *
 * The split with `quality/` is deliberate and worth stating, because the two
 * overlap if nobody draws the line:
 *
 *   ESLint          - known-bad API use and unsafe code. A floating promise, a
 *                     hard wait, a `.click({ force: true })`, an `any`. These
 *                     have a correct answer and a fixer.
 *   quality/ engine - judgement that needs the repo's own shape: is this
 *                     abstraction used twice, does this comment add anything,
 *                     does this spec go through the fixture.
 *
 * So `no-wait-for-timeout` lives here and is absent from the AI-slop pack, even
 * though a hard wait is the most recognisable AI tell there is. One owner per
 * rule, or the report says everything twice.
 */
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';
import globals from 'globals';

export default tseslint.config(
    {
        ignores: [
            'node_modules/**',
            'playwright-report/**',
            'test-results/**',
            'tta-report/**',
            'reports/**',
            'logs/**',
            'docs/**',
            'allure-results/**',
        ],
    },

    // Plain JS/ESM: the gate engine, the hooks, this file. No type information
    // available for them, so no type-aware rules.
    {
        files: ['**/*.mjs', '**/*.js'],
        extends: [js.configs.recommended],
        languageOptions: {
            ecmaVersion: 2023,
            sourceType: 'module',
            globals: globals.node,
        },
        rules: {
            'no-console': 'off',
        },
    },

    {
        files: ['**/*.ts'],
        extends: [js.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
            globals: globals.node,
        },
        rules: {
            // The one rule that pays for the whole type-aware setup. A missing
            // `await` on a Playwright action does not fail: the test finishes
            // early and passes, and the action lands on the next test's page.
            '@typescript-eslint/no-floating-promises': 'error',
            '@typescript-eslint/await-thenable': 'error',
            '@typescript-eslint/no-misused-promises': 'error',
            '@typescript-eslint/require-await': 'warn',

            // `any` in a test suite is usually an unvalidated API response.
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-argument': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/no-unsafe-return': 'off',
            '@typescript-eslint/restrict-template-expressions': 'off',

            '@typescript-eslint/no-unused-vars': ['error', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
                caughtErrorsIgnorePattern: '^_',
            }],

            // Over-engineering, the part a linter can count. The `quality`
            // engine handles the part it cannot.
            'max-params': ['warn', 4],
            complexity: ['warn', 12],
            'max-depth': ['warn', 4],

            eqeqeq: ['error', 'smart'],
            'no-var': 'error',
            'prefer-const': 'error',
            'no-empty': ['error', { allowEmptyCatch: false }],
            'no-console': 'error',
        },
    },

    // Specs: the Playwright plugin's own recommendations, plus the framework's.
    {
        files: ['src/tests/**/*.ts'],
        extends: [playwright.configs['flat/recommended']],
        rules: {
            'playwright/no-wait-for-timeout': 'error',
            'playwright/no-force-option': 'error',
            'playwright/no-page-pause': 'error',
            'playwright/no-element-handle': 'error',
            'playwright/no-eval': 'error',
            'playwright/prefer-web-first-assertions': 'error',
            'playwright/no-conditional-in-test': 'warn',
            'playwright/no-conditional-expect': 'error',
            'playwright/valid-expect': 'error',
            'playwright/no-focused-test': 'error',
            'playwright/no-skipped-test': ['warn', { allowConditional: true }],
            'playwright/expect-expect': 'off', // owned by slop/test-without-assertion, which understands assert* page methods
            'playwright/no-standalone-expect': 'off', // the API specs assert inside helpers on purpose
        },
    },

    // Page objects hold the selectors, so the plugin's spec-shaped rules do not
    // apply, but the floating-promise rule matters more here than anywhere.
    {
        files: ['src/pages/**/*.ts', 'src/fixtures/**/*.ts'],
        rules: {
            'max-params': ['warn', 5],
        },
    },

    // The AI demo specs exist to misbehave: FlakyDemo is deterministically
    // flaky by design, SelfHealDemo branches on whether a locator died and
    // asserts inside the branch. `quality/gate.config.mjs` excludes this
    // directory for the same reason, and the two exclusions should not drift
    // apart. Everything that is still a real bug stays on.
    {
        files: ['src/tests/aiTest/**/*.ts'],
        rules: {
            'playwright/no-conditional-in-test': 'off',
            'playwright/no-conditional-expect': 'off',
            '@typescript-eslint/require-await': 'off',
        },
    },

    // Two modules whose job is writing to stdout.
    {
        files: ['src/utils/CustomReporter.ts', 'src/utils/logger.ts'],
        rules: {
            'no-console': 'off',
        },
    },
);
