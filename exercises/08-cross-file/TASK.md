# Lesson 08 - Seeing across files

Guide: `docs/quality-gates-tutorial.html`, chapter 08.  
You are building: `exercises/08-cross-file/find-unused.mjs`

## Exercises

1. **Find the dead surface**  
   Every value export in utils, api and testdata that nobody imports.

2. **Handle the string reference**  
   Remove the `stringRefs` check and watch your custom reporter get reported as unused.

3. **Exclude the types**  
   Count value kinds only. Include interfaces and you are detecting TypeScript, not dead code.

4. **Name the intentional abstractions**  
   Which two files in your repo would a stranger wrongly simplify? Write that into the pack's header.

## Check your work

```bash
node exercises/check.mjs 08
```

Passes when: ADDITIONAL_NEEDS found, BookingApi and BookingDates and the reporter excluded.
