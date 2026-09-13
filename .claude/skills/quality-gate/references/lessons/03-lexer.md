# Lesson 03 - Reading source safely

Builds: `quality/engine/source.mjs`

The naive version of this project is `grep`, and it fails the same way every
time. These are three appearances of one string:

```ts
// never call page.waitForTimeout in a spec           <- documentation
log.info('replacing page.waitForTimeout with a poll'); // <- a log message
await page.waitForTimeout(2000);                       // <- the finding
```

Walk the file once and produce a copy where comment bodies and string contents
are blanked, newlines preserved so every offset still maps to its line.

```js
export function lex(text) {
    const out = new Array(text.length);
    const comments = [], strings = [];
    let line = 1, i = 0;
    while (i < text.length) {
        // '//' and '/*' -> record the comment, blank the body
        // a quote       -> record the string, blank the body, KEEP both quotes
        // '/' where a value is expected -> a regex literal, copy through as code
        // otherwise     -> copy the character
    }
    return { masked: out.join(''), comments, strings };
}
```

A real page object, before and after:

```
this.log.info("Open login pgae");     ->     this.log.info("               ");
```

Same length, same line, same columns. The string is gone; `LoginPage.PATH` on
the next line survives, because it is code.

**`regexAllowedAt` earns its twelve lines.** A `/` only starts a regex literal
where a value is expected. Get it wrong and `const re = /\/\//;` is read as a
comment, swallowing the rest of the file.

**The cost, which lesson 07 pays:** masking blanks the words a narrating comment
is echoing. `// click the login button` sits above `page.locator('#login-button')`,
and in the masked copy `login-button` is gone. A rule comparing the two must
read the raw line. Knowing which copy a rule needs is most of the skill here.

`readSource()` also returns `layer` (derived from the path), `lineAt()` (offset
to line, binary search over pre-computed line starts), and the file's imports,
exports and classes, which lesson 08 turns into a graph.

---

Exercise and checker: `exercises/03-lexer/TASK.md`, `node exercises/check.mjs 03`.
