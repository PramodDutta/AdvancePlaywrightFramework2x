---
name: quality-gate
description: Run all four quality gates over a diff before a pull request is raised - ai-slop, ponytail, over-engineering and framework-patterns. Use when the user says "quality gate", "run the gates", "check before PR", "review this diff", or is about to open a PR in this repository. Every gate must report a verdict with evidence; a gate that cannot cite a command it ran has not run.
---

# Quality gate

Four questions, asked of every diff before it becomes a pull request. They are cheap, and they
catch the four ways AI-assisted changes usually go wrong in this repo.

| Gate | The question |
|:-----|:-------------|
| `gate-ai-slop` | Was this generated, skimmed, and shipped? |
| `gate-ponytail` | Does anything else in the run already record this? |
| `gate-over-engineering` | How many callers does this abstraction have? |
| `gate-framework-patterns` | Is this still part of *this* framework? |

## How to run

Load each gate skill and apply it to the diff, in this order. Order matters: slop is about whether
the change is real, ponytail and over-engineering are about whether it is too big, and
framework-patterns is about whether it belongs here at all.

```bash
git diff main...HEAD          # the change under review
git diff --stat main...HEAD   # its shape
npm run verify                # typecheck, lint, suite. Required evidence.
```

## The one rule that makes this worth doing

**A gate that cannot cite a command it ran has not run.** "Looks fine" is not a verdict. Each gate
reports `PASS` or `FAIL` with the grep, the test output, or the line numbers that justify it. A
gate may also report `PASS with notes` when a finding is real but out of scope for that gate.

## Report format

```
QUALITY GATE: <branch>

ai-slop              PASS   | evidence: npm run verify -> 0 errors, 32 passed
ponytail             FAIL   | src/x.ts:L12-30 delete: step wrapper, trace:'on' already records it
                            | net: -18 lines possible
over-engineering     PASS   | every new export has >=1 caller (grep shown below)
framework-patterns   FAIL   | src/tests/new.spec.ts imports @playwright/test, not @fixtures/test-base

VERDICT: blocked on 2 gates.
```

## Scope

These gates are about *how* the change is built. They do not replace correctness review, security
review, or the test suite itself. A change can pass all four and still be wrong; it just will not
be wrong in these four specific, avoidable ways.

Never weaken a gate to make a diff pass. If a gate is wrong about this repo, fix the gate in its
own commit and say so.
