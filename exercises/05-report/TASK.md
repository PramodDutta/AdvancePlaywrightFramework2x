# Lesson 05 - The report and the CLI

Guide: `docs/quality-gates-tutorial.html`, chapter 05.  
You are building: `quality/gate.mjs and quality/engine/report.mjs`

## Exercises

1. **Four formats, one pipeline**  
   console, hook, markdown, json. Same findings, four renderings, so no two reports can disagree.

2. **Print why and fix once per rule**  
   Not once per finding. Eleven copies of the same paragraph is how a report teaches people to skim past it.

3. **Scope the report, not the scan**  
   A change touching only the README must report nothing and exit 0.

4. **Separate failure from crash**  
   Throw inside a detector. The CLI must exit 2 with a stack trace, never exit 1 with a clean report.

## Check your work

```bash
node exercises/check.mjs 05
```

Passes when: json/console/hook/markdown all work and an empty scope exits 0.
