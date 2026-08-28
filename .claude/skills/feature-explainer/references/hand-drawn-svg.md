# Hand-drawn SVG recipes

Shape recipes for the whiteboard. Read before writing any path. There is no autolayout: every
coordinate is hand-placed, so work down the canvas and keep a running note of what y you are at.

- [Canvas and zones](#canvas-and-zones)
- [Why the wobble matters](#why-the-wobble-matters)
- [Shapes](#shapes)
- [Layout maths](#layout-maths)
- [Checklist](#checklist)

## Canvas and zones

`viewBox="0 0 920 760"`, three zones separated by dashed dividers.

| Zone | y range | Divider below at |
|---|---|---|
| 1 the wiring | 70 - 270 | 286 |
| 2 the why | 300 - 530 | 548 |
| 3 the trap | 570 - 710 | none |

**Keep every x between 30 and 890.** Anything beyond clips. This is the single most common bug:
the right-hand column of boxes vanishes and nobody notices until someone opens the file.

Grow the viewBox height rather than cramming. Two roomy zones beat three squashed ones.

## Why the wobble matters

A perfect `<rect>` reads as a computer drawing. A path whose corners drift by 2 to 4 units reads
as a hand. That difference is the whole aesthetic, so never fall back to `<rect>` for a box.
`<rect>` stays correct for exactly two things: the highlighter bar and full-bleed fills.

Drift by 2 to 4 units. More looks like a mistake, less looks like a rounding error.

## Shapes

**Rough box.** Four gentle curves, corners off by a few units, closed with `Z`.

```svg
<path class="ink" d="M40,340 C160,335 280,338 400,339
                     C403,378 402,418 400,452
                     C290,456 160,454 42,453
                     C37,418 38,378 40,340 Z"/>
```

**Sticky note.** Same shape, `.fill-sticky`. Reserve it for a value or a fix, never for a concept.

```svg
<path class="fill-sticky" d="M40,116 C110,111 172,114 214,113
                             C218,152 216,190 215,214
                             C150,219 92,216 42,215
                             C38,180 39,150 40,116 Z"/>
```

**Arrow.** A curved shaft plus a separate two-stroke head. One `path` for each; a single path
makes the head bend with the shaft and it looks wrong.

```svg
<path class="blue" d="M224,166 C258,160 276,170 306,165"/>
<path class="blue" d="M294,157 l14,8 l-14,9"/>
```

Fanning one source to three targets: keep the three shafts leaving from the same x, arriving at
each target's left edge.

```svg
<path class="blue" d="M510,150 C548,132 574,124 606,120"/>
<path class="blue" d="M510,166 C550,164 574,166 606,166"/>
<path class="blue" d="M510,184 C548,200 574,208 606,212"/>
```

**Marker circle.** An open loop that overshoots the box it rings. Overshoot is the point: a loop
that fits neatly looks like a border.

```svg
<path class="amber" d="M306,112 C400,100 500,106 516,150
                       C528,196 430,228 372,224
                       C318,220 300,196 306,150"/>
```

**Highlighter bar.** The one legitimate `<rect>`. Sits behind text, so place it *before* the
`<text>` in document order. Width roughly `0.52 * fontSize * characters`.

```svg
<rect class="hl-bar" x="506" y="404" width="210" height="20" rx="5"/>
<text class="hand" x="512" y="420" font-size="15">import credentials</text>
```

**Dashed divider.**

```svg
<path class="ink-2" d="M34,286 C240,281 500,289 886,283" stroke-dasharray="9 11"/>
```

**Tick and cross.** Draw, never type. A typed check renders as an emoji and breaks the look.

```svg
<path class="green" d="M300,650 l12,13 l22,-27"/>
<path class="red"   d="M640,640 l26,26 M666,640 l-26,26"/>
```

## Layout maths

Text has no box in SVG, so it will happily sit on top of a stroke. Budget space instead:

- Line height: **24 units** at `font-size="15"`, **26** at 17.
- First text baseline: box top **+ 30**. Each line after: **+ 24**.
- Text left edge: box left **+ 22**.
- A box holding a title and two lines needs **~95 units** of height.
- Zone label to first box top: **20 units**.
- Between stacked boxes: **≥ 12 units** so the wobble does not touch.

Width check before you commit a line, since nothing wraps:

```
approx text width = 0.52 * font-size * character count
```

`"e2e-checkout-env.spec.ts"` at 15 is 24 chars, so about 187 units. A box at x=614 needs to reach
at least 614 + 22 + 187 + 22 = 845. Rounding to 878 leaves real margin. Undershoot and the text
runs straight out of the box.

## Checklist

- [ ] Every x within 30 to 890
- [ ] No `<rect>` except highlighter bars and fills
- [ ] Arrow heads are separate paths from shafts
- [ ] Highlighter bars precede their text in document order
- [ ] Every box wide enough for its longest line, by the formula above
- [ ] Ticks and crosses drawn as paths, no emoji
- [ ] Colours come from `--mk-*` and `--marker` tokens, never literals, so dark mode works
- [ ] Board close-up screenshot actually opened and read
