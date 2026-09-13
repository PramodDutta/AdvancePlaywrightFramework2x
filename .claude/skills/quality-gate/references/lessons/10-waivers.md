# Lesson 10 - Waivers and budgets

Builds: `quality/engine/run.mjs`

A gate with no escape hatch gets deleted the first time it is wrong. A gate with
a free escape hatch gets switched off everywhere. The design goal is an exit
that is always available and never silent.

```ts
// gate-allow ponytail/attaches-what-the-trace-holds -- the diff is computed here, the trace has neither side
await testInfo.attach('shape-diff', { body: diff });
```

The rule about the rules: **a waiver with no reason is itself an error**,
emitted by the engine rather than any pack, as `gate/unexplained-waiver`. The
minimum is 10 characters, which is short enough to be honest and long enough to
stop `--x`.

A waiver applies to its own line or the one below; `gate-allow-file` covers the
file. Waived findings are still listed in the report under their reasons rather
than disappearing: suppression you cannot see is indistinguishable from a rule
that never ran.

## Budgets

Errors block. Warnings are judgement calls, and the honest position is that a
few are fine and thirty are not.

```js
if (limit !== undefined && actual > limit) breaches.push({ gate, severity, limit, actual });
const failing = (profile.fail ?? ['error']).some((s) => counts[s] > 0) || breaches.length > 0;
```

Counted per change. Set them one below your current worst branch, open a PR,
watch it fail, then tune from evidence rather than from a guess.

---

Exercise and checker: `exercises/10-waivers/TASK.md`, `node exercises/check.mjs 10`.
