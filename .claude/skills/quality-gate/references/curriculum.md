# Curriculum

Twelve lessons that build the whole system from nothing, in the order it was
actually built. Read one when you are working on that part; read all twelve to
teach it.

Each lesson file names the file it builds, carries the code that matters, and
records the mistake made there the first time. The mistakes are the transferable
part: anyone can copy a finished rule pack, but knowing *why* the overlap metric
had to be directional is what lets you write the next one.

| # | Lesson | Builds | The thing it teaches |
|--:|:--|:--|:--|
| 01 | [ESLint, the easy half](lessons/01-eslint.md) | `eslint.config.mjs` | What has a correct answer, and one owner per rule |
| 02 | [The gap a linter cannot see](lessons/02-config.md) | `quality/gate.config.mjs` | Why a second tool is needed; profiles and budgets |
| 03 | [Reading source safely](lessons/03-lexer.md) | `quality/engine/source.mjs` | The masked copy. Everything else rests on it |
| 04 | [Your first rule](lessons/04-first-rule.md) | `rules/*.rules.mjs`, `run.mjs` | Detectors are code, rules are data |
| 05 | [The report and the CLI](lessons/05-report.md) | `report.mjs`, `gate.mjs` | Scope the report, not the scan |
| 06 | [The ai-slop pack](lessons/06-ai-slop.md) | `rules/ai-slop.rules.mjs` | Call sites and bodies; raw versus masked |
| 07 | [The ponytail gate](lessons/07-ponytail.md) | `rules/ponytail.rules.mjs` | Directional metrics; validating a taste rule |
| 08 | [Seeing across files](lessons/08-cross-file.md) | `repo-index.mjs` | Questions one file cannot answer |
| 09 | [Your non-negotiables](lessons/09-framework.md) | `framework-patterns.rules.mjs` | Turning a conventions doc into rules that bite |
| 10 | [Waivers and budgets](lessons/10-waivers.md) | `run.mjs` | An escape hatch that costs something |
| 11 | [Pre-generation hooks](lessons/11-hooks.md) | `.claude/hooks/` | Putting the gate inside the writing loop |
| 12 | [The PR gate, and shipping](lessons/12-shipping.md) | the workflow, `selftest.mjs` | Adoption without everyone hating you |

## The runnable half

`exercises/` in the repo root is the same twelve lessons as work.

```bash
npm run exercises          # mark every lesson
npm run exercises -- 07    # mark one
```

Three outcomes, and the middle one is not a failure:

```
pass  built and behaving
todo  the stub is untouched, the expected state before you start
FAIL  built and not behaving. The message says how.
```

A clean clone reports **8 passing, 4 to do, 0 failing**. Lessons 03, 04, 07 and
08 are stubs checked against the real engine and the real import graph; the
other eight check the artifact each lesson adds to the repo, so they pass here
because the reference implementation exists.

**Do not "fix" the four to-dos.** They are the exercises. If you are asked to
complete them, write the implementation in `exercises/<lesson>/` and leave the
reference implementation in `quality/` alone.

## The prose version

`docs/quality-gates-tutorial.html` is the same twelve lessons as a study guide
for humans, with diagrams and the real terminal output of this repo.
`docs/quality-gates-tutorial-v2.html` is the seven-step cut of it, for teaching
in about thirty minutes. Both open in a browser. These reference files are the
version for an agent: same content, no page furniture.
