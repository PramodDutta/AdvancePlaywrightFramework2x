---
description: Update the README for whatever changed, then stage, commit, and push to main.
---

Ship the current work: bring `README.md` up to date with what changed, then commit and push.

Arguments: $ARGUMENTS (optional). `skip readme` commits and pushes without touching the README.

## 1. Find out what actually changed

```bash
git status --short
git diff
git diff --stat HEAD
git log --oneline -5
```

Read every changed and untracked source file. Do not describe a change you have not read.

## 2. Update the README

Skip this step only if `$ARGUMENTS` says so.

Match the existing house pattern exactly. Each architecture entry is:

- `**Concept:**` one paragraph on what the thing is
- `**Why:**` the problem it solves, ideally naming the failure it prevents
- `**Q&A — why use this?**` two or three real questions a new joiner would ask
- a fenced `mermaid` diagram when there is a flow worth seeing
- a short `ts` or `bash` block showing real usage

Then sweep the sections that silently rot:

- **Project Structure** tree: add every new file and directory
- **Environment Configuration**: any new env key, and whether it is required
- **Continuous Integration**: any new workflow step, and what breaks without it
- **Setup** / **Running Tests**: any new command
- **Tech Stack**: only genuinely new dependencies, checked against `package.json`

Rules: no em dashes anywhere. Every claim traceable to the code. Prefer a fact that prevents a bug
("`.env` is gitignored, so CI seeds it") over a restatement of the obvious.

## 3. Verify before committing

```bash
npx tsc --noEmit -p tsconfig.json
npx playwright test
```

Both must pass. If a test fails, stop and report it rather than committing red.

## 4. Commit and push

Stage the source, docs, and config that belong to this change. Do **not** stage generated output:
`tta-report/`, `reports/`, `logs/`, `test-results/`, `playwright-report/`, `.env`, or browser
"Save Page As" artifacts. Ask before staging anything you did not create and cannot explain.

```bash
git add <specific paths>
git status --short          # confirm nothing unexpected is staged
```

Commit message: a conventional-commit subject, then a body explaining **why**, not a file list.

```
feat: add .env support via a reusable config/env util

Reads credentials, product id, and guest details from .env through one
helper. The dotenv load lives in the module rather than the spec because
Babel hoists imports above it, which would compute credentials before the
file was read. CI now seeds .env from .env.example; without it the
fail-fast checks abort the whole run.
```

Never add a `Co-Authored-By:` trailer or a "Generated with" footer.

```bash
git push origin main
```

If the branch is not `main`, say so and confirm before pushing.

## 5. Report

Give the commit subject, the pushed SHA, and a one-line summary of the README changes. Mention
anything you deliberately left unstaged and why.
