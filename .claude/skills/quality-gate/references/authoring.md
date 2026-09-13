# Adding, tuning, or retiring a rule

The sibling skill `quality-rule-author` covers this as a task. This file is the
reference it leans on.

## The rule shape

```js
{
    id: 'slop/no-page-pause',        // <gate-prefix>/<kebab-name>, unique
    title: 'page.pause() left in a spec',
    severity: 'error',               // error blocks | warn is budgeted | info is a prompt
    detect: 'regex',                 // a key in quality/engine/detectors.mjs
    specsOnly: true,                 // or layers: ['page','util'], include/exclude globs
    options: { pattern: /\bpage\.pause\s*\(/ },
    why: 'It halts the run and opens the inspector, so in CI the job hangs until the timeout kills it.',
    fix: 'Delete it. Use the trace viewer on the recorded run instead.',
}
```

`why` and `fix` are not documentation, they are the product. They print in the
terminal, in the feedback the agent reads when its edit is blocked, and in the
PR comment. A rule whose `why` says "this is bad practice" gets waived by the
first person who hits it. Name what breaks.

## Scoping options

| Field | Effect |
|:--|:--|
| `layers` | `['spec','page','fixture','api','util','config','testdata','ai']` |
| `specsOnly` | only `*.spec.ts` |
| `include` / `exclude` | glob arrays, repo-relative |
| `enabled: false` | keep the rule, stop running it |

## Steps

1. Add the rule to the right pack in `rules/`.
2. Add code that trips it to `quality/__tests__/fixtures/slop-spec.fixture.txt`.
3. Add its id to the `expect` array in `quality/selftest.mjs`.
4. Run `node quality/selftest.mjs`. The clean fixture must stay clean; if your
   rule fires on `clean-spec.fixture.txt`, the rule is wrong, not the fixture.
5. Run `npm run gate:audit` and read **every** hit. See `calibration.md`.

## Retiring

Set `enabled: false` with a comment saying why and when, rather than deleting.
A deleted rule comes back as a review comment six months later.

## Signals that a rule is wrong

- It fires many times in one file: it has found a class of code it does not
  understand.
- It is the most-waived rule after a few weeks: either its `why` is weak or the
  rule does not hold. Fix whichever it is.
- It fires on the file your team holds up as the good example.
