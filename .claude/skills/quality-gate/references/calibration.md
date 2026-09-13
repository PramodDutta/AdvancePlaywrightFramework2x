# Calibrating a noisy rule

The first full run of these gates produced **174 findings**. Reading all of them
found three rules that were wrong, not a hundred and seventy-four problems. The
method matters more than the numbers, because every new rule you write will need
it.

## The method

1. Run the whole repo and dump JSON.

   ```bash
   npm run gate:audit -- --format json --out /tmp/gate.json
   node -e "const j=require('/tmp/gate.json');const c={};for(const f of j.findings)c[f.ruleId]=(c[f.ruleId]||0)+1;console.log(Object.entries(c).sort((a,b)=>b[1]-a[1]))"
   ```

2. **Read every hit of the top rule.** Not a sample. A rule firing 67 times in
   one file has found a class of code it does not understand.

3. Decide which of three things is true:
   - the code is wrong (rare on the first run)
   - the rule's **premise does not hold** in that layer, so narrow the scope
   - the rule is right but that one file is genuinely different, so exclude it
     by name with the reason in the rule

4. Re-run and compare. Repeat until every remaining finding is one you would
   raise in review yourself.

## Prefer scope over exclusion

An exclusion says "not here". A scope says "here is where the premise holds".
The second is a better description of reality and ages better.

## The four real cases

| Count | Symptom | Root cause | Fix |
|--:|:--|:--|:--|
| 67 | Emoji findings, all in `CustomReporter.ts` | That file renders a console and HTML report; the emoji are presentation, not narration | Exclude by name, reason in the rule |
| 14 | Every exported interface reported as unused surface | An exported interface is often the published return type of an exported function | Restrict to value kinds. Including types detects TypeScript, not dead code |
| 11 | Explanatory comments flagged as narration, including the best comment in the repo | The overlap metric divided by the smaller word set, so a short code line inside a long comment scored 1.0 | Make the comment the denominator |
| 5 | `UtilElementLocator` told to stop logging | The ponytail premise is "the trace already has it", and the trace does not cover helper internals | Scope the rule to specs and page objects |

That took it to **73**, read individually and real.

Note that only the first is an exclusion. The other three were rules that were
wrong about where they applied or about what they measured.

## The acid test

A taste rule is only defensible if it agrees with a judgement your team already
wrote down. Here that is the pair of specs the README keeps side by side:

```bash
node quality/gate.mjs --file src/tests/apisTests/03_restfulbooker_fixture_e2e_api/booking-crud-end-to-end.ponytail.spec.ts --profile audit
# no findings

node quality/gate.mjs --file src/tests/apisTests/03_restfulbooker_fixture_e2e_api/booking-crud.e2e.spec.ts --profile audit
# exactly the cuts the README's own table documents
```

Find the equivalent pair in your repo before trusting a new taste rule.

## Adoption

A gate switched on across a suite that predates it fails immediately, and the
first response is always to weaken the gate. Introduce it on changed files only
and write the baseline down:

| Check | Errors | Warnings |
|:--|--:|--:|
| `gate --all` | 7 | 57 |
| `eslint src` | 13 | 21 |
| `tsc --noEmit` | 0 | 0 |

So `npm run lint` and `npm run gate` do not pass on the whole repo, and that is
the honest state rather than a bug. A sweep that reformats forty files to get
one number to zero is a review problem, not an improvement.
