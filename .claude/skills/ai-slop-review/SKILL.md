---
name: ai-slop-review
description: >-
  Reviews test code for the tells of generated-and-skimmed work: tests that
  assert nothing, comments that restate the line below, Arrange/Act/Assert
  banners, generic titles, swallowed errors, emoji, duplicated test bodies. Use
  when an SDET says "review this for AI slop", "does this look generated", "clean
  up this spec", or before merging a large batch of generated tests.
license: MIT
metadata:
  author: TheTestingAcademy
  pack: quality
  version: 1.0.0
  adapted-for: AdvancePlaywrightFramework2x
---

# AI Slop Review

Run the machine part first, then read for what it cannot see.

```bash
npm run gate -- --file <path>      # rules: slop/*
```

## The line this gate draws

A comment that carries information the code cannot is the most valuable line in
a file. A comment that restates the line under it is a second thing to keep in
sync, and it is always the one that rots.

```ts
// booker returns 201, not 204              <- keep: the code cannot say this
expect(await api.deleteBooking(id)).toBe(201);

// click the login button                   <- cut: the code already says it
await this.el.click(this.loginButton);
```

The detector measures how much of the **comment** the code already says, not the
other way round. A long comment that mentions two identifiers scores low and is
left alone. That asymmetry is deliberate; see `coverage()` in
`quality/engine/detectors.mjs`.

## What the gate blocks

| Rule | Why it is an error |
|---|---|
| `slop/test-without-assertion` | Passes as long as nothing throws. Reports green on a broken feature. |
| `slop/constant-assertion` | `expect(true).toBe(true)` makes a test look finished. |
| `slop/swallowed-error` | An empty `catch` turns a red test green. In a suite whose job is finding failures, the worst line available. |
| `slop/not-implemented` | A generated skeleton that reached review. |

A `catch` whose body holds only `// Ignore read errors` is **not** flagged.
Documented suppression is the thing we want people to write; the rule matches
raw text precisely so the comment saves it.

## What you still have to read for

The gate cannot see these. Check them by hand on generated code:

- **Assertions that cannot fail.** `expect(items.length).toBeGreaterThanOrEqual(0)`.
- **A test whose title and body disagree.** The title says "rejects", the body asserts success.
- **Setup that duplicates a fixture.** Logging in by hand when `validLogin` exists.
- **Coverage theatre.** Six tests over six items of the same equivalence class,
  and none over the boundary.
- **Invented API surface.** A page-object method the model wished existed. `npx tsc --noEmit` catches this; run it.

## Verify

```bash
npx tsc --noEmit -p tsconfig.json
npx playwright test <the spec you touched>
```

A spec that was cleaned but not re-run is not clean. Deleting a `log.info` is
safe; deleting a step that turned out to be load-bearing is not.
