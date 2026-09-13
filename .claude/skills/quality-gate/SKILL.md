---
name: quality-gate
description: >-
  The four quality gates (ai-slop, ponytail, over-engineering,
  framework-patterns) plus ESLint: run them, read the findings, fix in order of
  consequence, waive with a reason, add a rule, or teach the whole system. Use
  when an SDET says "run the gate", "why did the gate fail", "check this before I
  commit", "the PR gate is red", "add a rule for X", "the gate is too noisy",
  "review this for AI slop", "trim this spec", "is this over-engineered", "does
  this follow our patterns", or before handing over any generated test code.
license: MIT
metadata:
  author: TheTestingAcademy
  pack: quality
  version: 2.0.0
  adapted-for: AdvancePlaywrightFramework2x
---

# Quality Gate

Four gates run over `src/**/*.ts` and `playwright.config.ts`. Each is one
question asked of every file:

| Gate | The question | Rules |
|:--|:--|--:|
| `ai-slop` | Was this generated, skimmed, and shipped? | 14 |
| `ponytail` | Does anything else in the run already record this? | 9 |
| `over-engineering` | How many callers does this abstraction have? | 9 |
| `framework-patterns` | Is this still part of this framework? | 14 |

They exist because nothing else in the pipeline objects to a spec that asserts
nothing. `tsc` compiles it, ESLint has no rule for it, the suite reports it
green. A reviewer objects once and then gets tired.

## Two tools, one line between them

| Tool | Owns | Cost |
|:--|:--|:--|
| ESLint | known-bad API use: floating promises, `waitForTimeout`, `force: true`, `any`, `console` | ~2.2s per file, type-aware |
| `quality/gate.mjs` | judgement that needs the repo's shape | ~0.14s, whole repo indexed |

A hard wait is the most recognisable AI tell there is and it is deliberately
**not** in the ai-slop pack, because `playwright/no-wait-for-timeout` already
owns it. One owner per rule, or the report says everything twice and people
learn to skim past both.

## Run it

```bash
npm run gate                       # whole repo, commit profile
npm run gate -- --file <path>      # one file
npm run gate:changed               # what this branch adds, with CI budgets
npm run gate:audit                 # everything, fails on nothing
npm run gate:rules                 # every rule and its severity
npm run lint                       # ESLint
npm run verify                     # typecheck + lint + gate
node quality/selftest.mjs          # proves the rules still fire
npm run exercises                  # mark the twelve lessons
```

## Read the output

Every finding carries `why` (what breaks if ignored) and `fix` (what to do).
Severity decides consequence, not importance:

- **error** blocks a Claude edit, a commit, and the PR. 13 rules.
- **warn** is a judgement call, counted against a per-change budget on the PR.
- **info** is a prompt to look, never a blocker.

## Fix in order of consequence

1. **framework-patterns errors.** A spec that bypasses the fixture layer is not
   part of the suite any more. Contract breaks, not style.
2. **ai-slop errors.** `slop/test-without-assertion` means something is
   reporting green on a broken feature right now.
3. **Budget breaches.** The change carries more judgement-call debt than one
   review absorbs. Cut the cheapest half.
4. **Warnings in files you are already editing.** Do not sweep unrelated files;
   that turns a focused diff into a review problem.

## Waive only a genuine exception

```ts
// gate-allow ponytail/attaches-what-the-trace-holds -- the diff is computed here, the trace has neither side
await testInfo.attach('shape-diff', { body: diff });
```

Applies to the line it sits on or the one below; `gate-allow-file` covers the
file. **A waiver with no reason, or a reason under 10 characters, is itself an
error** (`gate/unexplained-waiver`) - a gate that can be switched off silently
stops being a gate. Waive when the rule's premise does not hold here, never to
go faster. "Silences the gate" is not a reason.

## Where to go next

Read only what the task needs.

| You are doing | Read |
|:--|:--|
| Understanding when and how each stage bites | `references/stages.md` |
| Looking up what a rule id means | `references/rules.md` |
| Changing the engine itself | `references/architecture.md` |
| A rule is noisy or wrong | `references/calibration.md` |
| Adding, tuning or retiring a rule | `references/authoring.md` |
| Teaching or learning the system end to end | `references/curriculum.md` |
| Reviewing generated code for slop | sibling skill `ai-slop-review` |
| Trimming a spec that is mostly ceremony | sibling skill `ponytail-review` |
| Judging whether an abstraction earns its place | sibling skill `over-engineering-review` |
| Onboarding code into the framework's shape | sibling skill `framework-pattern-review` |

## Verify

```bash
npm run gate -- --file <the file you changed>
node quality/selftest.mjs
npx tsc --noEmit -p tsconfig.json
```

A finding you fixed without re-running is a finding you hope you fixed.

## The baseline is pre-existing

7 error, 57 warn, 9 info from the gate and 13 error, 21 warn from ESLint, all in
code that predates the gates. The PR gate runs on **changed files only**, so a
change cannot add to it. Do not sweep unrelated files to drive the number down;
pay it off file by file as you touch them.
