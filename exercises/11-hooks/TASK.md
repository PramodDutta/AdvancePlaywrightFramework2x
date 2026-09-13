# Lesson 11 - Pre-generation hooks

Guide: `docs/quality-gates-tutorial.html`, chapter 11.  
You are building: `.claude/hooks/ and .claude/settings.json`

## Exercises

1. **Wire the edit hook**  
   Ask your agent to write a spec importing `@playwright/test` directly. Watch it correct itself without you saying anything.

2. **Measure before you decide**  
   `time npx eslint <file>` against `time node quality/gate.mjs --file <file>`. Decide from your own numbers what belongs in the edit loop.

3. **Fail open**  
   Break your engine on purpose. The hook must exit 0 with a message, never block every edit in the session.

4. **Cover human commits**  
   Add `.githooks/pre-commit` and `git config core.hooksPath .githooks`. Try to commit a spec with no assertion.

## Check your work

```bash
node exercises/check.mjs 11
```

Passes when: three hook events wired and the edit hook does not run ESLint.
