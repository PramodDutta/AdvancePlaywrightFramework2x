---
name: framework-pattern-review
description: >-
  Enforces this framework's non-negotiables: specs import from @fixtures, never
  construct page objects, never hold locators, page objects extend BasePage and
  act through this.el, env comes from @config/env, credentials never inline,
  path aliases over relative imports. Use when an SDET says "does this follow our
  patterns", "review this page object", "why is the framework gate failing", or
  onboards generated code into the suite.
license: MIT
metadata:
  author: TheTestingAcademy
  pack: quality
  version: 1.0.0
  adapted-for: AdvancePlaywrightFramework2x
---

# Framework Pattern Review

Every rule in this gate maps to a numbered item in
`.github/copilot-instructions.md`. That file already said what the shape of this
framework is; it had no way to notice when something ignored it. The `nn` field
on each rule in `rules/framework-patterns.rules.mjs` is the item it enforces, so
a finding traces back to a sentence instead of to an opinion.

```bash
npm run gate -- --file <path>      # rules: framework/*
```

## The errors, and what actually breaks

| Rule | NN | What breaks |
|---|:--:|---|
| `framework/spec-imports-playwright-test` | 1 | The spec gets none of the page-object or state fixtures. It has silently left the framework. |
| `framework/page-object-constructed-in-spec` | 2 | Built against a different lifecycle than every other page; setup gets repeated by hand. |
| `framework/locator-in-spec` | 3 | Invisible to every other spec. You fix the page object and this still fails. |
| `framework/page-object-not-extending-base` | 4 | No `this.el`, so no action logging; `goto` no longer respects baseURL. |
| `framework/dotenv-in-spec` | 5 | Imports hoist above the call, so modules reading `process.env` at load time see nothing. Fails later as a missing credential. |
| `framework/inline-credential-literal` | 6 | A credential in the source is a credential in the git history. |
| `framework/zod-import` | 7 | Not a dependency. Does not install in CI. |
| `overeng/deep-inheritance` | 4 | Another file to open before you know what a locator resolves to. |

## Deliberate exclusions

- **API specs under `src/tests/apisTests/`** may import `@playwright/test`
  directly. Levels 01 and 02 exist to teach the raw `request` fixture; requiring
  a UI fixture there would miss their point.
- **`01_restfulbooker_raw/`** is exempt from the schema-validation prompt for the
  same reason.

If you add a rule, state its exclusions in the rule itself, not in a reviewer's
head.

## The shape to write

```ts
// src/tests/<feature>/<thing>.spec.ts
import { test, expect } from '@fixtures/test-base';

test('rejects a locked-out account with an error banner', async ({ invalidLogin }) => {
    await expect(invalidLogin.loginPage.errorMessage()).toContainText('locked out');
});
```

```ts
// src/pages/ThingPage.ts
export class ThingPage extends BasePage {
    static readonly PATH = '/playwright/ttacart/thing.html';
    private readonly submit: Locator;

    constructor(page: Page) {
        super(page, 'ThingPage');
        this.submit = page.locator('[data-test="submit"]');
    }

    async submitForm(): Promise<void> {
        await this.el.click(this.submit);   // this.el, never this.submit.click()
    }
}
```

New page object means a new fixture in `src/fixtures/test-base.ts`. A page object
with no fixture cannot be reached from a spec without breaking rule 2.

## Verify

```bash
npx tsc --noEmit -p tsconfig.json
npm run gate -- --file <the spec> --file <the page object>
npx playwright test <the spec>
```
