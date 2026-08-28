---
name: pw-locator-fixer
description: >-
  Scans a Playwright spec or Page Object for brittle locators and rewrites them
  to resilient ones. Use when an SDET says "fix these locators", "my selectors
  are flaky", "replace XPath with getByRole", "make these locators resilient",
  or pastes code full of nth-child/CSS-class/text selectors. Produces a before/
  after rewrite map plus patched code — the engineer verifies each swap.
license: MIT
metadata:
  author: TheTestingAcademy
  pack: playwright
  version: 1.1.0-ttacart
  adapted-for: AdvancePlaywrightFramework2x
---

# PW Locator Fixer

## This app is data-test driven
TTACart exposes `data-test` on everything that matters, so the target here is
`[data-test="..."]`, not `getByRole`. Check `src/pages/*.ts` for the attribute that already covers
the element before inventing a new strategy.

## Priority order
1. `[data-test="..."]`, the app's own contract.
2. `getByRole(...)` with an accessible name, for anything genuinely lacking a test id.
3. `getByLabel` / `getByPlaceholder`, form controls only.
4. Everything else is a finding, not a solution.

Rewrite on sight: XPath, `nth-child`, chained CSS classes, index-based `.nth(n)` standing in for
identity, and text selectors that break on copy changes.

## Framework rules that outrank locator style
- A locator belongs in a Page Object, never in a spec. Moving a selector out of a spec into the POM counts as a fix even when the selector itself was fine.
- Locators are `private readonly` fields assigned in the constructor. Dynamic ones are private methods returning `Locator`, as in `InventoryPage.addBtn(id)`.
- Actions go through `this.el.*`. A locator swap that leaves a raw `.click()` behind is half a fix.

## Output shape
Report a table first, patch second:

| File | Before | After | Why |
|---|---|---|---|
| `src/pages/CartPage.ts:47` | `.cart_item:nth-child(2)` | `[data-test="inventory-item"]` | index broke when sort order changed |

## Verify
```bash
npx tsc --noEmit -p tsconfig.json
npx playwright test        # the swap must be proven, not assumed
```
A locator change that is not re-run is not a fix. Run the specs that touch the page you edited.
