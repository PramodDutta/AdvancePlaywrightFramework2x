# Lesson 06 - The ai-slop pack

Builds: `rules/ai-slop.rules.mjs`

Regex does not reach the most valuable rule in the system: *does this test
assert anything?* That needs the body of a `test()` call.

```js
// The arrow is located at argument depth so a destructured parameter list is
// not mistaken for the body: in `test('x', async ({ page }) => { ... })` the
// first `{` belongs to `{ page }`, not to the test.
for (let i = open + 1; i < close; i += 1) {
    const ch = file.masked[i];
    if ('([{'.includes(ch)) depth += 1;
    else if (')]}'.includes(ch)) depth -= 1;
    else if (ch === '=' && file.masked[i + 1] === '>' && depth === 0) { arrow = i; break; }
}
```

Brace counting is only safe because it runs on the masked copy: no braces from
strings, comments or template interpolation survive into it.

```js
{
    id: 'slop/test-without-assertion',
    detect: 'blockMissing',
    specsOnly: true,
    options: {
        call: /\btest(?:\.only|\.fail|\.slow)?\s*\(/,
        required: /\b(?:expect|assert[A-Z]\w*|toHave\w+)\b/,
        requiredLabel: 'assertion (expect(...), toHave*, or an assert* page-object method)',
        skipIf: /\btest\.(?:skip|fixme)\b/,
    },
}
```

`required` also accepts a page-object method named `assertLoaded()`. In a
framework where assertions legitimately live in the page object, a rule that
only knows `expect` reports false positives on your best-written specs. That is
why `playwright/expect-expect` was turned off in lesson 01.

**The raw-versus-masked lesson.** An empty `catch` turns a red test green. The
obvious rule ran on masked code and fired on this, which is not the problem:

```ts
} catch {
    // Ignore read errors
}
```

Masking blanks the comment, so the block *looks* empty. But a catch that
explains itself is what we want people to write. Switching the rule to
`target: 'raw'` fixes it, because the comment characters are still there.

---

Exercise and checker: `exercises/06-ai-slop/TASK.md`, `node exercises/check.mjs 06`.
