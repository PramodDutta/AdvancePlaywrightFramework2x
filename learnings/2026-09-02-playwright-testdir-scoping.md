# Playwright says "no tests found" for a real spec file

## The problem

`npx playwright test src/api/01_restfulbooker_raw/basic_ping.spec.ts` reported
"no tests found", even though the file existed and contained a valid `test()` block.

## The approach

1. Trusted the error literally: Playwright found *zero candidates*, so this is a
   discovery problem, not a compile or syntax problem. Did not open the spec first.
2. Read `playwright.config.ts` and looked only at discovery-related keys:
   `testDir`, `testMatch`, `testIgnore`, and per-project overrides.
3. Found `testDir: './src/tests'`. The spec lives under `src/api/`.
4. Confirmed the mental model: a path argument on the CLI is a **filter applied to
   files already collected from `testDir`**. It never widens the search root. A path
   outside `testDir` matches nothing, and Playwright's message for "your filter
   matched nothing" is identical to "this file does not exist".
5. Looked one step ahead before editing: the spec calls `request.get("/ping")`, which
   is relative to `baseURL`. The config's `resolveBaseURL()` defaults to the UI host
   (`app.thetestingacademy.com`) unless `TTA_ENV=api` is set. So fixing discovery
   alone would have traded "no tests found" for a confusing 404.
6. Fixed both at once by giving each project its own root:
   - `chromium` -> `testDir: './src/tests'` (browser config unchanged)
   - `api` -> `testDir: './src/api'`, `baseURL` pinned to the restful-booker host,
     no `devices[...]` so no browser is launched
7. Re-ran the exact failing command and confirmed a real 201 from the live endpoint.

## The judgment calls

- **Did not** widen the top-level `testDir` to `./src`. It works, but it collapses UI
  and API tests into one project, so both share one `baseURL` and both drag along the
  Chrome launch settings. The per-project split keeps the two suites independently
  configurable, which is the point of having `src/api/` as a sibling of `src/tests/`.
- **Did not** move the spec into `src/tests/`. The directory layout is the framework's
  documented architecture; bending the config to the layout is correct, not the reverse.
- **Did not** tell the user to prefix every run with `TTA_ENV=api`. An env var you must
  remember is a latent bug; the project's `use.baseURL` makes the correct host the default
  while `API_BASE_URL` still overrides it.
- **Did not** "fix" the `expect(status).toBe(201)` assertion. 201 is genuinely what
  restful-booker's `/ping` returns; it looks wrong but is right.
- **Did not** silently rewrite the spec's `console.log(responseData)` (which prints the
  `APIResponse` object, not the body). Out of scope for the reported bug; mentioned it
  to the user instead.

## The reusable rule

**"No tests found" is a scoping error, not a file error: check `testDir` / `testMatch`
before you ever open the spec.** And when a test is newly reachable, immediately check
what *else* the config was silently supplying it (baseURL, storageState, timeouts):
fixing discovery often just exposes the next misconfiguration.

## Addendum (2026-09-04): the `testMatch` half of the same trap

Same symptom, different key. `src/api/01_restfulbooker_raw/crud_spec.ts` was inside the
`api` project's `testDir` and still invisible: `--list` showed only `basic_ping.spec.ts`.

Cause: the filename uses an **underscore** (`crud_spec.ts`), and Playwright's default
`testMatch` is `**/*.@(spec|test).?(c|m)[jt]s?(x)`, which requires a **dot** before
`spec`. There is no `--test-match` CLI flag, so a one-off run needs a throwaway config
that spreads the base config and overrides `testMatch` on the project.

Judgment call: **did not** rename the user's file to `crud.spec.ts` just to make the run
work. Running someone's file is not a licence to rename it; the temp config runs it as-is
and the naming fix stays the user's call.

Extra rule: `--list` is the cheapest discovery probe. If the file is absent from `--list`,
it is a config problem; nothing in the spec body can be at fault yet.
