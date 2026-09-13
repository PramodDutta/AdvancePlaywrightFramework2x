/**
 * gate.config.mjs - what gets scanned, how hard each stage bites.
 *
 * The same rules run at every stage. Only the consequence changes: while Claude
 * is generating code an `error` blocks the edit and a `warn` is advice; on a PR
 * the warnings are counted against a budget so a change cannot quietly add
 * thirty of them. That is the whole point of profiles.
 */
export default {
    include: [
        'src/**/*.ts',
        'playwright.config.ts',
    ],
    exclude: [
        '**/node_modules/**',
        '**/*.d.ts',
        'src/testdata/**/*.json',
        'src/tests/aiTest/**',
    ],

    /** Per-rule severity, without editing the pack. Escape hatch for a team that disagrees. */
    severityOverrides: {},

    profiles: {
        /**
         * Runs inside Claude Code after every Write/Edit, on the single file
         * that changed. Only errors block, so the model fixes contract breaks
         * immediately and still sees the taste findings as guidance.
         */
        hook: {
            fail: ['error'],
            budgets: {},
        },

        /** Local `npm run gate` and the git pre-commit hook. */
        commit: {
            fail: ['error'],
            budgets: {},
        },

        /**
         * The PR gate. Budgets are per-change, not per-repo: a pull request may
         * carry a few judgement-call warnings, not a pile of them.
         */
        ci: {
            fail: ['error'],
            budgets: {
                'ai-slop': { warn: 6 },
                ponytail: { warn: 8 },
                'over-engineering': { warn: 6 },
                'framework-patterns': { warn: 4 },
            },
        },

        /** Whole-repo audit. Reports everything, fails on nothing. */
        audit: {
            fail: [],
            budgets: {},
        },
    },
};
