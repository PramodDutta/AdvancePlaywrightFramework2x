# Lesson 02 - The gap a linter cannot see

Builds: `quality/gate.config.mjs`

Run ESLint over a spec that asserts nothing and it finds an unused parameter.
Every genuine problem is invisible to it, and not because ESLint is weak: "does
this spec go through the fixture layer?" has no universal answer. It depends on
a fixture module that exists in *this* repo. A general-purpose linter cannot
ship that rule and you should not want it to.

The pipeline is one line: read a file into something rules can reason about, run
rules, render, exit. Before any of it, write down what gets scanned and how hard
each stage bites.

```js
export default {
    include: ['src/**/*.ts', 'playwright.config.ts'],
    exclude: ['**/node_modules/**', '**/*.d.ts', 'src/tests/aiTest/**'],
    severityOverrides: {},
    profiles: {
        hook:   { fail: ['error'], budgets: {} },
        commit: { fail: ['error'], budgets: {} },
        ci: {
            fail: ['error'],
            budgets: { 'ai-slop': { warn: 6 }, ponytail: { warn: 8 },
                       'over-engineering': { warn: 6 }, 'framework-patterns': { warn: 4 } },
        },
        audit:  { fail: [], budgets: {} },
    },
};
```

Every exclusion needs a reason written next to it. `src/tests/aiTest/**` is
excluded because those demos exist to misbehave: one is deterministically flaky
by design, another branches on whether a locator died. Keep that exclusion in
sync with the ESLint config's, or the two drift apart.

---

Exercise and checker: `exercises/02-config/TASK.md`, `node exercises/check.mjs 02`.
