---
name: pw-visual-regression
description: >-
  Sets up Playwright visual/screenshot regression testing. Use when an SDET says
  "add visual regression", "snapshot this component", "set up toHaveScreenshot",
  "mask the dynamic parts of this page", or "manage baselines". Produces snapshot
  tests with masking, thresholds, and a baseline strategy — a draft the engineer
  runs to generate and review the first baselines.
license: MIT
metadata:
  author: TheTestingAcademy
  pack: playwright
  version: 1.1.0-ttacart
  adapted-for: AdvancePlaywrightFramework2x
---

# PW Visual Regression

## State check before you start
This repo has **no snapshot testing today**: no `toHaveScreenshot` call, no `*-snapshots/`
directory, and `snapshotPathTemplate` is unset in `playwright.config.ts`. You are introducing it,
so say so, and get the baseline strategy agreed before generating files.

Two settings here directly affect snapshots and must be dealt with first:

| Setting | Value | Consequence |
|---|---|---|
| `headless` | `false` | Headed and headless render differently. CI runs headed under `xvfb-run`, so baselines must be generated the same way or every comparison fails. |
| `viewport` | 1920x1080 | Baselines are locked to this size. Changing it invalidates all of them. |
| projects | `chromium` only | One platform of baselines. Adding a browser means regenerating. |

## Workflow
1. Snapshot a **component**, not a full page, unless the whole page is the contract. `expect(locator).toHaveScreenshot()` beats `expect(page)`.
2. Mask anything non-deterministic: dates, prices, avatars, the cart badge count. `mask: [page.locator('[data-test="shopping-cart-badge"]')]`.
3. Set `maxDiffPixelRatio` rather than chasing a zero-diff that anti-aliasing will never give you.
4. Generate baselines with `--update-snapshots`, then **open every generated PNG before committing**. An unreviewed baseline locks in whatever bug was on screen.
5. Commit baselines. Note `.gitignore` currently excludes `/test-results/` and `/playwright-report/` but not a snapshots directory, so the default location is safe.

## Output shape
```typescript
import { test, expect } from '@fixtures/test-base';

test('@Visual inventory grid matches the baseline', async ({ loginWithInventory, page }) => {
    await expect(page.locator('[data-test="inventory-container"]')).toHaveScreenshot('inventory-grid.png', {
        mask: [page.locator('[data-test="shopping-cart-badge"]')],
        maxDiffPixelRatio: 0.01,
        animations: 'disabled',
    });
});
```

## Verify
```bash
npx playwright test --grep @Visual --update-snapshots   # first run, then REVIEW the PNGs
npx playwright test --grep @Visual                      # must pass twice in a row
```
Passing once proves nothing. A baseline that is not stable across two runs is not a baseline.
