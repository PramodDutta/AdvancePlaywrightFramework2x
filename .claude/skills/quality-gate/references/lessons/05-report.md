# Lesson 05 - The report and the CLI

Builds: `quality/engine/report.mjs, quality/gate.mjs`

Four stages consume the gate and each wants a different shape. All four call one
CLI, which is the only way the PR comment can never disagree with the terminal.

| Format | Reader | Shape |
|:--|:--|:--|
| `console` | you | grouped by file, coloured |
| `hook` | the coding agent | no colour, no prose, one line per finding plus the fix |
| `markdown` | the pull request | per-gate table, collapsible sections, budget breaches |
| `json` | your own tooling | everything |

`why` and `fix` print on the **first** occurrence of a rule and are omitted on
repeats. Eleven copies of the same two paragraphs is how a report teaches people
to skim past it.

The CLI scopes the report, never the scan:

```js
case 'staged':  return git('diff', '--cached', '--name-only', '--diff-filter=ACMR');
case 'changed': return git('diff', '--name-only', '--diff-filter=ACMR', mergeBase, 'HEAD');
case 'files':   return args.files.map((f) => relative(ROOT, resolve(f)));
default:        return null;   // whole repo
```

```js
// A change touching only files the gate does not cover is a pass, not a
// whole-repo scan. Without this, editing the README reports every
// pre-existing finding in src/.
if (scope !== null && scope.length === 0) return 0;
```

Exit 0 clean, 1 findings, 2 the gate itself broke. Keeping 1 and 2 distinct is
what lets the edit hook fail open on its own bug.

---

Exercise and checker: `exercises/05-report/TASK.md`, `node exercises/check.mjs 05`.
