# Lesson 12 - The PR gate, and shipping

Builds: `.github/workflows/quality-gate.yml, quality/selftest.mjs`

Two workflow steps are easy to skip and both matter:

- `fetch-depth: 0` on checkout. Reporting on what the PR changed needs a merge
  base; the default shallow checkout has none.
- `node quality/selftest.mjs` before the gate runs. Prove the rules still fire
  before trusting their verdict.

The comment is found by a marker in its own body and updated in place. A gate
that posts a new comment on every push trains people to collapse the thread.

## A gate with no test of its own

...is exactly what these rules exist to catch. Two fixtures: one written the way
a model writes a spec when nobody is watching, one written the way the framework
documents. The first must produce a named list of findings, the second none.

```js
const CASES = [
    { fixture: 'slop-spec.fixture.txt', as: 'src/tests/demo/slop.spec.ts',
      expect: ['framework/spec-imports-playwright-test', 'slop/test-without-assertion', /* 18 total */] },
    { fixture: 'clean-spec.fixture.txt', as: 'src/tests/demo/clean.spec.ts', expect: [] },
];
```

The fixtures are `.txt` so neither `tsc` nor ESLint tries to compile
deliberately broken code. They are read with a pretend repo-relative path, and
that path is what decides their layer.

## Switching it on

See `references/calibration.md` for the method and the recorded baseline. The
short version: scope CI to changed files, read every finding of the first full
run, fix the rules rather than the code, and write the baseline down instead of
sweeping it.

---

Exercise and checker: `exercises/12-ship/TASK.md`, `node exercises/check.mjs 12`.
