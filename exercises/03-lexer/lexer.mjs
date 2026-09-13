/**
 * Exercise 03 - the masked lexer.
 *
 * Implement `lex(text)`. It walks the source once and returns:
 *
 *   masked   a copy of `text` where comment BODIES and string CONTENTS are
 *            replaced with spaces. Same length as the input. Every newline
 *            preserved, so every offset still maps to its original line.
 *   comments [{ line, kind: 'line' | 'block' | 'jsdoc', text }]
 *   strings  [{ line, quote, value }]
 *
 * Three things the checker will try to break:
 *   1. `page.waitForTimeout` inside a comment must NOT survive into `masked`.
 *   2. The same call inside a string literal must NOT survive either, but the
 *      quote characters themselves must stay.
 *   3. `const re = /\/\//;` must not be read as a comment. A slash only starts
 *      a regex literal where a value is expected; get it wrong and the rest of
 *      the file disappears.
 *
 * Run:  node exercises/check.mjs 03
 */
export function lex(text) {
    // TODO: replace this stub.
    //
    // Sketch:
    //   const out = new Array(text.length);
    //   walk i from 0, tracking `line`
    //   on '//'  -> consume to newline, record the comment, blank the body
    //   on '/*'  -> consume to '*/',    record the comment, blank the body
    //   on a quote -> consume to the matching quote honouring '\\' escapes,
    //                 record the string, blank the body, KEEP both quotes
    //   on '/' where a value is expected -> consume the regex literal as code
    //   otherwise -> copy the character through
    return { masked: text, comments: [], strings: [] };
}
