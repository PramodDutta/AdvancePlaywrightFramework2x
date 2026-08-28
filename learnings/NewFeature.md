# How we added `.env` support to a single Playwright spec

A step-by-step record of how this feature was actually built, so students can replicate both
the **result** and, more importantly, the **method**. Every prompt, question, answer, and
verification command below is the real one used.

**Feature:** make `src/tests/e2e/e2e-checkout-env.spec.ts` read its credentials, product ID,
and guest checkout details from a `.env` file, failing loudly when a key is missing, without
breaking the four other specs or CI.

---

## 0. The method in one picture

```
Understand the repo  ->  Ask before assuming  ->  Plan on paper  ->  Review the plan
        |                                                                  |
        v                                                                  v
   Check blast radius  <-  Implement  <-  Trim comments  <-  Modularise into a util
        |
        v
   Verify by PROVING it, not by trusting it
```

The single biggest lesson: **no code was written until the plan was approved.** Four rounds of
review happened on a markdown plan, which is cheap to change. Code is expensive to change.

---

## 1. The prompts, in order

### Prompt 1: load the context first

```
Understand the project and be ready with it
```

Why this matters: the agent read `package.json`, `playwright.config.ts`, `tsconfig.json`, every
page object, fixture, util, and spec **before** being given the task. It found that `dotenv` was
already installed, which changed the entire answer to "which library should we use".

### Prompt 2: the actual feature request

```
@src/tests/e2e/e2e-checkout-env.spec.ts, I want support for a .env file in this, okay?
Only this file.
What I want you to do is:
- Find out which library we can use that can support that, read from the .env file,
  and inject the variable into this file automatically.
- Find out which library to use, what code we need to add, what changes I need to make,
  and how to make the minimum changes so we will be able to use the .env file in
  e2e-checkout-env.spec.ts.
```

What makes this a good prompt:
- **Scoped:** "Only this file" sets a boundary the agent must justify crossing.
- **Asks for research, not just code:** "find out which library" invites a recommendation with
  reasoning instead of a guess.
- **States the constraint:** "minimum changes" is a real design input.

### Prompt 3: force a written plan

```
Create a temp plan for it where you will mention the file touched and changes and
give me all the details what you are going to make the changes.
```

This is the highest-leverage prompt in the whole session. It converts an invisible plan into a
reviewable document listing files touched, code to add, and verification steps.

### Prompt 4: push for modularity

```
Based on the plan that you have created, can we create some util which can help us or
make it more modular in nature and optimize it more with minimum changes.
```

The first plan inlined helper functions in the spec. This prompt moved them into a reusable
`src/config/env.ts`. It also, by accident, fixed a real bug (see the Babel hoisting note in
section 4).

### Prompt 5: demand a safety check and a self-review

```
Can you please check if other code spec file doesnt get break due to these changes,
plan looks fine, make sure we add the files without to many comments, one liner comment
is fine, I want you to review the approach and code added also
```

Three asks in one: prove nothing breaks, cut the comment noise, and critique your own design.
This prompt is what surfaced the CI break described in section 5.

---

## 2. The clarifying questions that were asked

Before planning, three decisions were put back to the user rather than assumed. Copy this habit:
**a question costs one minute, a wrong assumption costs a rewrite.**

| # | Question | Options offered | Chosen |
|---|---|---|---|
| 1 | Which `.env` keys supply the login credentials? | `STANDARD_USER`/`TTA_SECRET` (already read by `credentials.ts`); new `TTA_USERNAME`/`TTA_PASSWORD`; reuse existing `USERNAME`/`PASSWORD` | **`STANDARD_USER` / `TTA_SECRET`** |
| 2 | How much of the spec should `.env` drive? | Creds only; creds + item ID; creds + item + customer | **Creds + item + customer** |
| 3 | What happens when a required var is missing? | Fail fast with a clear error; fall back to defaults | **Fail fast** |

### The trap question 1 avoided

`.env` already contained:

```bash
USERNAME=admin
PASSWORD=ADMIN123
```

These look like credentials, but `admin` / `ADMIN123` are **not valid TTACart accounts** (the
valid ones live in `src/testdata/logintestdata.json`). Wiring them in would have produced a
green-looking change that fails at login. Separately, `USERNAME` is a poor key name: Windows
exports it at the OS level, and dotenv does not override pre-existing variables, so the file
value is silently ignored there.

**Rule:** before injecting an env value into a login, check that the value actually works.

---

## 3. Which library, and why

| Question | Answer |
|---|---|
| Library | **`dotenv`** |
| Version | `^17.4.2`, already in `devDependencies` |
| Install needed? | **No.** `npm install` adds nothing |
| Already used? | Yes, `playwright.config.ts:2,4` |

Rejected: `dotenv-flow` and `@dotenvx/dotenvx`. Both add `.env.local` layering and encryption
this project does not need, and both mean a new dependency for one spec.

Two option flags matter:

```ts
dotenv.config({ quiet: true });
```

- `quiet: true` silences dotenv **v17**'s promotional tips banner. Without it you get one banner
  per worker process in your console and report output.
- `override` is left at its default `false`, so a **real shell or CI variable always beats the
  file**. This is correct for CI, and it is also what makes the proof in section 6 possible.

---

## 4. The code that was added

### New: `src/config/env.ts`

`CLAUDE.md` designates `src/config/` for "Environment config, logger setup, global constants",
and the `@config/*` alias already existed in `tsconfig.json`.

```ts
/** Reads `.env` values. Importing this module loads `.env` into process.env once. */
import dotenv from 'dotenv';

// quiet silences dotenv v17's banner; override stays false so shell/CI vars win.
dotenv.config({ quiet: true });

function read(key: string): string | undefined {
    return process.env[key]?.trim() || undefined;
}

/** Required value; throws when unset or blank. */
export function requireEnv(key: string): string {
    const value = read(key);
    if (!value) {
        throw new Error(`Missing required env var ${key}. Set it in .env (see .env.example)`);
    }
    return value;
}

/** Optional value with a fallback. */
export function envOr(key: string, fallback: string): string {
    return read(key) ?? fallback;
}

/** Asserts keys exist without returning them; reports all missing keys at once. */
export function assertEnv(...keys: string[]): void {
    const missing = keys.filter((key) => !read(key));
    if (missing.length > 0) {
        throw new Error(`Missing required env var(s) ${missing.join(', ')}. Set them in .env (see .env.example)`);
    }
}
```

### Why the `dotenv.config()` call lives HERE and not in the spec

This is the subtle part worth teaching.

Playwright transpiles TypeScript through Babel, and Babel's CommonJS transform **hoists every
`require` call to the top of the file**. So if you write this in a spec:

```ts
import dotenv from 'dotenv';
dotenv.config();                                  // looks like it runs first
import { credentials } from '@config/credentials'; // but this is HOISTED ABOVE it
```

the `credentials` module is loaded, and reads `process.env`, **before** `dotenv.config()` ever
runs. Your `.env` values silently do not apply.

Putting the call inside a module that others import turns that hoisting from a hazard into a
guarantee: importing `@config/env`, directly or transitively, loads `.env` before the importing
module's body executes.

### Changed: `src/config/credentials.ts` (2 lines, behaviour identical)

```ts
import { envOr } from './env';

export const credentials = {
    standardUser: envOr('STANDARD_USER', 'standard_user'),
    password: envOr('TTA_SECRET', 'tta_secret'),
} as const;
```

Same fallbacks, same values. The gain is that the `.env` load is now a **declared dependency**
instead of an assumption that `playwright.config.ts` ran first.

### Changed: `src/utils/DataGenerator.ts` (one method)

```ts
import { envOr } from '@config/env';

    /** Checkout customer, `.env` first, Faker for any field left unset. */
    static checkoutCustomerFromEnv(): CheckoutCustomer {
        const generated = DataGenerator.checkoutCustomer();
        return {
            firstName: envOr('CHECKOUT_FIRST_NAME', generated.firstName),
            lastName: envOr('CHECKOUT_LAST_NAME', generated.lastName),
            postalCode: envOr('CHECKOUT_POSTAL_CODE', generated.postalCode),
        };
    }
```

### Changed: the spec itself

Note what is **absent**: no `dotenv` import, no helper functions. Three lines of config.

```ts
const log = createLogger('e2e-checkout-env');

// Resolved at load time so an incomplete .env fails the file, not a step midway.
assertEnv('STANDARD_USER', 'TTA_SECRET');
const ITEM_ID = requireEnv('CHECKOUT_ITEM_ID');
```

and inside the test:

```ts
const customer = DataGenerator.checkoutCustomerFromEnv();
```

The spec ended up **shorter than it started**. That is the signal that the util was the right call.

### The `.env` keys added

```bash
# e2e-checkout-env.spec.ts
STANDARD_USER=standard_user
TTA_SECRET=tta_secret
CHECKOUT_ITEM_ID=test-allthethings-tshirt-red
CHECKOUT_FIRST_NAME=Pramod
CHECKOUT_LAST_NAME=Dutta
CHECKOUT_POSTAL_CODE=560001
```

---

## 5. The blast radius check (and the break it found)

Prompt 5 asked "check other spec files don't break". This was answered with `grep`, not opinion:

```bash
grep -rn "credentials" src --include='*.ts'
grep -rn "DataGenerator\|CheckoutCustomer" src --include='*.ts'
```

| Changed file | Other importers | Impact |
|---|---|---|
| `credentials.ts` | `e2e-checkout.spec.ts:13` only | None. `envOr(...)` returns exactly what `?? 'default'` returned |
| `DataGenerator.ts` | `e2e-checkout.spec.ts:12`, and `CheckoutStepOnePage.ts:3` as **`import type`** | None. A type-only import is **erased at compile time**, so the page object never pulls dotenv in at runtime |
| `CustomReporter.ts` | n/a | Untouched. Uses no path aliases and none of the changed files |

### The real break: CI

`.env` is **gitignored**. CI runs `actions/checkout` then `npx playwright test`, so the runner
has **no `.env` at all**. Because `assertEnv()` sits at module scope, it throws at **collection
time**, which fails the **entire run**, not just this spec.

This was proven locally, not guessed:

```bash
mv .env .env.bak && npx playwright test
# Error: Missing required env var(s) STANDARD_USER, TTA_SECRET. Set it in .env (see .env.example)
# all 5 tests dead
```

Fix, one step added to `.github/workflows/playwright.yml`:

```yaml
    - name: Seed .env for the test run
      run: cp .env.example .env
```

This also makes the committed `.env.example` load-bearing rather than decorative. When real
secrets are needed later, swap it for an `env:` block backed by GitHub Secrets.

**Rule:** before adding a load-time throw, check whether the config file it depends on is
gitignored. A collection-time failure takes the whole suite down, not just the file that threw.

---

## 6. Verification: prove it, do not trust it

A spec that reads `.env` and a spec that ignores `.env` look **identical** when the file happens
to contain the default values. So the run must be designed to distinguish them.

```bash
# 1. Type check
npx tsc --noEmit -p tsconfig.json          # exit 0

# 2. Happy path
npx playwright test src/tests/e2e/e2e-checkout-env.spec.ts
# [e2e-checkout-env] Env config: item="test-allthethings-tshirt-red",
#                    customer="Pramod Dutta", postalCode="560001"   -> 1 passed

# 3. THE PROOF: a shell var must beat the file (this is what override:false buys)
CHECKOUT_FIRST_NAME=EnvProof CHECKOUT_ITEM_ID=tta-practice-backpack \
  npx playwright test src/tests/e2e/e2e-checkout-env.spec.ts
# [e2e-checkout-env] Env config: item="tta-practice-backpack",
#                    customer="EnvProof Dutta", postalCode="560001" -> 1 passed
# Both values changed AND the test still passed against a different product.

# 4. Fail-fast works
mv .env .env.bak && npx playwright test
# Error: Missing required env var(s) STANDARD_USER, TTA_SECRET.

# 5. The CI fix works
cp .env.example .env && npx playwright test    # 5 passed
mv .env.bak .env

# 6. Nothing else moved
npx playwright test                            # 5 passed
```

Step 3 is the one that actually proves the feature. Steps 1, 2, and 6 only prove nothing broke.

---

## 7. Two things that were wrong, and were corrected

Kept here deliberately: a replication guide that only shows the wins teaches the wrong lesson.

1. **A claim that did not survive checking.** Early on it was asserted that the two duplicate
   spec titles collided in the custom reporter's flaky diff. Inspecting an actual run file
   showed the keys are `chromium > <file> > <describe> > <test>`, so the file path already
   disambiguated them. The rename to `(env-driven)` stands on readability alone, not on the
   bug that was claimed.

2. **A promise not fully delivered.** The plan said verification would show "no dotenv banner".
   The banner still appears, because it comes from `playwright.config.ts:4`, which calls
   `dotenv.config()` with no options, and that file was explicitly out of scope. `quiet: true`
   only silences the call it is passed to. The one-line fix, if wanted, is to make
   `playwright.config.ts` use `dotenv.config({ quiet: true })` or import `./src/config/env`.

---

## 8. The replication checklist

1. Ask the agent to read the repo **before** giving it the task.
2. State your scope boundary explicitly ("only this file").
3. Ask "which library", do not name one. You may already have it installed.
4. Demand a written plan listing **files touched**, code, and verification.
5. Review the plan and push once for modularity. Helpers in a spec should usually be a util.
6. Ask "does this break anything else?" and require `grep` evidence, not reassurance.
7. Ask the agent to review its own approach and list what it deliberately did not do.
8. Verify with a run that would **fail** if the feature were not working.
9. Check CI separately. Your local machine has files the runner does not.
