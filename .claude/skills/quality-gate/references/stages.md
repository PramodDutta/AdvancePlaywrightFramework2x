# The five stages, in order

The same rules run at every stage. Only the consequence of a non-zero exit
changes, which is what profiles in `quality/gate.config.mjs` express.

| # | Stage | Runs | Consequence | Cost |
|--:|:--|:--|:--|:--|
| 1 | Prompt submitted | `.claude/hooks/inject-rules.mjs` | The 13 blocking rules enter context | ~40ms |
| 2 | Before a Write | `.claude/hooks/guard-file-placement.mjs` | Denies a file in the wrong layer | ~30ms |
| 3 | After Write/Edit | `.claude/hooks/gate-on-edit.mjs` | `error` blocks the edit, `warn` prints | ~140ms |
| 4 | Before `git commit` | `.claude/hooks/gate-on-commit.mjs` and `.githooks/pre-commit` | Gate + ESLint on staged files | ~3s |
| 5 | Pull request | `.github/workflows/quality-gate.yml` | Changed files, budgets, sticky comment | ~1min |

All five call `node quality/gate.mjs`. That is why the PR comment can never
disagree with the terminal.

## 1. Prompt submitted

The cheapest gate is the one that runs before generation. Telling the model the
rules up front costs a few hundred tokens; letting it generate a spec, blocking
the edit, and having it rewrite the file costs a whole turn.

Fires only when the prompt has both a verb (`write`, `generate`, `refactor`)
and a code noun (`spec`, `page object`, `fixture`, `locator`). Injects only the
`error` rules: injecting all 46 would bury the 13 that actually block.

## 2. Before a Write

Handles the one thing that cannot be fixed by editing the file afterwards: its
location. `playwright.config.ts` scopes projects by directory, so a spec written
next to a page object runs under the wrong project, against the wrong baseURL,
or is never collected.

Kept to rules with no judgement in them, and only for files that do not yet
exist. An existing file in an odd place is someone's decision, already made.
Taste belongs in the gate, where it can be waived with a reason; this returns a
hard deny.

## 3. After Write/Edit

Scopes the report to the single file just written. Blocks on `error` by exiting
2, which hands stderr back to the model as feedback to act on in the same turn.
Warnings print without blocking: worth showing while the code is fresh, not
worth stopping the work over.

**ESLint is deliberately absent here.** A type-aware lint of one file costs
about 2.2 seconds against the engine's 0.14, and buys nothing the engine has not
already caught. Measure both before changing this.

**A broken gate must not become a broken edit loop.** If the CLI exits 2
(engine crash, not findings), the hook writes the error and exits 0.

## 4. Before a commit

A commit happens a hundred times less often than an edit, so the two seconds a
type-aware lint costs are affordable here. Runs gate + ESLint over staged files.

`--no-verify` is honoured. Someone with a reason to bypass a gate will find a
way regardless, and a bypass visible in the command is better than one that is
not. `.githooks/pre-commit` covers commits that do not come from an agent;
enable it once per clone with `npm run gate:install-hooks`.

## 5. Pull request

Two steps are easy to skip and both matter:

- `fetch-depth: 0` on checkout. Reporting on what the PR changed needs a merge
  base, and the default shallow checkout has none.
- `node quality/selftest.mjs` before the gate runs. Prove the rules still fire
  before trusting their verdict.

Scoped to changed files. A gate switched on across a suite that predates it
fails immediately, and the first response is always to weaken the gate.

One comment, found by the `<!-- quality-gate-report -->` marker in its own body
and updated in place. A gate that posts a new comment on every push trains
people to collapse the thread.
