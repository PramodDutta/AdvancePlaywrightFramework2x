# Lesson 11 - Pre-generation hooks

Builds: `.claude/hooks/, .claude/settings.json, .githooks/`

Everything up to here reports on code that already exists. The interesting move
is to put the gate inside the loop that writes it.

A Claude Code hook reads one JSON object on stdin and answers with an exit code:
`0` lets the action through, `2` blocks it and hands stderr back to the model as
feedback to act on.

See `references/stages.md` for the full contract of all five stages. The three
things worth repeating here:

**Inject before you block.** Telling the model the rules costs a few hundred
tokens; blocking an edit and having it rewrite the file costs a whole turn.
Inject only the `error` rules, or you bury the ones that matter.

**Block on errors, print warnings.** Contract breaks get fixed immediately while
the code is fresh; taste findings are shown as advice.

**Fail open on your own bug.**

```js
if (error) {
    // A broken gate must not become a broken edit loop. Say so and move on.
    process.stderr.write(`quality gate could not run: ${error}\n`);
    process.exit(0);
}
```

**Measure before deciding what runs where.** A type-aware lint of one file costs
about 2.2s; the engine costs 0.14. That single measurement is why ESLint runs at
commit and in CI rather than on every edit. Take your own numbers rather than
inheriting this one.

`.githooks/pre-commit` covers commits that do not come from an agent: fifteen
lines of shell, no new dependency, enabled with `npm run gate:install-hooks`.

---

Exercise and checker: `exercises/11-hooks/TASK.md`, `node exercises/check.mjs 11`.
