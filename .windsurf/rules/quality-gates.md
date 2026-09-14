---
trigger: always_on
description: Four quality gates to run before raising a PR
---

# Quality gates for AdvancePlaywrightFramework2x

Applies to every AI coding agent working in this repository: GitHub Copilot, Claude Code,
Cursor, Windsurf, Kiro, Devin, OpenCode and any other.

## The four gates

Run all four over your diff **before** raising a pull request. They are cheap, and they catch the
four ways AI-assisted changes usually go wrong in this repo.

| Gate | The question it asks |
|:-----|:---------------------|
| **ai-slop** | Was this generated, skimmed, and shipped? |
| **ponytail** | Does anything else in the run already record this? |
| **over-engineering** | How many callers does this abstraction have? |
| **framework-patterns** | Is this still part of *this* framework? |

### 1. ai-slop
Invented APIs that do not exist. Assertions that cannot fail. `any` or `@ts-ignore` used to mute
the compiler. Comments restating the code. A new helper duplicating one in `src/utils/`. Exports
nobody imports. **Documented claims nobody ran.**

### 2. ponytail
`playwright.config.ts` sets `trace: 'on'` and `video: 'on'`, so the trace already records every
request, timing and body. A `test.step` or `testInfo.attach` that only surfaces that is duplicate.
So is a `log.info` restating its own step name, or a `describe` around one test. Report findings
as `<file>:L<n>: <tag> <what>. <replacement>.` and end with `net: -N lines possible.`
Never cut an assertion, never cut knowledge that cannot be re-derived from the code, and never
touch test granularity: that is a decision about how failures report.

### 3. over-engineering
Count the callers, with a command, and paste the number. **One caller is not an abstraction, it is
a detour. Zero is dead code.** The exception is a seam something outside your control requires
(`hasApiKey()` has one caller because `CustomReporter` demands that exact function). A type used
only in its own file should lose its `export`, not be deleted.

### 4. framework-patterns
- Specs import `@fixtures/test-base` (or `@fixtures/booker.fixture`), **never `@playwright/test`**.
- No locators in specs. They belong in `src/pages/*.ts` as `private readonly` fields.
- Page objects extend `BasePage` with `super(page, 'ClassName')` and act through `this.el.*`.
- **Spec filenames need a dot: `*.spec.ts`.** An underscore before `spec` is silently never collected.
- **A new test directory needs its project decided when it is created.** `chromium` (`src/tests`,
  ignoring `apisTests` and `aiTest`), `api` (`src/tests/apisTests`), `ai` (`src/tests/aiTest`).
- Env through `@config/env`. Credentials from `@config/credentials`. Never commit a key.
- `ajv` + `ajv-formats` for schemas, `jsonpath-plus` for JSON. Zod is not a dependency.
- Path aliases `@api @config @fixtures @pages @testdata @utils` over relative imports.
- **No test may pass or fail on model output**, and the suite must stay green with no API key.
- No em dashes in any documentation.

## Evidence is the whole point

**A gate that cannot cite a command it ran has not run.** "Looks fine" is not a verdict.

```bash
npm run verify                              # typecheck, lint, full suite
npx playwright test --project=<p> --list    # proves a new spec is actually collected
git diff main...HEAD                        # the change under review
```

Report `PASS` or `FAIL` per gate with the grep, the counts or the line numbers behind it. Never
weaken a gate to make a diff pass; fix the gate in its own commit and say so.

Full detail for each gate lives in `.claude/skills/gate-*/SKILL.md`, which every agent listed here
can read as plain markdown.
