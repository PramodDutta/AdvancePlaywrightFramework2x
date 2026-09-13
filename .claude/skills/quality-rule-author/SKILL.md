---
name: quality-rule-author
description: >-
  Adds, tunes, or retires a rule in the quality gate's rule engine. Use when an
  SDET says "add a rule for X", "the gate is too noisy", "this rule has false
  positives", "we keep reviewing the same mistake", or wants a team convention
  enforced instead of repeated in review. Produces a rule in rules/*.rules.mjs
  plus a selftest expectation.
license: MIT
metadata:
  author: TheTestingAcademy
  pack: quality
  version: 1.0.0
  adapted-for: AdvancePlaywrightFramework2x
---

# Authoring a Rule

The split that keeps this maintainable: **detectors are code, rules are data.**
Adding "no `page.pause()` in specs" is a four-line data change in
`rules/*.rules.mjs`. Only write a detector when a regex genuinely cannot express
the idea.

## The rule shape

```js
{
    id: 'slop/no-page-pause',        // <gate-prefix>/<kebab-name>, must be unique
    title: 'page.pause() left in a spec',
    severity: 'error',               // error blocks | warn is budgeted | info is a prompt
    detect: 'regex',                 // a key in quality/engine/detectors.mjs
    specsOnly: true,                 // or layers: ['page', 'util'], include/exclude globs
    options: { pattern: /\bpage\.pause\s*\(/ },
    why: 'What breaks if this ships. One sentence, concrete.',
    fix: 'What to do instead. Name the actual helper or file.',
}
```

`why` and `fix` are not decoration. They print in the terminal, in the Claude
hook feedback, and in the PR comment. A rule whose `why` is "this is bad
practice" will be waived by the first person who hits it.

## The detectors

| Detector | Answers |
|---|---|
| `regex` | Does this pattern appear in code / comments / strings / raw text? |
| `echoesNeighbour` | Does this comment or log say what the adjacent line already says? |
| `stepLogEcho` | Does a log inside `test.step` repeat the step name? |
| `callWrapsFewStatements` | Does this wrapper wrap too little to be worth it? |
| `blockMissing` | Does this block never do the thing it exists for? |
| `metric` | Is a budget blown: file lines, comment density, lines per assertion, pattern count? |
| `duplicateBlocks` | Is this test body the same shape as another, anywhere? |
| `unusedExport` / `singleConsumer` | How many importers does this have? |
| `delegatingWrapper` | Does this method just forward its arguments? |
| `importShape` | Is this layer importing something it should not, or by the wrong specifier? |
| `inheritanceDepth` | How far below its root does this class sit? |
| `fileMissing` | Does this file never do something it is required to do? |

`target: 'code'` runs against a masked copy where comment bodies and string
contents are blanked. That is what stops `waitForTimeout` inside a doc comment
from being reported. Use `target: 'raw'` only when the literal text matters, and
`'comments'` / `'strings'` when the prose is the point.

## Tuning, which is most of the work

Write the rule, then run it against the whole repo and **read every hit**:

```bash
npm run gate:audit --silent -- --format json --out /tmp/gate.json
node -e "const j=require('/tmp/gate.json'); for (const f of j.findings.filter(x=>x.ruleId==='your/rule')) console.log(f.file+':'+f.line+' > '+f.excerpt)"
```

A rule that fires 67 times in one file has found a class of code it does not
understand, not 67 problems. Two real examples from this pack:

- `slop/emoji-in-source` hit `CustomReporter.ts` 67 times. That file renders a
  console and HTML report; the emoji are presentation. Excluded by name, with
  the reason in the rule.
- `ponytail/log-restates-next-line` hit `UtilElementLocator.ts`, whose entire job
  is logging every action. Fixed by scoping the rule to the layers the trace
  actually covers, which was the more honest fix than an exclusion.

Prefer narrowing scope over adding exclusions. An exclusion says "not here"; a
scope says "here is where the premise holds".

## Add the expectation to the selftest

Every new rule gets a line in the slop fixture and its id in the expectation
list:

```bash
$EDITOR quality/__tests__/fixtures/slop-spec.fixture.txt   # add code that should trip it
$EDITOR quality/selftest.mjs                               # add the rule id to CASES[0].expect
node quality/selftest.mjs
```

The clean fixture must stay clean. If your rule fires on
`clean-spec.fixture.txt`, the rule is wrong, not the fixture.

## Retiring a rule

Set `enabled: false` with a comment saying why and when, rather than deleting
it. A deleted rule comes back as a review comment six months later.

## Verify

```bash
node quality/selftest.mjs
npm run gate:audit
npm run lint
```
