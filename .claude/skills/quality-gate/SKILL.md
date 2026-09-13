---
name: quality-gate
description: >-
  Runs and interprets the four quality gates (ai-slop, ponytail,
  over-engineering, framework-patterns) plus ESLint. Use when an SDET says "run
  the gate", "why did the gate fail", "check this file before I commit", "the PR
  gate is red", or before handing over generated code. Produces a prioritised
  fix list and, where a finding is genuinely wrong, a waiver with a reason.
license: MIT
metadata:
  author: TheTestingAcademy
  pack: quality
  version: 1.0.0
  adapted-for: AdvancePlaywrightFramework2x
---

# Quality Gate

Two tools, one line between them. Do not duplicate work across them.

| Tool | Owns | Cost |
|---|---|---|
| ESLint | known-bad API use: floating promises, `waitForTimeout`, `force: true`, `any`, `console` | ~2.2s per file (type-aware) |
| `quality/gate.mjs` | judgement that needs the repo's shape: slop, ponytail, over-engineering, framework patterns | ~0.14s, whole repo indexed |

A hard wait is the most recognisable AI tell there is and it is **not** in the
ai-slop pack, because `playwright/no-wait-for-timeout` already owns it. One
owner per rule.

## Run it

```bash
npm run gate                       # whole repo, commit profile
npm run gate -- --file src/pages/CartPage.ts
npm run gate:changed               # what this branch adds, ci profile and budgets
npm run gate:audit                 # everything, fails on nothing
npm run gate:rules                 # every rule and its severity
npm run lint                       # ESLint
npm run verify                     # typecheck + lint + gate
```

## Read the output

Every finding carries `why` (what breaks if you ignore it) and `fix` (what to do).
Severity decides consequence, not importance:

- **error** blocks a Claude edit, a commit, and the PR. Thirteen rules.
- **warn** is a judgement call. Counted against a per-gate budget on the PR, so a
  handful is fine and a pile is not.
- **info** is a prompt to look, never a blocker.

## Fix in this order

1. **framework-patterns errors.** A spec that bypasses the fixture layer is not
   part of the suite any more. These are contract breaks, not style.
2. **ai-slop errors.** `slop/test-without-assertion` means a test is reporting
   green on a broken feature right now.
3. **Budget breaches.** The gate is telling you the change carries more
   judgement-call debt than one review can absorb. Cut the cheapest half.
4. **Everything else**, if you are already in the file.

## Waivers

```ts
// gate-allow ponytail/attaches-what-the-trace-holds -- the diff is computed here, the trace has neither side
await testInfo.attach('shape-diff', { body: diff });
```

Applies to the line it sits on or the one below. `gate-allow-file` covers the
whole file. **A waiver with no reason, or a reason under 10 characters, is
itself an error** (`gate/unexplained-waiver`) - a gate that can be switched off
silently stops being a gate.

Waive when the rule's premise does not hold here. Do not waive to go faster; the
reason is read by the next person, and "silences the gate" is not one.

## Verify

```bash
npm run gate -- --file <the file you changed>
node quality/selftest.mjs     # the rules still fire on the fixtures
npx tsc --noEmit -p tsconfig.json
```

A finding you fixed without re-running is a finding you hope you fixed.
