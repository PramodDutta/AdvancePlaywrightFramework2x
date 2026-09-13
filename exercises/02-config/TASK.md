# Lesson 02 - The config and its profiles

Guide: `docs/quality-gates-tutorial.html`, chapter 02.  
You are building: `quality/gate.config.mjs`

## Exercises

1. **Write your include and exclude globs**  
   Which directories in your repo are deliberately different? Write the reason next to each exclusion.

2. **Name four profiles**  
   `hook`, `commit`, `ci`, `audit`. Decide before writing any rule what should block an agent mid-edit and what should only ever be advice.

3. **Budget the warnings**  
   Give the `ci` profile a per-gate warning cap. Per change, never per repo: a per-repo budget fails on day one and is deleted by day three.

4. **List three rules no linter could hold**  
   Questions your team asks in review that depend on your fixture module. Those are your first rules.

## Check your work

```bash
node exercises/check.mjs 02
```

Passes when: four profiles exist, ci carries budgets, audit fails on nothing.
