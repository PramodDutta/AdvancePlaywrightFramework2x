# Lesson 01 - ESLint, the easy half

Builds: `eslint.config.mjs`

Start with the half that has correct answers. ESLint 9 uses a flat config: an
array of blocks, each naming the files it applies to. Type-aware rules need
`projectService`, which hands the parser the real `tsconfig.json`.

```js
export default tseslint.config(
  { ignores: ['node_modules/**', 'playwright-report/**', 'test-results/**'] },
  {
    files: ['**/*.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      'max-params': ['warn', 4],
      'no-console': 'error',
    },
  },
  {
    files: ['src/tests/**/*.ts'],
    extends: [playwright.configs['flat/recommended']],
    rules: {
      'playwright/no-wait-for-timeout': 'error',
      'playwright/prefer-web-first-assertions': 'error',
      'playwright/expect-expect': 'off',   // lesson 06 does this better
    },
  },
);
```

`no-floating-promises` is the reason to accept type-aware linting. A missing
`await` on a Playwright action does not throw: the test finishes early, passes,
and the action lands on the next test's page. It is the only bug in the set that
a green suite actively hides.

Scope the Playwright plugin to `src/tests/` so page objects are not judged as
specs. Turn `expect-expect` off when you intend to own that question yourself
with a rule that understands your `assert*` page methods.

**Trap:** pin `typescript` to the major your `tsconfig.json` was written for.
Installing it unpinned pulled 6.x during the original build and broke
`tsc --noEmit` on `moduleResolution: node10` and `baseUrl`, both of which 5.x
accepts. A linter install should not force a compiler upgrade.

---

Exercise and checker: `exercises/01-eslint/TASK.md`, `node exercises/check.mjs 01`.
