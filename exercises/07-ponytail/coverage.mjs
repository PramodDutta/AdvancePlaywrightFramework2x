/**
 * Exercise 07 - the metric that decides whether a comment is narration.
 *
 * `coverage(prose, code)` takes two Sets of lowercase words and returns how
 * much of `prose` the `code` already says, between 0 and 1.
 *
 * The naive version divides by `Math.min(prose.size, code.size)`. Write that
 * one first and run the checker: it reports the real comment from this repo
 * that the naive version flags, which is the single most useful line in the
 * file it lives in.
 *
 * Then fix it. The question is not "do these share words", it is "does the
 * comment add anything the code does not have", and that decides the
 * denominator.
 *
 * Run:  node exercises/check.mjs 07
 */
export function coverage(prose, code) {
    // TODO: return the share of `prose` that `code` already covers.
    return 0;
}
