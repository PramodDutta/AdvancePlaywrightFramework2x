# Lesson 03 - The masked lexer

Guide: `docs/quality-gates-tutorial.html`, chapter 03.  
You are building: `exercises/03-lexer/lexer.mjs`

## Exercises

1. **Implement lex()**  
   Comment bodies and string contents blanked, every offset and newline preserved, comments and strings recorded with their line.

2. **Break it on purpose**  
   Feed it `const re = /\/\//;` and a line with a division. If the rest of the file vanishes, your regex detection is wrong.

3. **Diff the copies**  
   Print the masked copy next to the original for your largest page object. No line number may move.

4. **Map your own layers**  
   Write a `layerOf()` for your directory names. Anything landing in `other` is a directory your rules will silently skip.

## Check your work

```bash
node exercises/check.mjs 03
```

Passes when: waitForTimeout survives once, quotes kept, code after a regex literal intact.
