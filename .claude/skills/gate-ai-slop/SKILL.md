---
name: gate-ai-slop
description: Quality gate asking "was this generated, skimmed, and shipped?" Detects hallucinated APIs, assertions that check nothing, `any` used to silence the compiler, comments restating code, and documentation claiming results nobody ran. Use before raising a PR, or when reviewing a diff produced by an AI coding agent.
---

# Gate 1: ai-slop

> **Was this generated, skimmed, and shipped?**

Generated code fails differently from hand-written code. It is syntactically clean, confidently
worded, and wrong in ways that read as fine. This gate looks for the specific tells.

## Checks

**1. Invented APIs.** A method, option or field that does not exist. Grep the symbol in
`node_modules/**/*.d.ts` or the source. If it cannot be found, it was imagined.

```bash
grep -rn "suspiciousMethod" node_modules/@playwright/test/ src/ | head
```

**2. Assertions that check nothing.** The worst kind, because they are green.

- `expect(x).toBeTruthy()` where `x` is always truthy
- A test with no `expect` at all (`playwright/expect-expect` catches this)
- An assertion after the test's real work has already been `await`ed away
- **A test asserting on LLM output.** In this repo that is a hard failure: assert on schema
  validity, HTTP status, or a verified locator, never on generated prose.

**3. `any` used as a mute button.** `as any`, `@ts-ignore`, `eslint-disable` with no reason on
the line. Each one is a claim that the type system is wrong. Make the author say why.

**4. Comments that restate the code.** `// increment the counter` above `counter++` is filler.
A comment earns its place by saying *why*, or by recording something the code cannot
(a verified status code, a provider quirk, a measured number).

**5. Copy-paste of something that already exists.** Before accepting a new helper, grep
`src/utils/` and `src/config/`. This repo already has `ApiHelper`, `SchemaValidator`,
`DataGenerator`, `UtilElementLocator`, `logger`, `visualStep`, `selfHeal`.

**6. Dead exports.** A symbol exported and never imported. This exact audit found 8 of 17 dead
exports in `src/ai` once:

```bash
grep -oE '^export (async )?(function|const|class|interface|type) [A-Za-z_]+' src/**/*.ts \
  | awk '{print $NF}' | while read s; do
      n=$(grep -rl "\b$s\b" src --include='*.ts' | wc -l)
      [ "$n" -le 1 ] && echo "  DEAD: $s"
    done
```

**7. Claims nobody verified.** Documentation, commit messages or PR bodies asserting a number, a
status code or a behaviour that was never run. Every factual claim needs a command behind it.
"The API returns 400" is slop if the API actually returns 500, and it usually does.

## Evidence required

```bash
npm run verify     # typecheck, lint, full suite
```

Paste the real output. A gate report that says "tests pass" without the counts has itself been
skimmed and shipped.

## Verdict

`FAIL` on any invented API, any assertion that cannot fail, any test riding on model output, or
any documented claim that was not run. Everything else is a note, not a block.
