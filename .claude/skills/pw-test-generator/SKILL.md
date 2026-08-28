---
name: pw-test-generator
description: >-
  Generates a Playwright (TypeScript) test spec from a described user flow or
  scenario. Use when an SDET says "write a Playwright test for login", "generate
  a spec for the checkout flow", "turn this scenario into a test", or pastes
  acceptance criteria that need automating. Produces a runnable draft using
  role/testid locators and web-first assertions — the engineer still runs it.
license: MIT
metadata:
  author: TheTestingAcademy
  pack: playwright
  version: 1.1.0-ttacart
  adapted-for: AdvancePlaywrightFramework2x
---

# PW Test Generator

Generates a spec that matches the specs already in `src/tests/`.

## Read first
`src/tests/e2e/e2e-checkout.spec.ts` for the house style.

## Contract
1. Import `test` and `expect` from `@fixtures/test-base`, **never** from `@playwright/test`. That is what gives the test its page objects.
2. Take page objects from the fixture parameters. Never `new SomePage(page)` in a spec.
3. Keep no locators in the spec. If a selector is missing, add it to the POM.
4. Wrap each user-visible stage in `visualStep(page, 'title', async () => {...})` from `@utils/visualStep`, which is `test.step` plus an optional screenshot when `ATTACH_SCREENSHOTS=true`.
5. Add a scoped logger, `const log = createLogger('<spec-name>')`, and give each spec its own scope so `logs/combined.log` stays readable.
6. Random data comes from `DataGenerator`. Config-driven data comes from `@config/env`.
7. Tag the describe title. The suite uses `@P0`, `@Regression`, `@Checkout`, `@FixtureExample`; the reporter surfaces them as filters.

## Output shape
```typescript
import { test, expect } from '@fixtures/test-base';
import { DataGenerator } from '@utils/DataGenerator';
import { credentials } from '@config/credentials';
import { createLogger } from '@utils/logger';
import { visualStep } from '@utils/visualStep';

const log = createLogger('cart.spec');

test.describe('@P0 @Regression @Cart Cart Feature', () => {
    test.beforeEach(async ({ loginPage }) => {
        await loginPage.open();
        await loginPage.loginAs(credentials.standardUser, credentials.password);
    });

    test('removes an item from the cart', async ({ page, loginWithSelectedItem, cartPage }) => {
        await visualStep(page, 'Open the cart', async () => {
            await cartPage.open();
            expect(await cartPage.rowCount()).toBe(1);
        });

        await visualStep(page, 'Remove the item', async () => {
            await cartPage.remove(loginWithSelectedItem.itemId);
            expect(await cartPage.rowCount()).toBe(0);
        });
    });
});
```

## Do not
Duplicate a describe + test title that already exists. `e2e-checkout.spec.ts` and
`e2e-checkout-env.spec.ts` differ by title on purpose.

## Verify
```bash
npx playwright test <the new spec>
```
