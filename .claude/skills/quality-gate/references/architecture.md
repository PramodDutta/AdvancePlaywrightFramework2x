# Engine architecture

Zero dependencies, on purpose: this runs on every agent edit, so its start-up
cost *is* the cost of the gate. An `npm install` in that path would be felt on
every keystroke-sized change.

```
quality/
  gate.mjs              the one entry point every stage calls
  gate.config.mjs       include/exclude, severity overrides, profiles
  selftest.mjs          proves the rules still fire
  __tests__/fixtures/   one slop-ridden spec, one clean one
  engine/
    source.mjs          lexer: masks strings and comments, keeps line offsets
    repo-index.mjs      import graph, aliases read from tsconfig.json
    detectors.mjs       the 12 primitives a rule is built from
    run.mjs             rule loading, scoping, waivers, budgets
    report.mjs          console / hook / markdown / json
rules/*.rules.mjs       the 46 rules, as data
```

## Three decisions carry the whole thing

**Detectors are code, rules are data.** Adding "no `page.pause()` in specs" is a
four-line data change, not an engine change. Write a detector only when a regex
genuinely cannot express the idea.

**The masked source.** `lex()` walks each file once and produces a copy where
comment bodies and string contents are blanked, newlines preserved so every
offset still maps to its line. Rules read that by default. It is the single
thing separating a usable gate from a noisy one: `waitForTimeout` in a doc
comment is documentation, in a string it is a log message, and only in code is
it a finding.

**The whole repo is always indexed, even for one file.** "Nothing imports this
export" and "this helper has one caller" are unanswerable from inside the file
that defines them. Scoping happens at report time, not scan time.

## The twelve detectors

| Detector | Answers |
|:--|:--|
| `regex` | Does this pattern appear in code / comments / strings / raw text? |
| `echoesNeighbour` | Does this comment or log say what the adjacent line already says? |
| `stepLogEcho` | Does a log inside `test.step` repeat the step name? |
| `callWrapsFewStatements` | Does this wrapper wrap too little to be worth it? |
| `blockMissing` | Does this block never do the thing it exists for? |
| `metric` | Is a budget blown: file lines, comment density, lines per assertion, pattern count? |
| `duplicateBlocks` | Is this test body the same shape as another, anywhere? |
| `unusedExport` | Does anything import this? |
| `singleConsumer` | Does this shared module have exactly one caller? |
| `delegatingWrapper` | Does this method just forward its own arguments? |
| `importShape` | Is this layer importing something it should not, or by the wrong specifier? |
| `inheritanceDepth` | How far below its root does this class sit? |
| `fileMissing` | Does this file never do something it is required to do? |

(Thirteen with `fileMissing`; the first twelve cover most rules.)

## Choosing the right copy of the source

`target` decides what a `regex` rule reads, and getting it wrong is the most
common authoring mistake:

| `target` | Reads | Use when |
|:--|:--|:--|
| `code` (default) | the masked copy | the pattern is a call or a declaration |
| `raw` | the original text | comment characters themselves matter (an empty `catch` vs a documented one) |
| `comments` | each comment's text | the prose is the finding |
| `strings` | each literal's value | a URL or credential inside a literal is the finding |

## Profiles

| Profile | Fails on | Budgets | Used by |
|:--|:--|:--|:--|
| `hook` | error | none | the Claude edit hook |
| `commit` | error | none | `npm run gate`, pre-commit |
| `ci` | error | per-gate warning caps | the PR gate |
| `audit` | nothing | none | whole-repo baseline |

Budgets are per change, not per repo: a PR may carry a handful of judgement-call
warnings, not thirty. A per-repo budget fails on day one and is deleted by day
three.

## Exit codes

| Code | Meaning |
|--:|:--|
| 0 | Clean, or nothing in scope |
| 1 | Findings the active profile fails on. The gate biting. |
| 2 | The gate itself broke. Callers must let the work through and say so. |

Keeping 1 and 2 distinct is what lets the edit hook fail open on its own bug
instead of blocking every edit in a session.
