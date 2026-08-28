---
name: feature-explainer
description: Builds a two-part explainer page for a change that just shipped in this repo - a plain-language ELI5 walkthrough, plus an appended hand-drawn Excalidraw-style whiteboard diagram sized for a team standup. Use when the user says "eli5 this", "explain what we just built", "make an explainer page", "whiteboard diagram", "excalidraw diagram", "explain this feature to my team", or asks to document a change visually after it lands. Differentiator - this explains a real change in THIS codebase, reading the actual diff, and outputs one self-contained HTML file to the scratchpad that is never committed; sketch-diagram and diagram-architect instead render a standalone diagram image from an abstract topic.
---

# Feature explainer

Turns a shipped change into one HTML page a beginner can follow and a team can read on a screen share.

The page has two halves, always both:
1. **ELI5 narrative** - short sections, big type, one idea each, a diagram per idea.
2. **Whiteboard** - a hand-drawn SVG board appended at the end, zoned for standup use.

## Step 0 - Get the real facts first

Never invent the story. Read what actually changed:

```bash
git status --short
git diff                                  # unstaged
git diff --stat HEAD                      # everything vs last commit
git log --oneline -5
```

For each changed file, read it. Then answer these four before writing anything:

- **What did the user gain?** State it without jargon.
- **What was the non-obvious bit?** The thing that surprises people. This becomes the centrepiece.
- **What nearly broke, or did break?** Bugs caught during the work are the most valuable content.
- **How do we know it works?** Find the command that would fail if the feature were broken.

If you cannot answer the second or third from the diff, ask the user rather than padding with generic content.

## Step 1 - Choose 5 to 8 beats

One idea per section. A beat earns its place only if a reader would be lost without it. Order them so each depends only on beats above it.

Reliable spine, adapt freely:
`what it does` -> `the raw material` -> `the design choice` -> `the non-obvious bit` -> `failure behaviour` -> `the trap` -> `the proof`

## Step 2 - Build the page

Copy the template, then replace the content between the marked blocks:

```bash
SCRATCH="<the scratchpad dir from your system prompt>"
cp .claude/skills/feature-explainer/assets/explainer-template.html "$SCRATCH/<slug>-eli5.html"
```

The template ships a working three-state theme system, the type scale, panels, and the whiteboard shell. Do not rewrite its CSS. Add tokens only if a new one is genuinely needed.

Writing rules for the ELI5 half:
- Short sentences. Second person. Name things as the reader would.
- Every claim traceable to the diff. Real file names, real commands, real output.
- One `.punch` line per major beat, at most. It carries the lesson.
- Show wrong-vs-right side by side where a misconception exists (`.compare`).
- Never lorem, never a placeholder shipped as final.

## Step 3 - Draw the whiteboard

Read `references/hand-drawn-svg.md` before writing any SVG path. It has the rough-box, arrow, sticky-note, marker-circle and highlight recipes, plus the layout maths.

Three zones, dashed dividers between:
1. **The wiring** - boxes and arrows for what now talks to what.
2. **The why** - the non-obvious bit, usually a wrote-vs-actually-runs comparison.
3. **The trap** - what breaks, on which machine, and the one-line fix on a sticky note.

Numbered zone labels are correct here because the zones are a real reading sequence. Do not number anything that is not a sequence.

## Step 4 - Verify, fix, re-verify

Mandatory. Do not report done before this passes.

```bash
node .claude/skills/feature-explainer/scripts/verify-explainer.js "$SCRATCH/<slug>-eli5.html"
```

It renders both themes and fails on: horizontal page overflow, an unloaded handwriting font, a JS error, or a diagram wider than its container (the clipping bug - right-hand boxes vanish behind a scrollbar).

Then **look at the screenshots it writes**, do not trust the exit code alone. Read the full-page shot and the board close-up. Check for overlapping SVG text, a stroke floating away from its box, and text running past a sticky note edge. Fix and re-run until clean.

## Step 5 - Report

Give the user the file path, the ELI5 in a few lines of chat, and anything you found while writing that they did not already know. Say plainly that the file is in the scratchpad and not committed.

## Failure modes

| Symptom | Cause | Fix |
|---|---|---|
| Right-hand boxes clipped | SVG wider than the reading column | Widen the section, see the breakout rule in the template |
| Handwriting renders as a system font | Google Fonts link edited or offline | Restore the link; the verify script catches this |
| Diagram text overlaps | Hand-tuned coordinates collided | Re-space in the SVG; there is no autolayout |
| Page scrolls sideways | A wide element without a scroll container | Wrap it, `overflow-x: auto` |
| Sections feel padded | Beats that did not earn their place | Cut to the ones a reader needs |
