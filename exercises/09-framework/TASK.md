# Lesson 09 - Your non-negotiables

Guide: `docs/quality-gates-tutorial.html`, chapter 09.  
You are building: `rules/framework-patterns.rules.mjs`

## Exercises

1. **Number your conventions doc**  
   How many items could be a regex over imports? Write those three first.

2. **Tag each rule**  
   Give every rule an `nn` field naming the item it enforces, so a finding traces to a sentence instead of an opinion.

3. **Mine your incidents**  
   Find a bug your team actually shipped that a convention would have prevented. Put the incident in the rule's why.

4. **Justify every exclusion**  
   One sentence each. If you cannot write it, the exclusion is probably a rule that is wrong.

## Check your work

```bash
node exercises/check.mjs 09
```

Passes when: rules carry nn fields and at least one declares an exclusion.
