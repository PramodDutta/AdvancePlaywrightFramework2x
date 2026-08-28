---
name: pw-page-object-builder
description: >-
  Builds a Playwright Page Object Model class from a page or URL. Use when an
  SDET says "make a page object for the login page", "build a POM for the
  dashboard", "extract locators into a page class", or wants to refactor inline
  selectors into a reusable class. Produces locators-as-methods (getByTestId/
  getByRole), action methods, and a static PATH — a draft to review.
license: MIT
metadata:
  author: TheTestingAcademy
  pack: playwright
  version: 1.1.0-ttacart
  adapted-for: AdvancePlaywrightFramework2x
---

# PW Page Object Builder

Builds a Page Object for **this** framework. Every POM here extends `BasePage`; none of them
build locators in the base class.

## Read first
`src/pages/LoginPage.ts` is the reference implementation. `src/pages/BasePage.ts` is the contract.
Match them rather than a generic Playwright POM.

## Contract
1. `extends BasePage`, constructor calls `super(page, '<ClassName>')` so the logger is scoped.
2. `static readonly PATH` for the route. Navigate with `this.goto(PATH)`, never `page.goto` with an absolute URL, so `baseURL` from `playwright.config.ts` still applies.
3. Locators are `private readonly` fields assigned in the constructor. This app is `data-test` driven, so prefer `[data-test="..."]`. Expose behaviour, never the Locator.
4. All interaction goes through `this.el.*` (`UtilElementLocator`), never `locator.click()` directly. That wrapper is what puts every action in the log.
5. Dynamic locators become private helper methods, e.g. `addBtn(id)`, not public fields.
6. Provide `assertLoaded()` using web-first assertions.

## Output shape
```typescript
import { expect, Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class InventoryPage extends BasePage {
    static readonly PATH = '/playwright/ttacart/inventory.html';

    private readonly title: Locator;
    private readonly cartLink: Locator;

    constructor(page: Page) {
        super(page, 'InventoryPage');
        this.title = page.locator('[data-test="title"]');
        this.cartLink = page.locator('[data-test="shopping-cart-link"]');
    }

    async open(): Promise<void> {
        await this.goto(InventoryPage.PATH);
        await this.assertLoaded();
    }

    async assertLoaded(): Promise<void> {
        await expect(this.title).toHaveText('Products');
    }

    private addBtn(id: string): Locator {
        return this.page.locator(`[data-test="add-to-cart-${id}"]`);
    }

    async addToCart(id: string): Promise<void> {
        await this.el.click(this.addBtn(id));
    }
}
```

## Then wire it up
A new POM is only half done. Add a fixture for it in `src/fixtures/test-base.ts`: a field on the
`TestFixture` type and a `base.extend` entry that constructs it against `page`. Specs must get
page objects from the fixture, never with `new`.

## Verify
```bash
npx tsc --noEmit -p tsconfig.json
```
