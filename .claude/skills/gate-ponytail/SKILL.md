---
name: gate-ponytail
description: Quality gate asking "does anything else in the run already record this?" Finds machinery that duplicates what the tooling already provides - test.step wrappers and attachments duplicated by trace:'on', log lines restating their own step names, and describe blocks around a single test. Reports findings in ponytail format with a net line count. Use before raising a PR.
---

# Gate 2: ponytail

> **Does anything else in the run already record this?**

Named for the [ponytail](https://github.com/DietrichGebert/ponytail) review style: find what to
delete. Most of what a spec accumulates is machinery reporting something the tooling already
reports. This gate is scoped to over-engineering and duplication only. Correctness, security and
performance belong to a different pass.

## The repo facts this gate leans on

Check `playwright.config.ts` before citing these, but at time of writing:

- **`trace: 'on'` and `video: 'on'` for every test.** The trace already records every request,
  its timing, and its body. So an attachment or a `test.step` that exists only to surface that
  information is duplicate.
- **`CustomReporter` already prints** per-test status, step timings, the flaky diff, and the AI
  tabs. A `console.log` restating any of it is noise.
- **`createAgent` already validates** its output against a schema. Re-validating downstream is
  belt-and-braces on a belt.

## Findings format

One line each: `<file>:L<line>: <tag> <what>. <replacement>.`

| Tag | Means |
|:----|:------|
| `delete:` | Dead code, unused flexibility, speculative feature. Replacement: nothing. |
| `stdlib:` | Hand-rolled thing the standard library ships. Name the function. |
| `native:` | Code doing what the platform or framework already does. Name the feature. |
| `yagni:` | Abstraction with one implementation, config nobody sets, layer with one caller. |
| `shrink:` | Same logic, fewer lines. Show the shorter form. |

End with `net: -<N> lines possible.` If there is nothing to cut, say `Lean already. Ship.`

## Worked example from this repo

```
L1-18:  delete: 17-line header explaining the rewrite. The commit message holds it.
L23-31: delete: testInfo.attach of the response. trace:'on' already records it.
L26,36: native: test.step wrappers around single calls. The trace shows each request with timings.
L33-57: yagni: try/finally cleaning one row from a public demo API.
net: -38 lines possible.
```

## What this gate must never cut

- **Any assertion.** A runnable check is the minimum, not bloat.
- **Knowledge that cannot be re-derived from the code.** A comment recording that restful-booker
  answers a bad token with 403 and bad credentials with 200 took work to obtain. Keep it.
- **Test granularity.** How many tests a flow is split into is a decision about how failures
  report, not machinery. `describe.serial` giving each stage its own pass or fail is a choice.
  Flagging it as duplication is this gate exceeding its scope.
- **File header comments**, which are the convention on every util in `src/utils/`.

## Verdict

`FAIL` when the diff adds machinery that duplicates the trace, the reporter or the factory.
Report the net line count either way.
