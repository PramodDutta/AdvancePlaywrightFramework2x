---
name: gate-over-engineering
description: Quality gate asking "how many callers does this abstraction have?" Blocks interfaces with one implementation, exports with no importer, new utilities duplicating src/utils, parameters no caller passes, and new dependencies that fetch or the installed Ajv already cover. Requires a caller count as evidence. Use before raising a PR.
---

# Gate 3: over-engineering

> **How many callers does this abstraction have?**

One question, answered with a number, produced by a command. Not an opinion about elegance.

## The counting rule

For every abstraction the diff adds, count the callers. **One caller is not an abstraction, it is
a detour.** Zero is dead code.

```bash
# callers of a symbol, outside its own file
S=MyNewThing
grep -rn "\b$S\b" src --include='*.ts' | grep -v "definition/file/path.ts"

# every new export in the diff, with its external caller count
git diff main...HEAD --name-only -- 'src/**/*.ts' | while read f; do
  grep -oE '^export (async )?(function|const|class|interface|type) [A-Za-z_]+' "$f" 2>/dev/null \
    | awk '{print $NF}' | while read s; do
        n=$(grep -rl "\b$s\b" src --include='*.ts' | grep -v "^$f$" | wc -l | tr -d ' ')
        printf "  %-28s %s external file(s)\n" "$s" "$n"
      done
done
```

## What blocks

| Pattern | Threshold |
|:--------|:----------|
| `interface` or abstract class | Fewer than 2 implementations, unless a seam the framework requires |
| Exported symbol | 0 external importers. Drop `export`, or delete it |
| New file in `src/utils/` | Something in `src/utils/` already does it |
| Function parameter or config option | No caller passes a non-default value |
| New runtime dependency | `fetch` plus the installed `ajv`, `jsonpath-plus`, `@faker-js/faker` already cover it |
| New Playwright project | The existing `chromium`, `api` or `ai` project fits |
| Wrapper around a single call | The call is already one line |

## Distinguish a seam from a detour

A one-caller abstraction is justified when something outside your control requires the shape:

- `hasApiKey()` has one caller, but `CustomReporter` requires that exact function.
- `analyzeFailure()` has one caller for the same reason.
- `createAgent()` has many callers, which is the argument for it existing at all.

State which of those applies. "It might be useful later" is not a seam. Later can add it, and
will know the real requirements by then.

## The types exception

A type used only inside its own file as a generic argument or parameter shape is not dead. It
does real work; it simply is not anyone's API. **Drop the `export`, keep the type.** Deleting it
is the wrong fix.

## Evidence required

Paste the caller count. A verdict without a number is an opinion.

## Verdict

`FAIL` on any new export with zero external callers, any interface with one implementation and no
named seam, or any new dependency without a stated reason the installed set cannot cover it.
