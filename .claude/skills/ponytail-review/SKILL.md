---
name: ponytail-review
description: >-
  Cuts the machinery a Playwright run already records: test.step around a single
  call, testInfo.attach of a body the trace holds, log lines restating their own
  step names, manual screenshots and timing. Use when an SDET says "trim this
  spec", "ponytail review", "this spec is mostly ceremony", "73 lines for three
  assertions", or wants a generated spec cut down without losing coverage.
license: MIT
metadata:
  author: TheTestingAcademy
  pack: quality
  version: 1.0.0
  adapted-for: AdvancePlaywrightFramework2x
---

# Ponytail Review

One question, asked of every line: **does anything else in the run already
record this?**

Named after `src/tests/apisTests/03_restfulbooker_fixture_e2e_api/booking-crud-end-to-end.ponytail.spec.ts`,
which covers the same lifecycle as `booking-crud.e2e.spec.ts` in 33 lines instead
of 73. Both are kept on purpose so the diff is readable. Read them side by side
before cutting anything.

```bash
npm run gate -- --file <path>      # rules: ponytail/*
```

## The cut list, and why each cut was safe

| Cut | What already records it |
|:----|:------------------------|
| `test.step` around a single call | The trace lists every request with timings |
| `testInfo.attach` of a response body | The same trace already holds it |
| Ten `log.info` lines | Each restated its own step name, which is in the HTML report |
| `Date.now()` timing | The trace timeline has every duration |
| `page.screenshot()` on the happy path | `video: 'on'`, plus failure screenshots |
| `buildBooking` | `buildBookingFromGenerator` gives ordered, today-relative dates |
| An explicit `bookerToken` argument | Omitting it routes through `sendAuthed`, which re-auths on a 403 |

## The precondition

**All of this depends on `playwright.config.ts` setting `trace: 'on'` and
`video: 'on'` for every test, not just retries.** Turn tracing off and the
attachments stop being redundant, and this whole gate should be turned off with
it. If you are reviewing a repo where trace is `on-first-retry`, the cuts are
wrong.

## What never gets cut

- **Every `expect`.** All of them survived the rewrite. This gate removes
  reporting machinery, never checks.
- **Test granularity.** Three tests stayed three tests because
  `describe.serial` reports each stage as its own pass or fail. That is a
  decision about reporting, not machinery.
- **A log that carries a value the report cannot show.** A generated booking id,
  a chosen variant, a boundary value. `log.info({ bookingId })` after a call
  beats `log.info('Creating booking')` before it.

## Scope

The rules apply to specs and page objects only. The premise is that the trace
already recorded it, and the trace records page actions and HTTP traffic, not
what a helper did internally. `UtilElementLocator` exists to log every action;
telling it to stop logging inverts the rule into nonsense.

## Verify

```bash
npx playwright test <the spec you cut>
npx playwright show-report
```

Run it and open the report. If a cut removed something the report needed, you
will see it there, which is the whole argument for making the cut in the first
place.
