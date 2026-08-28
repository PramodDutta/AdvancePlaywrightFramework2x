---
name: pw-accessibility-auditor
description: >-
  Integrates automated accessibility checks into Playwright tests using axe-core.
  Use when an SDET says "add a11y checks", "run axe on this page", "audit
  accessibility", "check WCAG compliance", or "triage these accessibility
  violations". Produces @axe-core/playwright-based tests, severity triage, and
  WCAG mapping — a draft the engineer runs, knowing axe catches only ~30-40%.
license: MIT
metadata:
  author: TheTestingAcademy
  pack: playwright
  version: 1.1.0-ttacart
  adapted-for: AdvancePlaywrightFramework2x
---

# PW Accessibility Auditor

## State check: the dependency is missing
`@axe-core/playwright` is **not** in `package.json`. Install it and say that you did, rather than
emitting code that cannot run:

```bash
npm install -D @axe-core/playwright
```

## Where it goes
Specs in `src/tests/a11y/`, tagged `@A11y` so the reporter can filter them. Import `test` and
`expect` from `@fixtures/test-base` so the login and navigation fixtures are available; an audit
of a page you cannot reach is worthless.

## Workflow
1. Reach a stable state with a web-first assertion first. Scanning mid-render produces noise.
2. Scope with `.include()` / `.exclude()`, and tag to the standard you hold the product to (`wcag2a`, `wcag2aa`).
3. Gate on `critical` and `serious`. Log `moderate` and `minor` as debt; do not silently pass them.
4. Report the WCAG criterion from each violation's `tags` and `helpUrl` so the finding is actionable.
5. State the ceiling: axe catches roughly a third of real issues. Keyboard order, focus management, screen-reader output, and cognitive load still need a human. Automation is the floor.

## Output shape
```typescript
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@fixtures/test-base';
import { createLogger } from '@utils/logger';

const log = createLogger('a11y.inventory');

test('@A11y inventory page has no critical or serious violations', async ({ page, loginWithInventory }) => {
    const results = await new AxeBuilder({ page })
        .include('[data-test="inventory-container"]')
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

    const blocking = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    for (const v of results.violations) {
        log.info(`${v.impact}: ${v.id} (${v.tags.join(', ')}) -> ${v.helpUrl}`);
    }
    expect(blocking, blocking.map((v) => `${v.id}: ${v.help}`).join('\n')).toEqual([]);
});
```
Passing the violation list as the assertion message is deliberate: otherwise the failure reports
only a length mismatch and you have to re-run to learn what broke.
