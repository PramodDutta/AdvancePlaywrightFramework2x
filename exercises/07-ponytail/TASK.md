# Lesson 07 - Directional coverage

Guide: `docs/quality-gates-tutorial.html`, chapter 07.  
You are building: `exercises/07-ponytail/coverage.mjs`

## Exercises

1. **Write the naive version first**  
   Divide by `Math.min`. Run the checker and read which real comment it flags.

2. **Fix the denominator**  
   The question is whether the comment adds anything, so the comment is the denominator, always.

3. **Cut a real spec**  
   Delete every log line that repeats the step name around it. Re-run and open the report. Did you lose anything you needed?

4. **Check your precondition**  
   If your `trace` is `on-first-retry`, write down which rules in this pack you must disable, and why.

## Check your work

```bash
node exercises/check.mjs 07
```

Passes when: narration scores 0.6 or more, the explanatory comment scores under 0.3.
