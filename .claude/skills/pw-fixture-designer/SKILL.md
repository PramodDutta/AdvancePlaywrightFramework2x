---
name: pw-fixture-designer
description: >-
  Designs custom Playwright test fixtures (auth/session, seeded data, page
  objects) with correct setup/teardown and scope. Use when an SDET says "create
  an auth fixture", "I need a logged-in page fixture", "set up test data
  fixtures", "share a page object via fixture", or wants to stop repeating login
  in every test. Produces a typed fixtures module — a draft to wire in and run.
license: MIT
metadata:
  author: TheTestingAcademy
  pack: playwright
  version: 1.1.0-ttacart
  adapted-for: AdvancePlaywrightFramework2x
---

# PW Fixture Designer

This repo already has a fixtures module. **Extend it, do not create a second one.**

## Read first
`src/fixtures/test-base.ts`. It exports the project's `test` and `expect`, and holds two kinds of
fixture, which is the distinction to preserve:

- **Page-object fixtures** construct a POM against `page` and navigate nothing.
- **State fixtures** perform reusable setup and are chained: `validLogin` -> `loginWithInventory` -> `loginWithSelectedItem`. `invalidLogin` stands alone.

Fixtures are lazy: Playwright builds only what a test asks for, plus its dependencies. That is the
whole reason the chain is worth keeping, so never collapse it into one big setup fixture.

## Workflow
1. Decide which kind you are adding. A POM wrapper is a page-object fixture; anything that logs in, seeds, or navigates is a state fixture.
2. Add the field to the exported `TestFixture` type. Give state fixtures a named exported type when they return more than a POM, as `SelectedItemState` does.
3. Add the `base.extend` entry. Depend on existing fixtures by destructuring them rather than repeating their steps.
4. Put anything after `await use(...)` that must be torn down. Nothing here needs teardown today; if yours does, that is where it goes.
5. Credentials come from `@config/credentials` or `@testdata/logintestdata.json`. Never hard-code them in a fixture.

## Output shape
```typescript
export type CheckoutReadyState = {
    cartPage: CartPage;
    itemId: string;
};

export type TestFixture = {
    // ...existing fields
    checkoutReady: CheckoutReadyState;
};

export const test = base.extend<TestFixture>({
    // Depends on loginWithSelectedItem, so login + inventory + add-to-cart all run first.
    checkoutReady: async ({ loginWithSelectedItem, cartPage }, use) => {
        await cartPage.open();
        await use({ cartPage, itemId: loginWithSelectedItem.itemId });
    },
});
```

## Verify
```bash
npx tsc --noEmit -p tsconfig.json
npx playwright test src/tests/e2e/e2e-checkout_new_fixture.spec.ts
```
The second command matters: it is the spec that exercises the existing fixture chain, so it is the
one that catches a regression in it.
