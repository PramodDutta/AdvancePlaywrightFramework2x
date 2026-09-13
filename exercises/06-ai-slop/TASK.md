# Lesson 06 - The ai-slop pack

Guide: `docs/quality-gates-tutorial.html`, chapter 06.  
You are building: `rules/ai-slop.rules.mjs`

## Exercises

1. **Implement callSites**  
   Print every test name in your largest spec with its statement count. A body of `null` means your arrow detection is wrong.

2. **Add the assertion rule**  
   Run it over your whole suite. Every hit is a test currently reporting green on something it never checks.

3. **Accept your own idioms**  
   Extend `required` with your project's assertion helpers and watch the false positives disappear.

4. **Learn the raw/masked distinction**  
   Write the empty-catch rule against masked code, find a documented catch in your repo, then switch to `raw` and watch the finding go away.

## Check your work

```bash
node exercises/check.mjs 06
```

Passes when: the pack exists and the selftest proves the assertion and empty-catch rules fire.
