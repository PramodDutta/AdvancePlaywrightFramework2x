---
name: pw-flaky-debugger
description: >-
  Diagnoses a flaky Playwright test and proposes web-first fixes. Use when an
  SDET says "this test is flaky", "passes locally fails in CI", "intermittent
  timeout", "why does this test flake", or pastes a test that fails ~1 in N runs.
  Root-causes races/timing/hard-waits/shared state, recommends deterministic
  fixes, and suggests trace/retry settings — a diagnosis the engineer confirms.
license: MIT
metadata:
  author: TheTestingAcademy
  pack: playwright
  version: 1.1.0-ttacart
  adapted-for: AdvancePlaywrightFramework2x
---

# PW Flaky Debugger

## This repo already tracks flakiness
The custom reporter writes one JSON per run to `reports/runs/run-<timestamp>.json`, keyed
`chromium > <file> > <describe> > <test>`. `src/ai/agents/flakyAnalyzer.ts` diffs the last two runs
and flags any test whose status flipped. **Start there, not with a guess.**

```bash
ls -t reports/runs/*.json | head -2      # the two runs the analyser compares
npx playwright test --repeat-each=5 <spec>   # reproduce before theorising
```

Note `retries` is 0 locally and 2 only on CI, so a local run will not mask a flake. That is
deliberate: do not "fix" a flake by raising local retries.

## Root causes, in the order they actually occur here
1. **A hard wait or a missing web-first assertion.** Look for `waitForTimeout`. The fix is `expect(locator).toBeVisible()` or an `expect.poll`, as `LoginPage.loginAs` does while it waits for either a URL change or the error box.
2. **Shared state between tests.** `fullyParallel: true`, so tests in one file run concurrently. Anything writing to `localStorage` or a shared account will flake. Push setup into a fixture in `src/fixtures/test-base.ts` so each test gets its own.
3. **Ignoring a known-flaky account.** `problem_user` in `src/testdata/logintestdata.json` clears `firstName` on first submit **by design**; `CheckoutStepOnePage` deliberately does not paper over it. A test using that account must handle it, not be "fixed".
4. **`networkidle`.** `UtilElementLocator.waitForPageLoad` already swallows its timeout on purpose. Do not add a bare `waitForLoadState('networkidle')` as a stabiliser.

## Deliverable
Name the cause, cite the file and line, give the fix, then prove it:
```bash
npx playwright test <spec> --repeat-each=10
```
A flake fix without a repeat run is a hypothesis.
