# Lesson 10 - Waivers and budgets

Guide: `docs/quality-gates-tutorial.html`, chapter 10.  
You are building: `quality/engine/run.mjs`

## Exercises

1. **Require a reason**  
   A bare `// gate-allow` must itself be reported as an error.

2. **Keep waived findings visible**  
   List them under their reasons. Suppression you cannot see is indistinguishable from a rule that never ran.

3. **Write a real one**  
   Waive a real finding in your repo. Read the reason back. Would it convince you in six months?

4. **Tune from evidence**  
   Set your ci budgets one below your worst branch, open a PR, watch it fail, then adjust.

## Check your work

```bash
node exercises/check.mjs 10
```

Passes when: an unexplained waiver is reported and an explained one suppresses its finding.
