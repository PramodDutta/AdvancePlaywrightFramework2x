## What this changes

<!-- One paragraph. Why, not a file list. -->

## Quality gates

Four gates, every PR. See [`docs/quality-gates.md`](../docs/quality-gates.md).
**A gate that cannot cite a command it ran has not run.** Replace each placeholder with real output.

- [ ] **ai-slop** - no invented APIs, no assertion that cannot fail, no `any` used to mute the compiler, no documented claim that was not run.
  - Evidence: <!-- paste `npm run verify` output -->
- [ ] **ponytail** - nothing added that the trace, the reporter or the agent factory already records.
  - Evidence: <!-- `net: -N lines possible`, or `Lean already. Ship.` -->
- [ ] **over-engineering** - every new export has at least one external caller, or a named seam.
  - Evidence: <!-- paste the caller count -->
- [ ] **framework-patterns** - fixture imports, no locators in specs, `*.spec.ts` with a dot, a project decided for any new test directory, no committed key.
  - Evidence: <!-- `npx playwright test --project=<p> --list` for any new spec -->

## Verification

```
npm run verify
<!-- paste: typecheck result, lint counts, test counts -->
```

## Anything deliberately not done

<!-- Scope you cut, a gate finding you are accepting, a follow-up. Say it here, not in a later surprise. -->
