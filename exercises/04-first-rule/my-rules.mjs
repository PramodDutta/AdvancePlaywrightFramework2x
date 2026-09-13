/**
 * Exercise 04 - your first rule, as data.
 *
 * This is a real rule pack. The checker loads it with the real engine and runs
 * it over `exercises/fixtures/tricky.ts.txt`, so whatever you write here works
 * exactly as it would in `rules/`.
 *
 * Write ONE rule that reports `page.pause()` and nothing else:
 *
 *   - id        'exercise/no-page-pause'
 *   - severity  'error'
 *   - detect    'regex'          (see quality/engine/detectors.mjs)
 *   - options   { pattern: ... } and remember which copy of the source the
 *               `target` option reads by default
 *   - why       what breaks if this ships. Name it concretely.
 *   - fix       what to do instead.
 *
 * The fixture mentions `page.pause()` inside a block comment as well as calling
 * it for real. A passing rule reports the call and ignores the comment.
 *
 * Run:  node exercises/check.mjs 04
 */
export default {
    gate: 'exercise',
    rules: [
        // TODO: your rule here.
    ],
};
