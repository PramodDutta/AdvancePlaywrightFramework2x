# Lesson 08 - Seeing across files

Builds: `quality/engine/repo-index.mjs`

"Does anything import this export?" cannot be answered from inside the file that
defines it. Neither can "how many callers does this helper have?". Those two are
most of what over-engineering actually is, so the engine graphs the whole repo
before any rule runs.

Aliases come from `tsconfig.json` rather than being hard-coded, so the graph
cannot drift from what the compiler resolves.

**The trap.** A module can be in use without any file importing it:

```ts
reporter: [['html'], ['list'], ['./src/utils/CustomReporter.ts']],
```

That reporter is very much in use. The index therefore also collects paths named
inside string literals, and `unusedExport` skips anything in `stringRefs`.

**The second trap.** Restrict `unusedExport` to value kinds:

```js
kinds: ['const', 'let', 'var', 'function', 'class'],
```

An exported interface is often the published return type of an exported
function, so a consumer needs it importable even when nothing imports it by name
today. Including types removed nothing real and reported every interface in the
repo: the rule was detecting TypeScript, not dead code.

**What this pack deliberately does not flag.** `UtilElementLocator` is a wrapper
whose job is to log every action; `BasePage` is one base class one level deep.
Both look like indirection and neither is. Over-engineering is an abstraction
with no consumer, not an abstraction you personally would not have written.
Write that distinction into the pack's header, because someone will argue.

---

Exercise and checker: `exercises/08-cross-file/TASK.md`, `node exercises/check.mjs 08`.
