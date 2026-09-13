---
name: over-engineering-review
description: >-
  Finds abstraction bought before it was needed: helpers with one caller,
  exports with none, methods that forward their arguments unchanged, deep page
  object hierarchies, barrel files, premature generics. Use when an SDET says
  "is this over-engineered", "do we need this helper", "simplify this", or
  reviews a PR that added a layer.
license: MIT
metadata:
  author: TheTestingAcademy
  pack: quality
  version: 1.0.0
  adapted-for: AdvancePlaywrightFramework2x
---

# Over-Engineering Review

The signal is almost always countable: **how many callers does this have?**

```bash
npm run gate -- --file <path>      # rules: overeng/*
npm run gate:audit                 # cross-file rules need the whole repo
```

Most of these rules cannot be answered from inside one file, which is why the
engine indexes every import before any rule runs (`quality/engine/repo-index.mjs`).
Running the gate on a single file still scans the repo; only the report is scoped.

## What counts as over-engineering here

| Finding | The count behind it |
|---|---|
| `overeng/unused-export` | Zero importers. Public surface nobody asked for. |
| `overeng/single-consumer-module` | One importer, sitting in a shared directory. |
| `overeng/pass-through-method` | A method whose body forwards its own arguments unchanged. |
| `overeng/deep-inheritance` | A page object more than one level below `BasePage`. |
| `overeng/barrel-file` | A re-export layer, when aliases already give every module a short path. |

Exported **types** are exempt from `unused-export`: an interface is often the
published return type of an exported function, so a consumer needs it importable
even when nothing imports it by name today. Values have no such excuse.

## What is not over-engineering

Two things in this repo look like indirection and are not. Do not "simplify"
them, and do not let a review talk you into it:

- **`UtilElementLocator`.** A wrapper whose job is to log every action with its
  page scope. That is a feature with a consumer on every line.
- **`BasePage`.** One base class, one level deep, supplying `page`, `el`, `log`,
  and `goto`. The framework's documented shape.

Over-engineering is an abstraction with no consumer. It is not an abstraction
you personally would not have written.

## How to act on a finding

1. **Count the callers yourself** before deleting anything. `grep -rn "name" src/`.
2. **One caller** -> move it next to that caller. Promote it back to `@utils`
   the day a second one appears.
3. **No callers** -> delete it. If it is scaffolding for work in flight, say so
   in a waiver with the reason and the date.
4. **Pass-through method** -> inline it, unless it adds logging, a default, or a
   narrower type. Then it is doing work and should say so in its name.

## Verify

```bash
npx tsc --noEmit -p tsconfig.json     # proves nothing imported what you deleted
npm run gate:audit
```
