# Lesson 09 - Your non-negotiables

Builds: `rules/framework-patterns.rules.mjs`

Most teams already have this document. Here it is `.github/copilot-instructions.md`
and it opens with nine numbered non-negotiables. It was accurate, well written,
and had no way to notice when something ignored it.

Every rule in this pack carries an `nn` field naming the item it enforces, so a
finding traces back to a sentence instead of an opinion.

```js
{
    id: 'framework/dotenv-in-spec',
    nn: 5,
    severity: 'error',
    detect: 'regex',
    exclude: ['src/config/env.ts', 'playwright.config.ts'],
    options: { pattern: /\bdotenv\.config\s*\(/ },
    why: 'Non-negotiable 5, and a bug this repo already hit once: imports are hoisted above the call, so any module that reads `process.env` at load time sees nothing. It fails as a missing credential, far from the cause.',
    fix: 'Import `@config/env` instead. Importing it loads `.env` once, before anything reads it.',
}
```

That is the best `why` in the system, because it names a bug the team actually
had. Go through your incident history before writing this pack: a rule that
prevents a failure someone remembers never gets argued with.

Two detectors carry most of the pack. `importShape` answers "may this layer
import that, and by which specifier?"; `fileMissing` answers "does this file
never do something it must?".

**State exclusions in the rule, never in a reviewer's head.** API specs under
`apisTests/01_restfulbooker_raw/` are excluded from the fixture rule because
they exist to teach the raw `request` API. An exclusion living only in someone's
memory becomes an argument the first time a newcomer trips over the rule.

---

Exercise and checker: `exercises/09-framework/TASK.md`, `node exercises/check.mjs 09`.
