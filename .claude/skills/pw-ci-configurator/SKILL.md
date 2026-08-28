---
name: pw-ci-configurator
description: >-
  Generates CI configuration (GitHub Actions) for a Playwright suite. Use when an
  SDET says "set up Playwright in CI", "add a GitHub Actions workflow", "shard my
  tests across jobs", "upload traces and the HTML report", or "run browsers in a
  matrix". Produces a workflow with install, sharding, blob/HTML reporting, and
  artifacts — a draft the engineer commits and runs on their pipeline.
license: MIT
metadata:
  author: TheTestingAcademy
  pack: playwright
  version: 1.1.0-ttacart
  adapted-for: AdvancePlaywrightFramework2x
---

# PW CI Configurator

## A workflow already exists
`.github/workflows/playwright.yml` runs on push and PR to `main`/`master`. **Edit it; do not
generate a second one.** Four things about this repo constrain any change:

1. **Tests run headed.** `headless: false` in `playwright.config.ts`, so the run is wrapped in `xvfb-run --auto-servernum`. Any new job needs the same wrapper or it dies with no display.
2. **`.env` is gitignored**, so the runner has none. The `Seed .env for the test run` step (`cp .env.example .env`) must survive. Without it, `src/config/env.ts` throws at collection and the whole suite fails, not just the specs that need it.
3. **Retries are CI-only**, driven by `process.env.CI`. Do not hard-code retries in the workflow.
4. **The report is custom.** `src/utils/CustomReporter.ts` writes `tta-report/` and `reports/runs/`. The workflow currently uploads only `playwright-report/`, so the TTA report is being lost.

## Highest-value changes, in order
```yaml
      - name: Seed .env for the test run
        run: cp .env.example .env

      - name: Run Playwright tests
        run: xvfb-run --auto-servernum npx playwright test --shard=${{ matrix.shard }}/4

      - uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: tta-report-${{ matrix.shard }}
          path: |
            tta-report/
            reports/runs/
          retention-days: 30
```

Sharding needs `strategy: { fail-fast: false, matrix: { shard: [1, 2, 3, 4] } }`. With five tests
today, sharding is premature; add it when the suite justifies it and say so rather than shipping
four jobs for five tests.

## Secrets
When real credentials replace the demo values, drop `cp .env.example .env` for an `env:` block
backed by repository secrets. `STANDARD_USER` and `TTA_SECRET` are the keys `@config/credentials`
reads.

## Verify
```bash
mv .env .env.bak && npx playwright test   # must fail the way CI would
cp .env.example .env && npx playwright test
mv .env.bak .env
```
This reproduces the runner's state locally, which is the only way to test a CI change without
pushing.
