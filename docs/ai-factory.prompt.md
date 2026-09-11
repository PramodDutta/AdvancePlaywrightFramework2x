# Prompt: add an AI agent layer to this Playwright framework

Paste the section below to an AI coding agent working in this repository. Everything above the
divider is notes for you, the human, and is not part of the prompt.

**Why this file exists.** The original request was dictated and mixed five deliverables, a working
agreement, and a provider list into one paragraph. This version separates what to build from how to
work, gives each agent a testable definition of done, and points at the integration seams that
already exist in the repo so the agent extends them instead of rebuilding them.

**Verified repo facts as of 2026-09-11**, checked before writing this, and worth re-checking before
you paste it:

- `src/ai/agents/rcaAgent.ts`, `src/ai/agents/flakyAnalyzer.ts` and `src/ai/config/providers.ts`
  exist in `HEAD` but are **deleted from the working tree**. That breaks the build:
  `npx tsc --noEmit` fails with `TS2307 Cannot find module` three times, because
  `src/utils/CustomReporter.ts` imports all three at lines 20 to 22. Restore them with
  `git checkout -- src/ai` or accept that the first task is to replace them.
- `flakyAnalyzer.ts` is **not a stub**. It already does the deterministic build-to-build diff and
  the reporter already prints its result on every run. Only the LLM summary is missing.
- `RcaVerdict` already carries `severity`, `priority`, `rootCause` and `fixes`, and the reporter
  already renders all four as badges. Bug triage is therefore a field-population problem, not a new
  agent, unless you deliberately want it separate.

---

## Objective

Add an AI layer to this Playwright framework, built around a provider-agnostic `LLMClient` and an
agent factory, so that any new agent is a prompt plus an output schema rather than new plumbing.

Work **plan first**. Do not write code until the plan is agreed. Then build **one agent at a time**,
starting with the test-data generator, and stop after each for review.

## Providers

`LLMClient` must support **DeepSeek, OpenRouter, Groq, OpenAI and Anthropic (Claude)** behind one
interface, selected by configuration rather than by import site.

- The only key available today is **DeepSeek**, so that is the default and the one path that must be
  proven end to end. The other four must be implemented and structurally exercised, but may go
  unverified against a live endpoint.
- Read keys through `@config/env`. Never read `process.env` directly, and never commit a key.
  Add placeholder entries to `.env.example`.
- Provider choice, model and base URL come from env (`AI_PROVIDER`, `AI_MODEL`, `AI_BASE_URL`), with
  DeepSeek as the fallback.

## Existing seams to extend, not rebuild

`src/utils/CustomReporter.ts` already wires most of this. Match these contracts:

| Seam | Location | Current behaviour |
|:-----|:---------|:------------------|
| `hasApiKey()` gate | `providers.ts`, called at reporter line 499 | Returns `false`; reporter skips all AI paths |
| `analyzeFailure()` | `rcaAgent.ts`, called at line 514 | Throws; result pushed to `aiVerdicts` |
| `analyzeFlaky()` | `flakyAnalyzer.ts`, called at line 567 | Works already, deterministic diff |
| **AI Data** tab | reporter line 957 | Reads `testInfo.attach('ai-data', ...)`, `application/json` |
| **AI Verdict** tab | `renderVerdictCard()` line 997 | Renders severity, priority, root cause, fix list |

An agent that emits the right shape into the right attachment name appears in the report with no
reporter changes at all. Prefer that over editing the reporter.

## The factory contract

One `LLMClient` handles transport, retries, timeouts and errors. One `createAgent()` turns a prompt
plus an output schema into a callable agent, so adding the sixth agent is a config entry, not a new
file of HTTP code.

Requirements:

1. **Typed output.** An agent declares its output shape and the factory validates the model's JSON
   against it before returning. This repo already has Ajv and `@utils/SchemaValidator`: reuse them.
   A response that does not match the schema is a failure, not a value to pass downstream.
2. **One retry on malformed JSON**, feeding the validation error back to the model. Then give up.
3. **Graceful absence.** With no key, every agent returns a typed "unavailable" result. Nothing
   throws, no test fails, and the reporter renders without the AI tabs.
4. **Bounded cost.** A timeout and a max token cap per call, both configurable, both with sane
   defaults.
5. **Observability.** Log provider, model, latency and token counts through `@utils/logger`. Never
   log prompt or response bodies, which may carry app data.

## The five agents

Build in this order. Each is done when its acceptance criteria pass.

### 1. Test data generator (build this first)

Generates realistic booking payloads for a spec instead of Faker's random values.

- Create a replica of the create-booking spec under the AI test folder. Do not modify the original.
- Emits `testInfo.attach('ai-data', ...)` so the existing **AI Data** tab picks it up.
- **Done when:** the generated payload validates against
  `src/testdata/schemas/create-booking.schema.json`, the live `POST /booking` accepts it, and the
  run still passes with the key removed.

### 2. RCA agent

Explains a failure: root cause and concrete fixes.

- Create a folder with a spec holding **one passing and one deliberately failing test**, so the
  agent has a real failure to analyse on every run.
- Fills the existing `RcaVerdict` shape. Publishes into the **AI Verdict** tab.
- **Done when:** the failing test produces a verdict naming the actual assertion that failed, and
  the passing test produces none.

### 3. Bug triage

Assigns severity and priority to each failure.

- `RcaVerdict.severity` and `.priority` already exist and already render. Decide and state whether
  this is a separate agent or additional fields on the RCA call, then justify the choice. One call
  is cheaper and keeps the two consistent; two calls keep the prompts focused.
- **Done when:** every failure carries a severity from the allowed enum and a priority, and an
  unavailable LLM leaves both as an explicit "not assessed" rather than a guessed default.

### 4. Flaky analysis

Finds tests that changed status between builds.

- **The deterministic diff already works. Do not rewrite it.** Add only the optional LLM summary
  that `FlakyResult.summary` already has a slot for.
- **Done when:** two runs with a deliberately flaky test produce a summary naming it, and the
  existing counts are unchanged.

### 5. Anything after that

The factory is the deliverable. Prove it by adding a sixth agent as configuration only, with no new
transport code.

## Hard constraints

- **No test may pass or fail based on model output.** Assert on schema validity and status codes,
  never on generated prose. A test whose result depends on a sampled token is not a test.
- **The suite must stay green with no API key, offline, and in CI.** That is the default path, not
  an edge case. CI has no key.
- **Do not weaken existing tests** to accommodate the layer. The suite is currently 31 passing.
- **Never commit a key**, and never send repository source or credentials to a provider.
- No new runtime dependency without saying what it does that `fetch` plus the installed Ajv cannot.

## Non-goals

Do not build a prompt-management UI, a vector store, or a cost dashboard. Do not auto-file bugs to
a real tracker. Do not touch `src/tests/e2e/` or the API levels 01 to 05.

Self-healing locators were originally listed here as a non-goal and were later built anyway, at the
user's direction. The constraint that survived is the one that mattered: it **suggests and verifies,
it never rewrites a spec**. A selector a model invented and nobody checked is worse than the failure
it replaces, because it turns a test green while it asserts on the wrong element.

## Working agreement

1. **Discuss and plan first.** Produce the plan and stop. Name the files, the `LLMClient` interface,
   the factory signature and the config keys, and flag the decisions you want made.
2. Confirm the `src/ai` deletion question before writing anything: restore from `HEAD`, or replace.
3. Build one agent at a time and stop for review after each.
4. After every agent: `npx tsc --noEmit` clean, and the full suite green **both** with and without
   an API key. Report both.
5. Say plainly what you verified against a live model and what you only wired up.

---

# Appendix: how this was actually built

Written after the fact. The prompt above was the plan; this is what the plan met.

## The prompt's own history

The original request was dictated in one paragraph that mixed five deliverables, a provider list and
a working agreement. Rewriting it into the brief above changed three things:

1. **Grounding beat description.** Reading `CustomReporter.ts` first turned out to matter more than
   any rewording. It already imported all three `src/ai` modules, already gated on `hasApiKey()`,
   and already rendered an **AI Data** tab from attachments and an **AI Verdict** tab from
   `RcaVerdict`. So two of the five "agents to build" were partly built: the flaky diff already
   worked, and triage was two fields that already rendered.
2. **Each agent got a testable definition of done**, so "is it finished" stopped being a matter of
   opinion.
3. **Two constraints were added that the original could not have known it needed**: no test may pass
   or fail on model output, and the suite must stay green with no key.

## Order of construction, and what each step taught

| Step | What shipped | What it taught |
|:-----|:-------------|:---------------|
| 1 | `providers.ts`, `LLMClient`, `agentFactory`, data generator | Five providers is two dialects. The seam prediction held: the generator reached the report with **zero** reporter changes. |
| 2 | Ponytail pass over `src/ai` | The problem was not bloat but **exported surface with no importer**: 8 of 17 exports had no external caller, and 4 symbols were genuinely dead. |
| 3 | RCA and flaky agents, demo specs | Deliberate failures need gating, and flakiness has to be **deterministic** to be demonstrable. |
| 4 | Self-healing locators | A unique match is not a usable one. |

## Three things that only showed up by running it

**The schema retry is load-bearing.** DeepSeek returned an `additionalneeds` string longer than the
schema's 60-character cap. The factory fed the exact validation error back and the retry was clean.
The same guard has since fired on the flaky summary's length cap and the RCA fixes list. Without it
a malformed payload would have reached the API and surfaced as a confusing 500.

**"Resolves to one element" is not verification.** The first self-healing version reported four
verified candidates and the fill still failed with `Element is not an <input>`. A heading matches
uniquely too. Verification now takes a `requires` option and rejects a candidate that cannot take
the intended action, rather than ranking it lower.

**Project scoping bites every time a directory is added.** `src/tests/aiTest/` was first invisible
(`chromium` ignored it, `ai` had no browser), then pointed at the wrong host (`ai`'s `baseURL` is
the API). Both were the same lesson the API levels taught earlier: a new test directory needs its
project decided at the same moment it is created.

## What was deliberately not built

- **Auto-rewriting specs from healed locators.** Suggest and verify only. A selector a model invented
  and nobody checked turns a test green while asserting on the wrong element.
- **A separate triage agent.** `RcaVerdict` already carried `severity` and `priority`. One call is
  cheaper and keeps the rating consistent with the explanation that justified it.
- **Rewriting the flaky diff.** It already worked deterministically and needed only its summary.
- **Verifying the four non-DeepSeek providers.** They are implemented and typed, but only the
  DeepSeek path has met a live endpoint, and the docs say so rather than implying five-way coverage.
