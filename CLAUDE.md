# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies and browsers
npm install
npx playwright install

# Run all tests
npx playwright test

# Run a single test file
npx playwright test src/tests/example.spec.ts

# Headed mode
npx playwright test --headed

# Target a specific environment
TTA_ENV=stage npx playwright test

# View HTML report
npx playwright show-report

# Quality gates and lint
npm run gate                       # whole repo, commit profile
npm run gate -- --file <path>      # one file
npm run gate:changed               # what this branch adds, with CI budgets
npm run gate:audit                 # everything, fails on nothing
npm run gate:rules                 # every rule and its severity
npm run lint                       # ESLint, whole repo (does not pass: see the baseline below)
npm run lint:changed               # ESLint over what this branch adds
npm run verify                     # typecheck + lint + gate, whole repo
npm run verify:branch              # typecheck + lint + gate, this branch only. This one must pass
node quality/selftest.mjs          # proves the rules still fire
```

No build step. `tsconfig.json` uses `commonjs` modules; `playwright.config.ts` is TypeScript and Playwright handles `ts` files natively.

## Architecture

**Layers** (planned, most directories currently empty):

| Directory | Purpose |
|-----------|---------|
| `src/pages/` | Page Object Model classes. One class per page/section. |
| `src/api/` | API request helpers (REST/GraphQL) using Playwright's `APIRequestContext`. |
| `src/fixtures/` | Custom Playwright fixtures extending `test.extend()`. Combine page objects + API clients. |
| `src/testdata/` | Static JSON/CSV/Excel data and Faker.js data generators. |
| `src/tests/` | Test specs. Import from fixtures, not directly from pages/api. |
| `src/config/` | Environment config, logger setup, global constants. |
| `src/utils/` | Shared utilities (schema validators via Ajv, JSON path queries via jsonpath-plus, file readers for CSV/Excel). |

**Pattern to follow for new tests:**
1. Create page object in `src/pages/` with locators and actions.
2. Create a custom fixture in `src/fixtures/` that injects page objects.
3. Write the test in `src/tests/` using only the fixture.

## Path Aliases

Configured in `tsconfig.json` (no runtime resolution needed since Playwright compiles natively):

```
@api/*       → src/api/*
@config/*    → src/config/*
@fixtures/*  → src/fixtures/*
@pages/*     → src/pages/*
@testdata/*  → src/testdata/*
@utils/*     → src/utils/*
```

## Environment Switching

Set `TTA_ENV` to `qa` | `dev` | `local` | `stg` | `stage` | `staging` | `prod` | `production` | `api`. Falls back to `qa`. A `BASE_URL` env var bypasses all resolution. See `playwright.config.ts:resolveBaseURL()`.

Other env vars read from `.env`: `LOG_LEVEL`, `TEST_ENV`, `TEST_AUTHOR`, `USERNAME`, `PASSWORD`.

## Key Dependencies

- **`@playwright/test`** — test runner + assertions + browser automation.
- **`@faker-js/faker`** — generate random test data (names, emails, addresses).
- **`ajv` + `ajv-formats`** — JSON schema validation for API response contracts.
- **`jsonpath-plus`** — query JSON responses with JSONPath expressions.
- **`csv-parse` / `xlsx`** — read CSV/Excel files for data-driven tests.
- **`winston`** — structured logging.
- **`allure-playwright`** — Allure report integration (not yet wired in `playwright.config.ts` reporters).
- **`dotenv`** — load `.env` into `process.env`.

## CI

GitHub Actions on `.github/workflows/playwright.yml`. Triggers on push/PR to `main`/`master`. Runs on ubuntu-latest, installs deps + browsers, runs `npx playwright test`, uploads `playwright-report/` artifact (30-day retention).

## Quality Gates

Four gates run over `src/**/*.ts` and `playwright.config.ts`: **ai-slop**, **ponytail**,
**over-engineering**, **framework-patterns**. 46 rules live as data in `rules/*.rules.mjs`; the
zero-dependency engine that runs them lives in `quality/`. Full design in `docs/QUALITY-GATES.md`.

They fire in four places, all calling `node quality/gate.mjs`:

| Stage | Hook | Consequence |
|---|---|---|
| Prompt submitted | `.claude/hooks/inject-rules.mjs` | The 13 blocking rules enter context |
| Before a Write | `.claude/hooks/guard-file-placement.mjs` | Denies a spec outside `src/tests/` |
| After Write/Edit | `.claude/hooks/gate-on-edit.mjs` | `error` blocks the edit, `warn` is printed |
| Before `git commit` | `.claude/hooks/gate-on-commit.mjs`, `.githooks/pre-commit` | Gate + ESLint on staged files |
| Before `git push` | `.githooks/pre-push` | Typecheck, then lint and gate across the branch |
| Pull request | `.github/workflows/quality-gate.yml` | Changed files, budgets, sticky comment |

Severity decides consequence, not importance. `error` blocks; `warn` is a judgement call counted
against a per-change budget; `info` is a prompt to look.

**ESLint owns what has a correct answer** (floating promises, `waitForTimeout`, `force: true`,
`any`). **The engine owns what needs the repo's shape** (is this used twice, does this comment add
anything, does this spec go through the fixture). One owner per rule. ESLint is not in the edit hook:
a type-aware lint of one file costs 2.2s against the engine's 0.14s, so it runs at commit and in CI.

Waive a genuine exception with `// gate-allow <rule-id> -- <reason>` on the line or the one above.
**A waiver with no reason is itself an error.** Do not waive to go faster.

The whole-repo baseline (7 error, 57 warn, 9 info from the gate; 13 error, 21 warn from ESLint) is
pre-existing. The PR gate runs on changed files only, so a change cannot add to it. Do not sweep
unrelated files to drive the number down.

Learning the system: `docs/lint-and-typecheck-tutorial.html` covers tsc, ESLint and rules from
scratch; `docs/quality-gates-tutorial.html` is a twelve-lesson guide that builds it from
nothing and `docs/quality-gates-tutorial-v2.html` is the seven-step teaching cut of the same material, and `exercises/` is the runnable half (`npm run exercises`). Four lessons are stubs checked
against the real engine; the other eight check the repo artifact. A clean clone reports 8 passing,
4 to do, 0 failing. Do not "fix" the four to-dos: they are the exercises.

The `quality-gate` skill carries all of this as markdown and routes by task:
`references/stages.md` (the five stages), `references/rules.md` (all 46 rules,
generated from the packs), `references/architecture.md` (engine internals),
`references/calibration.md` (tuning a noisy rule), `references/authoring.md`
(the rule shape), and `references/curriculum.md` plus `references/lessons/`
(the twelve lessons). Load the one the task needs rather than all of them.

Adding a rule: `.claude/skills/quality-rule-author/SKILL.md`. Every new rule needs an expectation in
`quality/selftest.mjs` and code that trips it in the slop fixture. The clean fixture must stay clean.

## Configuration Defaults

- Test timeout: 60s, expect timeout: 10s.
- `fullyParallel: true`.
- Retries: 2 on CI (`process.env.CI`), 0 locally.
- Screenshots: `only-on-failure`. Video: `on`. Trace: `on-first-retry`.
- Single browser project: `chromium` (Desktop Chrome).
