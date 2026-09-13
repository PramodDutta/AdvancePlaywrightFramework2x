# Lesson 04 - Your first rule, as data

Guide: `docs/quality-gates-tutorial.html`, chapter 04.  
You are building: `exercises/04-first-rule/my-rules.mjs`

## Exercises

1. **Write the rule**  
   `exercise/no-page-pause`, severity error, the `regex` detector. Four lines plus a why and a fix.

2. **Check which copy it reads**  
   The fixture mentions `page.pause()` in a block comment as well as calling it. A passing rule reports one, not two.

3. **Write the why twice**  
   Once as "this is bad practice", once naming what breaks. Show both to a colleague and ask which they would act on.

4. **Typo the detector name**  
   Confirm your runner throws rather than skipping the rule silently.

## Check your work

```bash
node exercises/check.mjs 04
```

Passes when: the rule fires exactly once and ignores the comment.
