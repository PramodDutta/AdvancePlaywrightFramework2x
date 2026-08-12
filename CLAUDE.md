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

## Configuration Defaults

- Test timeout: 60s, expect timeout: 10s.
- `fullyParallel: true`.
- Retries: 2 on CI (`process.env.CI`), 0 locally.
- Screenshots: `only-on-failure`. Video: `on`. Trace: `on-first-retry`.
- Single browser project: `chromium` (Desktop Chrome).
