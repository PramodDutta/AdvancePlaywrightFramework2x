/**
 * ai-slop - the tells of code that was generated, skimmed, and shipped.
 *
 * None of these are syntax errors and none of them fail a test. That is exactly
 * why they need a gate: nothing else in the pipeline objects to a spec that
 * asserts nothing, or to forty lines of comment narrating twelve lines of code.
 * A reviewer objects, once, and then gets tired.
 *
 * The line this pack draws: a comment that carries information the code cannot
 * (why 201 and not 204) is valuable. A comment that restates the line under it
 * is a second thing to keep in sync, and it is always the one that rots.
 */
export default {
    gate: 'ai-slop',
    rules: [
        {
            id: 'slop/test-without-assertion',
            title: 'Test asserts nothing',
            severity: 'error',
            detect: 'blockMissing',
            specsOnly: true,
            options: {
                call: /\btest(?:\.only|\.fail|\.slow)?\s*\(/,
                required: /\b(?:expect|assert[A-Z]\w*|toHave\w+)\b/,
                requiredLabel: 'assertion (expect(...), toHave*, or an assert* page-object method)',
                skipIf: /\btest\.(?:skip|fixme)\b/,
            },
            why: 'A test with no assertion passes as long as nothing throws, so it reports green on a broken feature. It is the single most common shape of generated test.',
            fix: 'Add a web-first assertion for the outcome the test is named after, or call a page-object method whose name starts with `assert`.',
        },
        {
            id: 'slop/constant-assertion',
            title: 'Assertion on a constant',
            severity: 'error',
            detect: 'regex',
            options: { pattern: /\bexpect\s*\(\s*(?:true|false|\d+|['"`][^'"`]*['"`])\s*\)\s*\.\s*(?:toBe|toEqual)\s*\(/ },
            why: '`expect(true).toBe(true)` exercises nothing. It exists to make a test look finished.',
            fix: 'Assert against a value the system under test produced, or delete the line.',
        },
        {
            id: 'slop/weak-status-assertion',
            title: 'Status checked without a value',
            severity: 'warn',
            detect: 'regex',
            options: { pattern: /\bexpect\s*\([^)]*\.status\(\)\s*\)\s*\.\s*(?:toBeTruthy|toBeDefined|toBeGreaterThan)\b/ },
            why: 'Every HTTP status is truthy, 500 included. The assertion passes on the failure it was written to catch.',
            fix: 'Assert the exact status: `expect(response.status()).toBe(201)`.',
        },
        {
            id: 'slop/swallowed-error',
            title: 'Empty catch block',
            severity: 'error',
            detect: 'regex',
            // Matched against the raw text, not the masked code: a catch whose body
            // holds only `// Ignore read errors` is documented suppression, and the
            // comment is exactly what we want people to write. Only a genuinely
            // empty catch fires.
            options: { target: 'raw', pattern: /catch\s*(?:\([^)]*\))?\s*\{\s*\}/ },
            why: 'A swallowed failure turns a red test green. In a suite whose job is finding failures, this is the worst line you can write. A catch that explains itself in a comment is left alone; this is the silent kind.',
            fix: 'Let it throw, or catch it and assert on it. If a step is genuinely allowed to fail, say so in a waiver with the reason.',
        },
        {
            id: 'slop/not-implemented',
            title: 'Placeholder left in the code',
            severity: 'error',
            detect: 'regex',
            options: { pattern: /throw new Error\(\s*['"`](?:Not implemented|TODO|Unimplemented)/i },
            why: 'A generated skeleton that reached review. It will fail at runtime, in CI, at the least convenient moment.',
            fix: 'Implement it or remove it. A test that is not ready belongs behind `test.fixme`, which reports honestly.',
        },
        {
            id: 'slop/narrating-comment',
            title: 'Comment restates the line below it',
            severity: 'warn',
            detect: 'echoesNeighbour',
            options: { source: 'comments', within: 1, minOverlap: 0.6 },
            why: 'Two copies of one sentence, one of which the compiler checks. When the code changes, the comment lies.',
            fix: 'Delete it, or replace it with the part the code cannot say: why this value, which bug this guards.',
        },
        {
            id: 'slop/section-banner-comment',
            title: 'Arrange / Act / Assert banner',
            severity: 'warn',
            detect: 'regex',
            options: {
                target: 'comments',
                pattern: /^\s*(?:\/\/\s*)?(?:arrange|act|assert|setup|teardown|given|when|then|step\s*\d+)\s*[:.-]?\s*$/i,
            },
            why: 'Section labels describe the shape of a test everyone already recognises. They survive because nobody reads them.',
            fix: 'Delete the banner. If a test needs signposting to be followed, it is doing too much: split it.',
        },
        {
            id: 'slop/decorative-divider',
            title: 'Decorative divider comment',
            severity: 'warn',
            detect: 'regex',
            options: { target: 'comments', pattern: /^[=\-*_~#]{6,}$/ },
            why: 'Line noise that pads a file and tells a reader nothing.',
            fix: 'Delete it. A blank line separates things just as well.',
        },
        {
            id: 'slop/tutorial-voice',
            title: 'Comment written for a tutorial, not a codebase',
            severity: 'info',
            detect: 'regex',
            options: { target: 'comments', pattern: /\b(?:as you can see|in this example|we will now|let's (?:now|go|start)|first,? we|here we (?:are|will))\b/i },
            why: 'Second-person narration is a strong signal the text came from a model explaining itself rather than from someone documenting a decision.',
            fix: 'Rewrite as a statement about the code, or delete it.',
        },
        {
            id: 'slop/jsdoc-restates-signature',
            title: 'JSDoc parameter repeats its own name',
            severity: 'warn',
            detect: 'regex',
            options: { target: 'comments', pattern: /@param\s+\{?[^}\s]*\}?\s*(\w+)\s+(?:the\s+)?\1\s*$/im },
            why: '`@param page The page` costs a line and adds nothing TypeScript did not already state.',
            fix: 'Document the constraint instead (units, allowed range, what happens when it is empty), or drop the tag.',
        },
        {
            id: 'slop/emoji-in-source',
            title: 'Emoji in source',
            severity: 'warn',
            detect: 'regex',
            // CustomReporter renders a console and HTML report; the emoji there are
            // presentation, not narration, so the file is out of scope by name.
            exclude: ['src/utils/CustomReporter.ts'],
            options: { target: 'raw', pattern: /[\u{1F300}-\u{1FAFF}\u{2700}-\u{27BF}\u{2600}-\u{26FF}\u{2705}\u{274C}\u{2728}]/u },
            why: 'Decoration in log output and test titles. It breaks grep, console encodings, and report parsers that were never asked about it.',
            fix: 'Use words. Severity belongs in the log level, not in a character.',
        },
        {
            id: 'slop/comment-density',
            title: 'More comment than code',
            severity: 'warn',
            detect: 'metric',
            layers: ['spec'],
            options: { metric: 'commentDensity', max: 0.5 },
            why: 'Generated specs explain every line because the model is narrating its own reasoning. The signal-to-noise ratio of the file collapses.',
            fix: 'Keep the comments that record a decision. Delete the ones that restate the next line.',
        },
        {
            id: 'slop/duplicate-test-body',
            title: 'Test body duplicated in shape',
            severity: 'warn',
            detect: 'duplicateBlocks',
            specsOnly: true,
            options: { call: /\btest(?:\.only)?\s*\(/, minStatements: 4 },
            why: 'The same test copied with a different literal. Generated suites fill out coverage this way, and every one of them has to be maintained separately.',
            fix: 'Collapse into one parameterised test over a data array, or delete the copy that adds no new risk.',
        },
        {
            id: 'slop/generic-test-title',
            title: 'Test title says nothing specific',
            severity: 'warn',
            detect: 'regex',
            specsOnly: true,
            options: {
                target: 'raw',
                pattern: /\btest(?:\.\w+)?\s*\(\s*['"`][^'"`]*\b(?:should work|works correctly|works fine|successfully|properly|correctly|happy path|test\s*\d+)\b/i,
            },
            why: 'A failure report is only as useful as the title in it. "logs in successfully" and "logs in" carry the same information, and neither says what broke.',
            fix: 'Name the observable outcome: "rejects a locked-out user with an error banner".',
        },
    ],
};
