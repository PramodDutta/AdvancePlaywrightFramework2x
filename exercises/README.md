# Quality gate exercises

Twelve lessons that build the system in `quality/` and `rules/` from nothing. The
written guide is `docs/quality-gates-tutorial.html`; this directory is the part
you run.

```bash
node exercises/check.mjs          # mark every lesson
node exercises/check.mjs 04       # mark one
```

## Three outcomes, and the middle one is not a failure

```
pass  you built it and it behaves
todo  the stub is untouched, which is the expected state before you start
FAIL  you built it and it does not behave. The message says how.
```

A fresh clone of this repository reports **8 passing, 4 to do**. The eight pass
because the reference implementation is already here; the four are stubs in this
directory waiting for you.

## The two kinds of lesson

**Lessons 03, 04, 07 and 08 check your code.** Each has a stub in its folder with
the contract in the header comment. They run against the real engine and real
repository data, so what you write works exactly as it would in `quality/`.

| Lesson | You write | Checked against |
|:--|:--|:--|
| 03 | `lex()` | a fixture built to break naive lexers |
| 04 | a rule, as data | the real `regex` detector |
| 07 | `coverage()` | a real comment from this repo that the naive version flags |
| 08 | `findUnusedExports()` | the real import graph of `src/` |

**The other eight check the artifact** the lesson adds to the repo: the ESLint
config, the profiles, the CLI formats, the rule packs, waivers, the hooks, the
workflow. They pass here out of the box. To feel them fail, work through the
guide in a copy with `quality/` and `rules/` deleted.

## Doing it properly

Start at `exercises/01-eslint/TASK.md` and work forward. Each `TASK.md` names the
file you are building, four or five exercises, and the one command that marks
them.

Two habits the guide keeps returning to, because they are what separate a gate
people keep from one they switch off:

- **Read every finding of your first full run.** A rule firing 67 times has found
  a class of code it does not understand, not 67 problems.
- **Prefer narrowing a rule's scope to adding an exclusion.** An exclusion says
  "not here". A scope says "here is where the premise holds".

## If you want to compare

The finished versions of all four stubs are in this repository already:
`quality/engine/source.mjs` (03), `rules/*.rules.mjs` (04),
`quality/engine/detectors.mjs` (07, the `coverage` function), and
`quality/engine/repo-index.mjs` with the `unusedExport` detector (08). Read them
after you have written your own, not before.
