# Lesson 12 - The PR gate, and shipping

Guide: `docs/quality-gates-tutorial.html`, chapter 12.  
You are building: `.github/workflows/quality-gate.yml`

## Exercises

1. **Read every finding of the first full run**  
   Group them by rule and fix the rules, not the code. A rule firing 67 times has found a class it does not understand.

2. **Build the selftest**  
   Two fixtures, one slop-ridden and one clean. Add one rule id at a time until every rule you own is covered.

3. **Open a deliberately bad PR**  
   The comment should tell you what to do without opening the job log.

4. **Write your baseline down**  
   Three numbers and one sentence about who pays them off. Do not sweep forty files to get a number to zero.

5. **Six weeks later**  
   Which rule has been waived the most? Either its why is weak or the rule is wrong. Fix whichever it is.

## Check your work

```bash
node exercises/check.mjs 12
```

Passes when: fetch-depth 0, changed-files scope, the selftest runs in CI, one sticky comment.
