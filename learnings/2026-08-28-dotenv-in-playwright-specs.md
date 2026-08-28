# Loading .env for a single Playwright spec without breaking the suite

**Problem:** One spec (`e2e-checkout-env.spec.ts`) needed its credentials, product ID, and
guest details read from `.env`, failing loudly on a missing key, without disturbing the four
other specs or CI.

**Approach:**

1. **Picked the library already present.** `dotenv@17.4.2` was in `devDependencies` and already
   used at `playwright.config.ts:4`. No install. Rejected `dotenv-flow` / `@dotenvx/dotenvx`:
   a new dependency for one spec.
2. **Put the load in a module, not the spec.** Playwright transpiles TS through Babel, whose
   CommonJS transform **hoists every `require` to the top of the file**. A `dotenv.config()`
   sitting between two imports therefore runs *after* both, so any module reading
   `process.env` at load time (here `config/credentials.ts`) could be computed against an
   unloaded `.env`. Moving the call into `src/config/env.ts` as a module side effect inverts
   this: hoisting now *guarantees* the load happens before any importer's body runs.
   The util exports three readers: `requireEnv`, `envOr`, `assertEnv`.
3. **Traced the blast radius with grep before touching shared files.** `credentials.ts` had one
   other importer; `DataGenerator.ts` had two, and the one in a page object was
   `import type`, which TypeScript erases at compile time, so it never pulls dotenv in at
   runtime. That is what made editing shared files safe.
4. **Caught the CI break by reading the workflow, not by assuming.** `.env` is gitignored, so
   GitHub Actions checks out a repo with no `.env`. Fail-fast checks at module scope throw at
   **collection** time, which fails the *whole run*, not one spec. Verified locally with
   `mv .env .env.bak && npx playwright test`: all 5 tests died. Fixed with a
   `cp .env.example .env` CI step, which also makes the committed `.env.example` load-bearing.
5. **Proved the injection instead of trusting it.** Kept dotenv's `override: false` default so a
   real shell variable beats the file, then ran
   `CHECKOUT_FIRST_NAME=EnvProof CHECKOUT_ITEM_ID=tta-practice-backpack npx playwright test ...`
   and watched both values change the run. A spec that reads `.env` and a spec that ignores it
   look identical when the file happens to hold the defaults.

**Judgment calls:**

- Did NOT wire the existing `USERNAME=admin` / `PASSWORD=ADMIN123` keys in. They are not valid
  TTACart accounts, so the login would fail. `USERNAME` is also unsafe as a key: Windows exports
  it at OS level and dotenv does not override pre-existing vars, so the file value is ignored there.
- Did NOT touch `playwright.config.ts`. Consequence: its un-quieted `dotenv.config()` still prints
  dotenv v17's promo banner. `quiet: true` only silences the call it is passed to.
- Did NOT move the fail-fast checks inside the test body. That would scope a failure to one test
  but delay the signal; the collection-time throw plus the CI seeding step was the better trade.
- Claimed early on that the two duplicate spec titles collided in the reporter's flaky diff.
  **Wrong:** the run JSON keys are `chromium › <file> › <describe> › <test>`, so the file path
  already disambiguated them. The rename stands on readability alone.

**Reusable rule:** Put `dotenv.config()` in a module that others import, never mid-import-list in
a consumer, because bundlers hoist requires; and before adding a load-time throw, check whether
the config file it depends on is gitignored, because a collection-time failure takes the whole
suite down, not just the file that threw.
