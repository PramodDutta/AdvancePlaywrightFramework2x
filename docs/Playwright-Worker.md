# Playwright Worker Lanes

How Playwright splits tests across parallel worker processes, measured on this repo.

Every number below was produced by running the suite, not quoted from documentation.

> Playwright 1.62.1 &middot; 16 logical cores &middot; macOS &middot; 4 tests across 3 spec files in [`src/tests/e2e/`](../src/tests/e2e/)

---

## The mental model

A **worker** is an isolated process with its own browser. Tests are handed out to whatever
lanes are free. The only question is how many lanes exist.

```mermaid
flowchart LR
    subgraph P["--workers=4 (the default here), 7.8s"]
        direction TB
        W0["worker 0<br/>e2e-checkout"]
        W1["worker 1<br/>e2e-checkout-env"]
        W2["worker 2<br/>fixture: invalid login"]
        W3["worker 3<br/>fixture: preselected item"]
    end
    subgraph S["--workers=1, 13.1s"]
        direction TB
        SW["worker 0<br/>checkout -> env -> invalid -> preselected"]
    end
```

The two fixture tests live in the **same file** and still land in different lanes. That is
`fullyParallel: true` doing its job: it works at test level, not file level.

---

## Measured on this repo

Same four e2e tests. Only the worker count changed.

| Command | Wall clock | Saved |
|:--------|-----------:|:------|
| `--workers=1` | 13.1s | baseline |
| `--workers=2` | 9.4s | 3.7s |
| `--workers=4` | 7.8s | 1.6s more |

**Why it stops improving.** Going 1 to 2 workers saved 3.7s. Going 2 to 4 saved only 1.6s more.
With four tests you run out of work to hand out long before you run out of cores. Parallelism
pays off on suite size, not on worker count.

---

## How many workers can my machine take?

First, a correction worth making early: **the default is not fixed at 4.** Playwright's default is
half your logical cores, then capped at the number of tests. This machine has 16 cores, so the
default allows 8, but there are only 4 e2e tests, so 4 workers ran. Add more tests and the number
climbs on its own.

### What a worker actually costs

Peak resident memory for the whole run (Node processes plus browsers), measured on this repo:

| Workers | Headed (this config) | Headless |
|--------:|---------------------:|---------:|
| 1 | 1.70 GB | - |
| 2 | 2.49 GB | - |
| 4 | 3.77 GB | 2.47 GB |

That is close to linear, which gives a usable model:

```text
total RAM = ~1 GB fixed + (workers x per-worker cost)

per-worker cost:  ~0.7 GB headed at 1920x1080
                  ~0.4 GB headless
```

### The table

"Free RAM" assumes the OS, an editor, and a few browser tabs are already running. Take the
**lower** of the two ceilings, because they bind for different reasons.

| System RAM | Free for tests | RAM ceiling (headed) | RAM ceiling (headless) | Typical cores | CPU default (cores / 2) | Practical pick |
|:-----------|---------------:|---------------------:|-----------------------:|--------------:|------------------------:|:---------------|
| 8 GB  | ~4 GB  | 4  | 7  | 4 to 8   | 2 to 4 | **2 headed, 4 headless** |
| 16 GB | ~11 GB | 14 | 25 | 8 to 12  | 4 to 6 | **4 headed, 6 headless** |
| 32 GB | ~26 GB | 35 | 62 | 12 to 16 | 6 to 8 | **8, RAM is not the limit** |

Read the table this way: **RAM only binds on 8 GB machines.** At 16 GB and above you run out of
cores long before you run out of memory, so the CPU column is the real answer. Buying RAM to get
more workers is the wrong upgrade; more cores is the right one.

Work it out for any machine:

```text
workers = min(
    (free RAM in GB - 1) / 0.7,     # 0.4 if headless
    logical cores / 2
)
```

### Headless is the bigger win

At the same 4 workers, on the same 4 tests:

| Mode | Peak RAM | Wall clock |
|:-----|---------:|-----------:|
| Headed (`headless: false`) | 3.77 GB | 7.8s |
| Headless | 2.47 GB | 3.3s |

**35% less memory and 2.4x faster**, from one config flag. Watch the browser while you are writing
a test; run headless everywhere else. This is why CI should never run headed.

### Setting it

```bash
npx playwright test --workers=4          # one run
npx playwright test --workers=50%        # a share of cores, portable across machines
```

```ts
// playwright.config.ts
workers: process.env.CI ? '50%' : 4,
```

The percentage form is the one to teach: `'50%'` behaves sensibly on a student's 8 GB laptop and on
a 32-core CI box without anyone editing the file.

---

## The commands

Run the e2e folder as configured. It is already parallel:

```bash
npx playwright test src/tests/e2e/ --project=chromium
```

Pin the worker count. The CLI flag beats the config file:

```bash
npx playwright test src/tests/e2e/ --workers=4
npx playwright test src/tests/e2e/ --workers=1   # serial, for debugging
```

`--workers=1` is the first thing to try when a test passes alone but fails in a suite.

Run one file, or one test by title:

```bash
npx playwright test src/tests/e2e/e2e-checkout_new_fixture.spec.ts
npx playwright test src/tests/e2e/ -g "checkout successfully"
```

Split across machines on CI:

```bash
npx playwright test --shard=1/3   # machine 1
npx playwright test --shard=2/3   # machine 2
npx playwright test --shard=3/3   # machine 3
```

Workers parallelise **within** one machine. Shards parallelise **across** several. They compose:
each shard still runs its slice with multiple workers.

---

## Proof, three ways

Playwright announces its plan on the first line of every run. Read it before you trust anything else.

```text
# 4 tests across 3 files
Running 4 tests using 4 workers

# 2 tests inside ONE file, still split
Running 2 tests using 2 workers

# 3 tests in a describe.serial block
Running 3 tests using 1 worker
```

That third line is the one people miss. Adding `.serial` silently caps the whole file at one
lane, no matter what `--workers` says.

---

## What controls it

| Knob | Where | Effect |
|:-----|:------|:-------|
| `fullyParallel: true` | `playwright.config.ts` | Tests inside a single file run in parallel too, not just file against file. |
| `workers: N` | `playwright.config.ts` | Not set in this repo, so the default applies: half the logical cores, capped at the number of tests. 16 cores allows 8, but 4 tests means 4 workers. |
| `--workers=N` | CLI | Overrides the config for one run. The fastest way to demo the difference. |
| `test.describe.serial` | spec file | One worker, in order, and the rest of the block skips after the first failure. |
| `test.describe.configure({ mode: 'parallel' })` | spec file | Opts one file into parallel even when `fullyParallel` is off. |
| `--shard=k/n` | CLI | Slices the suite across n machines. Combine with workers, do not choose between them. |

---

## Four things that bite

**1. Headed mode opens one window per worker.**
This config sets `headless: false`. Four workers means four Chrome windows at 1920x1080 fighting
for your screen and RAM. For a classroom demo, drop to `--workers=2` or add `--headed=false`.

**2. Shared state breaks the moment tests spread out.**
A `let bookingId` at the top of a file works only because the tests run in order on one worker.
Parallelise it and the second test reads `undefined`. That is exactly why
[`05_crud.spec.ts`](../src/tests/apisTests/01_restfulbooker_raw/05_crud.spec.ts) uses
`describe.serial`, and the cost of that choice is the lane it gives up.

**3. More workers is not always faster.**
Each worker is a real browser process. Past roughly half your cores they compete for CPU and the
suite slows down. The measurements above already flatten between 2 and 4.

**4. Test order stops being predictable.**
Reports come back in completion order, not file order, so runs look shuffled. If a test needs
something an earlier test created, it needs a fixture, not a neighbour.

---

## The one-line rule

**Parallel by default; serial only where state is genuinely shared.**

Every `describe.serial` is a lane you gave up, so make it a decision you can defend rather than a
habit. When a test needs setup, a fixture gives it that setup without costing a lane.

---

Measured 2026-09-09 on AdvancePlaywrightFramework2x, chromium project.
Files: `e2e-checkout.spec.ts`, `e2e-checkout-env.spec.ts`, `e2e-checkout_new_fixture.spec.ts`.
