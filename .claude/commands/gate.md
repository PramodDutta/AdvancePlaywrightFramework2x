---
description: Run the quality gates on the current change and fix what they find.
---

Run the quality gates over the work in progress, then act on the results.

Arguments: $ARGUMENTS (optional). A path runs the gate on that file only.
`staged` checks what is staged. `all` audits the whole repo. Default is the
current branch's change against `main`.

## 1. Run both halves

```bash
npm run gate -- --changed          # or --file $ARGUMENTS / --staged / --all
npm run lint
npx tsc --noEmit -p tsconfig.json
```

Read the `why` and `fix` lines. They are written per rule and they name the
actual helper or file to use.

## 2. Fix in order of consequence

1. **framework-patterns errors** - a spec outside the fixture layer is not part
   of the suite. Contract breaks, not style.
2. **ai-slop errors** - `slop/test-without-assertion` means something is
   reporting green on a broken feature right now.
3. **Budget breaches** - the change carries more judgement-call debt than one
   review absorbs. Cut the cheapest half.
4. **Warnings in files you are already editing.** Do not sweep unrelated files;
   that turns a focused diff into a review problem.

## 3. Waive only a genuine exception

```ts
// gate-allow <rule-id> -- <why this case is different>
```

A waiver with no reason is itself an error. "Silences the gate" is not a reason.
If you add one, say so in your reply with the reason you gave.

## 4. Report

State what was found, what you fixed, what you waived and why, and anything you
deliberately left. If the gate is clean, say which profile you ran it under, and
whether ESLint and `tsc` also passed. Do not report a gate as green that you
have not re-run.
