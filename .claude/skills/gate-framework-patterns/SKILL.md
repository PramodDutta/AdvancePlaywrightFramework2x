---
name: gate-framework-patterns
description: Quality gate asking "is this still part of this framework?" Enforces AdvancePlaywrightFramework2x conventions - fixture imports, page objects extending BasePage, path aliases, project scoping for src/tests vs apisTests vs aiTest, spec filenames needing a dot before spec, env access through @config/env, ajv not zod, and the AI layer's no-key and no-model-assertion rules. Use before raising a PR.
---

# Gate 4: framework-patterns

> **Is this still part of *this* framework?**

Code that works but ignores the repo's conventions is a slow leak: every such file makes the next
one easier to write the wrong way. These rules are specific to
**AdvancePlaywrightFramework2x**. Verify each against the current source before citing it.

## Specs

1. **Import from `@fixtures/test-base`, never `@playwright/test`.** API and AI specs may use
   `@fixtures/booker.fixture`. A spec importing `@playwright/test` directly has opted out of every
   page-object and state fixture.
2. **Never `new SomePage(page)` in a spec.** Take it from a fixture parameter.
3. **No locators in specs.** They live in `src/pages/*.ts` as `private readonly` fields.
4. **Spec filenames need a dot: `*.spec.ts`.** `05_crud_spec.ts` with an underscore is silently
   never collected. It does not fail; it does not exist. A numeric prefix is fine because it sits
   before the dot.

## Page objects

5. **Extend `BasePage`** with `super(page, 'ClassName')`, expose a `static readonly PATH`, and act
   through `this.el.*` (`UtilElementLocator`), never `locator.click()` directly. That wrapper is
   what logs every action.

## Project scoping (the trap that recurs)

6. **A new test directory needs its project decided at the same moment it is created.** Three
   projects exist:

| Directory | Project | baseURL | Browser |
|:----------|:--------|:--------|:--------|
| `src/tests/**` minus the two below | `chromium` | UI host from `TTA_ENV` | Yes |
| `src/tests/apisTests/**` | `api` | `API_BASE_URL` | No |
| `src/tests/aiTest/**` | `ai` | `API_BASE_URL`, 180s timeout | Lazy, only if a test asks for `page` |

   `chromium` sets `testIgnore: ['**/apisTests/**', '**/aiTest/**']`. Add a fourth directory
   without touching this and it either runs twice, runs against the wrong host, or is invisible.
   All three have happened.

## Config and environment

7. **Read env through `@config/env`** (`requireEnv` / `envOr` / `assertEnv`). Never
   `dotenv.config()` in a spec: Babel hoists imports above it, so modules reading `process.env` at
   load time see nothing.
8. **Credentials come from `@config/credentials`** or `@testdata/logintestdata.json`. Never
   hard-coded.
9. **Never commit a key.** `.env` is gitignored; new variables get a blank placeholder in
   `.env.example`, which CI copies to `.env`.

## Libraries

10. **`ajv` + `ajv-formats` for schemas, `jsonpath-plus` for JSON queries.** Zod is not a
    dependency and adding it needs an argument. Schemas live in `src/testdata/schemas/`, draft-07,
    because Ajv 8's default export only knows draft-07.
11. **Log with `createLogger('<scope>')`** from `@utils/logger`, one scope per file.
12. **Errors carry a `[ClassName]` prefix**, as in `[BookingApi] GET /booking failed: 404`.

## Path aliases

13. `@api/*` `@config/*` `@fixtures/*` `@pages/*` `@testdata/*` `@utils/*` map to `src/*`.
    Relative imports across directories are the exception.

## The AI layer

14. **No test may pass or fail on model output.** Assert on schema validity, HTTP status, or a
    verified locator. A test whose result rides on a sampled token is not a test.
15. **The suite must stay green with no API key.** That is CI's normal state. Agents return an
    unavailable result; nothing throws.
16. **A new agent is a prompt plus a schema through `createAgent`.** New transport code means the
    factory was bypassed.
17. **Self-healing suggests and verifies; it never rewrites a spec.**
18. **Demo specs that fail on purpose are gated behind `AI_DEMO`.**

## Docs

19. **No em dashes**, anywhere. Use a comma, colon, parentheses or `->`.
20. **Update all four sync points** when adding a module: the section, the level table, the
    project tree, and the env-keys table. Partial updates rot.

## CI and tooling

21. **In CI, call the local binary, never `npx`.** On a checkout where a tool is not a declared
    dependency, `npx <tool>` silently downloads an unrelated package of the same name from the
    registry and runs it. This gate's own first CI run did exactly that: `npx tsc` fetched
    `tsc@2.0.4` and failed with *"This is not the tsc command you are looking for"*. Use
    `./node_modules/.bin/tsc` or an npm script.
22. **Every tool the build needs is a declared dependency.** `typescript` was absent from
    `package.json` for most of this repo's life, arriving transitively, which is what made the
    above possible.

## Evidence required

```bash
npm run verify                              # typecheck, lint, suite
npx playwright test --project=<p> --list    # proves a new spec is actually collected
```

`--list` is the cheapest check that a new file exists as far as the runner is concerned. If it is
absent from the listing, nothing in the file body can be at fault yet.

## Verdict

`FAIL` on any spec importing `@playwright/test` directly, any locator in a spec, any new test
directory without a project decision, any hard-coded credential, any test asserting on model
output, or a suite that needs a key to pass.
