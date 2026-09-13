# Lesson 01 - ESLint, the easy half

Guide: `docs/quality-gates-tutorial.html`, chapter 01.  
You are building: `eslint.config.mjs`

## Exercises

1. **Add the flat config**  
   Install the packages from the guide and write `eslint.config.mjs` with a `**/*.ts` block using `projectService`, and a `src/tests/**/*.ts` block extending the Playwright plugin.

2. **Run it and write down the number**  
   `npx eslint src playwright.config.ts`. That count is your baseline. You will refer to it in lesson 12.

3. **Prove the rule that matters**  
   Delete an `await` in front of a `page.click()`. ESLint must report it while the test still passes. That is the bug a green suite hides.

4. **Decide what you own**  
   Turn `playwright/expect-expect` off. Lesson 06 rebuilds it in a form that understands your own `assert*` page methods.

## Check your work

```bash
node exercises/check.mjs 01
```

Passes when: the config exists, wires no-floating-promises and the Playwright plugin, and scopes the plugin to specs.
