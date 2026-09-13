# Rule catalogue

Generated from `rules/*.rules.mjs`. Regenerate rather than hand-edit:

```bash
npm run gate:rules        # the live list, always authoritative
```

## `ai-slop`

Was this generated, skimmed, and shipped? None of these are syntax errors and none fail a test, which is exactly why they need a gate.

| Rule | Severity | Catches |
|:--|:--|:--|
| `slop/test-without-assertion` | error | Test asserts nothing _(specs)_ |
| `slop/constant-assertion` | error | Assertion on a constant |
| `slop/weak-status-assertion` | warn | Status checked without a value |
| `slop/swallowed-error` | error | Empty catch block |
| `slop/not-implemented` | error | Placeholder left in the code |
| `slop/narrating-comment` | warn | Comment restates the line below it |
| `slop/section-banner-comment` | warn | Arrange / Act / Assert banner |
| `slop/decorative-divider` | warn | Decorative divider comment |
| `slop/tutorial-voice` | info | Comment written for a tutorial, not a codebase |
| `slop/jsdoc-restates-signature` | warn | JSDoc parameter repeats its own name |
| `slop/emoji-in-source` | warn | Emoji in source |
| `slop/comment-density` | warn | More comment than code _(spec)_ |
| `slop/duplicate-test-body` | warn | Test body duplicated in shape _(specs)_ |
| `slop/generic-test-title` | warn | Test title says nothing specific _(specs)_ |

## `ponytail`

Does anything else in the run already record this? Named after `booking-crud-end-to-end.ponytail.spec.ts`, which covers the same lifecycle as its 73-line twin in 33 lines. **Rests entirely on `trace: on` in playwright.config.ts.** Turn tracing off and turn this pack off with it.

| Rule | Severity | Catches |
|:--|:--|:--|
| `ponytail/step-wraps-single-call` | warn | test.step wraps a single statement _(specs)_ |
| `ponytail/log-restates-step-name` | warn | Log line repeats the step name _(specs)_ |
| `ponytail/log-restates-next-line` | warn | Log line narrates the call under it _(spec, page)_ |
| `ponytail/attaches-what-the-trace-holds` | warn | Attaches a payload the trace already carries _(specs)_ |
| `ponytail/explicit-screenshot-in-spec` | warn | Manual screenshot in a spec _(specs)_ |
| `ponytail/logs-what-it-asserts` | warn | Logs the status, then asserts it _(spec, page)_ |
| `ponytail/manual-timing` | info | Hand-rolled timing around a call _(specs)_ |
| `ponytail/describe-wraps-single-test` | info | describe block around a single test _(specs)_ |
| `ponytail/ceremony-ratio` | warn | Too much spec per assertion _(specs)_ |

## `over-engineering`

How many callers does this abstraction have? Most of these need the whole repo, which is why the engine indexes every import before any rule runs.

| Rule | Severity | Catches |
|:--|:--|:--|
| `overeng/unused-export` | warn | Export with no importer |
| `overeng/single-consumer-module` | info | Shared module with one caller |
| `overeng/pass-through-method` | warn | Method forwards its arguments unchanged _(page, api, util, fixture)_ |
| `overeng/deep-inheritance` | error | Page object more than one level below BasePage _(page)_ |
| `overeng/page-object-too-long` | warn | Page object too long _(page)_ |
| `overeng/spec-too-long` | warn | Spec file too long _(specs)_ |
| `overeng/module-does-too-much` | info | Utility module exports many things _(util)_ |
| `overeng/barrel-file` | info | Barrel file |
| `overeng/premature-generic` | info | Generic type parameter in a helper _(util, api)_ |

## `framework-patterns`

Is this still part of this framework? Every rule maps to a numbered item in `.github/copilot-instructions.md` via its `nn` field, so a finding traces to a sentence instead of an opinion.

| Rule | Severity | Catches |
|:--|:--|:--|
| `framework/spec-imports-playwright-test` | error | UI spec imports @playwright/test directly _(specs)_ |
| `framework/page-object-constructed-in-spec` | error | Page object constructed inside a spec _(specs)_ |
| `framework/locator-in-spec` | error | Locator defined in a spec _(specs)_ |
| `framework/page-object-not-extending-base` | error | Page object does not extend BasePage _(page)_ |
| `framework/page-object-missing-path` | warn | Page object has no static PATH _(page)_ |
| `framework/raw-locator-action-in-page` | warn | Page object acts on a locator directly _(page)_ |
| `framework/dotenv-in-spec` | error | dotenv.config() called outside @config/env |
| `framework/env-read-directly` | warn | process.env read outside @config/env _(spec, page, fixture)_ |
| `framework/inline-credential-literal` | error | Credential hard-coded |
| `framework/credential-argument-literal` | error | Login called with literal credentials _(spec)_ |
| `framework/zod-import` | error | zod imported |
| `framework/cross-layer-relative-import` | warn | Relative import across layers |
| `framework/hardcoded-url` | warn | URL literal in a spec or page object _(spec, page)_ |
| `framework/api-spec-without-schema` | info | API spec never validates a response shape |

## Engine rules

Not in any pack. Emitted by `quality/engine/run.mjs` itself.

| Rule | Severity | Catches |
|:--|:--|:--|
| `gate/unexplained-waiver` | error | A `gate-allow` with no reason, or a reason under 10 characters |
| `gate/budget-exceeded` | - | Reported as a breach, not a finding: a gate carried more warnings than its per-change budget |

## Totals

46 pack rules: **13 error**, 25 warn, 8 info.

The 13 errors are the ones that block an edit, a commit and the pull request. That ratio is deliberate: start lower rather than higher, because a gate that blocks on taste gets switched off.
