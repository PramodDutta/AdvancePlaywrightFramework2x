# Playwright custom reporter: path-string wiring and missing-module stubs

**Problem:** `CustomReporter.ts` imports three `../ai/*` modules that don't exist yet, and Playwright rejects inline `new Reporter()` in `config.reporter` — it requires a path-string tuple.

**Approach:**

1. Created stub files for all three missing AI modules (`src/ai/agents/rcaAgent.ts`, `flakyAnalyzer.ts`, `src/ai/config/providers.ts`). Each stub exports the interfaces and functions the reporter expects, with `hasApiKey()` returning `false` so the reporter's RCA/Flaky LLM paths skip gracefully without crashing.
2. Wired the reporter as `['./src/utils/CustomReporter.ts']` in `playwright.config.ts` — Playwright loads it as a module path, not an inline instance. The initial attempt `[() => new CustomTTAReporter()]` failed with `config.reporter[2] must be a tuple [name, optionalArgument]`.
3. Set `trace: 'on'` (always, not just first retry) so traces are available in the TTA report for every test.

**Judgment calls:**

- Did NOT implement real LLM backends. The stubs return deterministic results or throw only when `hasApiKey()` is true (which it never is). This keeps the reporter compiling and running without blocking the framework scaffold.
- Did NOT add AI module path aliases to `tsconfig.json`. The reporter uses relative imports (`../ai/...`) and there's no `@ai/*` alias. Adding one now would be premature — wait until AI modules have real code worth importing elsewhere.
- Kept `flakyAnalyzer.ts` as a deterministic diff (no LLM call), so the Flaky tab works on the very first two runs without any API key.

**Reusable rule:** When wiring a custom Playwright reporter that imports missing internal modules, create type-compatible stubs with graceful "not configured" behavior, and always pass the reporter as a path string in the config tuple — Playwright's config validator rejects function references.
