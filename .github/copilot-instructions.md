# Copilot instructions: AdvancePlaywrightFramework2x

Playwright + TypeScript suite driving **TTACart**, a SauceDemo-style storefront at
`https://app.thetestingacademy.com/playwright/ttacart/`.

## Skills

Task-specific skills live in `.claude/skills/`, which Copilot reads as project agent skills
alongside `.github/skills` and `.agents/skills`. Load the matching one before generating code:

| Skill | Use for |
|---|---|
| `pw-page-object-builder` | new Page Object |
| `pw-fixture-designer` | new fixture (extend `test-base.ts`, never a second module) |
| `pw-test-generator` | new spec |
| `pw-locator-fixer` | brittle selectors |
| `pw-api-tester` | API specs (ajv, not zod) |
| `pw-network-mocker` | `page.route` stubbing |
| `pw-flaky-debugger` | intermittent failures |
| `pw-trace-analyzer` | reading a trace or a failure |
| `pw-visual-regression` | screenshot baselines (not set up yet) |
| `pw-accessibility-auditor` | axe checks (dependency not installed yet) |
| `pw-ci-configurator` | `.github/workflows/playwright.yml` |
| `feature-explainer` | ELI5 + whiteboard page for a shipped change |

## Non-negotiables

1. **Specs import from `@fixtures/test-base`, never `@playwright/test`.** That module carries the page-object and state fixtures.
2. **Never `new SomePage(page)` in a spec.** Take it from a fixture parameter.
3. **No locators in specs.** They belong in `src/pages/*.ts` as `private readonly` fields.
4. **Page objects extend `BasePage`** with `super(page, 'ClassName')`, expose a `static readonly PATH`, and act through `this.el.*` (`UtilElementLocator`), never `locator.click()` directly. That wrapper is what logs every action.
5. **Read env through `@config/env`** (`requireEnv` / `envOr` / `assertEnv`). Importing it loads `.env`. Never call `dotenv.config()` in a spec: Babel hoists imports above it, so modules that read `process.env` at load time would see nothing.
6. **Credentials come from `@config/credentials`** or `@testdata/logintestdata.json`. Never hard-code them.
7. **Schema validation uses `ajv` + `ajv-formats`**, JSON queries use `jsonpath-plus`. Zod is not a dependency.
8. **Log with `createLogger('<scope>')`** from `@utils/logger`, one scope per file.
9. **Wrap user-visible stages in `visualStep`** from `@utils/visualStep`.

## Path aliases

`@api/*` `@config/*` `@fixtures/*` `@pages/*` `@testdata/*` `@utils/*` -> `src/*`.
Use them; relative imports across directories are the exception, not the rule.

## Config facts that trip people up

- `headless: false`, viewport 1920x1080, `chromium` only. CI wraps the run in `xvfb-run`.
- `trace: 'on'` and `video: 'on'` for every test, not just retries.
- Screenshots are opt-in via `ATTACH_SCREENSHOTS=true`, which gates both `visualStep` attachments and the config's `screenshot` setting.
- Retries: 2 on CI, 0 locally. Do not raise local retries to hide a flake.
- `fullyParallel: true`, so tests in one file run concurrently. Shared state flakes.
- Reporters: `html`, `list`, and `src/utils/CustomReporter.ts`, which writes `tta-report/` and `reports/runs/`.
- `.env` is gitignored. CI seeds it with `cp .env.example .env` before running; without that step the env util throws at collection and the whole suite fails.

## Commands

```bash
npx playwright test                         # full suite
npx playwright test src/tests/login/        # one directory
TTA_ENV=stage npx playwright test           # switch environment
TTA_ENV=api npx playwright test             # restful-booker base URL
npx tsc --noEmit -p tsconfig.json           # type check
open tta-report/index.html                  # newest custom report
```
