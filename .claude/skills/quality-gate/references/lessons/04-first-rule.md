# Lesson 04 - Your first rule

Builds: `rules/*.rules.mjs and quality/engine/run.mjs`

The temptation is to write each rule as a function. Fifty rules later, adding
"no `page.pause()` in specs" means writing, testing and reviewing code, and
nobody adds the rule. Instead a rule is a plain object naming a detector.

```js
export default {
    gate: 'ai-slop',
    rules: [{
        id: 'slop/constant-assertion',
        title: 'Assertion on a constant',
        severity: 'error',
        detect: 'regex',
        options: { pattern: /\bexpect\s*\(\s*(?:true|false|\d+)\s*\)\s*\.\s*(?:toBe|toEqual)\s*\(/ },
        why: '`expect(true).toBe(true)` exercises nothing. It exists to make a test look finished.',
        fix: 'Assert against a value the system under test produced, or delete the line.',
    }],
};
```

The runner decides which files each rule sees, then calls the named detector.
An unknown detector name throws rather than silently skipping:

```js
const detector = detectors[rule.detect];
if (!detector) throw new Error(`Rule ${rule.id} names unknown detector "${rule.detect}"`);
```

**A bug worth stealing.** The glob translator converted `?` to `.` as its last
step, *after* producing `(?:.*/)?` groups, so it rewrote its own output. Every
pattern matched nothing, the walker found one file, and the gate cheerfully
reported a clean repo. Substitute wildcards before creating any regex syntax of
your own, and always check the scanned-file count. A gate reporting zero
findings deserves suspicion until you have proved it scanned something.

---

Exercise and checker: `exercises/04-first-rule/TASK.md`, `node exercises/check.mjs 04`.
