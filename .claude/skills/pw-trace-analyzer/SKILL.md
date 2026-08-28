---
name: pw-trace-analyzer
description: >-
  Analyzes a Playwright trace.zip or test failure to pinpoint the root cause. Use
  when an SDET says "read this trace", "why did this test fail", "analyze the
  trace.zip", "my CI run failed — what broke", or pastes an error + trace. Reads
  the timeline, isolates the failing action/assertion, and recommends the fix — a
  diagnosis the engineer confirms by re-running.
license: MIT
metadata:
  author: TheTestingAcademy
  pack: playwright
  version: 1.1.0-ttacart
  adapted-for: AdvancePlaywrightFramework2x
---

# PW Trace Analyzer

## Where the evidence lives here
`playwright.config.ts` sets `trace: 'on'` and `video: 'on'` for **every** test, not just retries,
so a trace always exists.

| Artefact | Path |
|---|---|
| Traces | `tta-report/traces/trace_<n>.zip` and `test-results/**/trace.zip` |
| Video | `tta-report/videos/video_<n>.webm` |
| Step screenshots | `tta-report/screenshots/` (only when `ATTACH_SCREENSHOTS=true`) |
| Structured run data | `reports/runs/run-<timestamp>.json` |
| Readable report | `tta-report/index.html`, which redirects to the newest run |

```bash
npx playwright show-trace tta-report/traces/trace_1.zip
open tta-report/index.html          # step timeline, console output, video timestamps
```

## Workflow
1. Open the run JSON first. It gives the failing test, its steps, and its error without launching a viewer.
2. Find the last **passing** action before the failure. The bug is usually there, not at the line that threw.
3. Check the DOM snapshot at the failing action: was the element absent, detached, covered, or simply not yet rendered?
4. Map the failure back to a layer before proposing a fix:
   - locator wrong -> `src/pages/*.ts`
   - timing -> the action wrapper in `src/utils/UtilElementLocator.ts` (`DEFAULT_ACTION_TIMEOUT_MS` is 15s)
   - setup wrong -> `src/fixtures/test-base.ts`
   - config/env -> `@config/env`, or `.env` missing entirely, which fails at collection
5. Cross-read `logs/combined.log`. Every `el.*` action logs with its scope, so the log names the page object that acted last.

## Deliverable
The failing step, the root cause with file and line, the fix, and the command that confirms it.
