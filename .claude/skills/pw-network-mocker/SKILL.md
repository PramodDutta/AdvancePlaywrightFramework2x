---
name: pw-network-mocker
description: >-
  Designs Playwright route interception and mocking. Use when an SDET says "mock
  this API", "stub the /orders response", "force a 500 error state", "make this
  test deterministic without the backend", or "intercept network calls". Produces
  page.route / fulfill handlers to stub responses, simulate errors, and remove
  backend flakiness — a draft the engineer wires in and runs.
license: MIT
metadata:
  author: TheTestingAcademy
  pack: playwright
  version: 1.1.0-ttacart
  adapted-for: AdvancePlaywrightFramework2x
---

# PW Network Mocker

## Read first
TTACart is a **static, localStorage-driven** demo app. Most of its behaviour has no backend call
to intercept. Before writing a route handler, confirm there is actually a request:

```bash
npx playwright test <spec> --debug     # Network tab
```

If the state you want lives in `localStorage`, use `page.addInitScript` to seed it instead of
`page.route`. Mocking a request that never happens produces a handler that silently never fires,
and a test that proves nothing.

## Where it goes
Route setup is reusable setup, so it belongs in a fixture in `src/fixtures/test-base.ts`, not
copy-pasted into specs. Register routes **before** the navigation that triggers them.

## Output shape
```typescript
// in src/fixtures/test-base.ts
mockedInventory: async ({ page }, use) => {
    await page.route('**/api/inventory', (route) =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ items: [] }),
        }),
    );
    await use(page);
    await page.unroute('**/api/inventory');
},
```

Error states use the same shape with `status: 500`. To let a call through while observing it, use
`route.continue()`; to kill it, `route.abort()`.

## Rules
- Glob patterns over regex unless you need a capture.
- One route per concern. A catch-all `**/*` handler will swallow the page's own assets.
- Unroute after `use` so the mock cannot leak into another test. `fullyParallel: true` makes leaks hard to trace.
- Never mock to hide a real failure. If the app genuinely 500s, that is a bug report, not a stub.
