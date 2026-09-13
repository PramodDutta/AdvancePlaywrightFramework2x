/**
 * ponytail - "does the run already record it?"
 *
 * Named after this repo's own `booking-crud-end-to-end.ponytail.spec.ts`, which
 * covers the same lifecycle as its neighbour in 33 lines instead of 73. The
 * README keeps both on purpose so the diff is readable, and the cut list in it
 * is the source of these rules:
 *
 *   test.step around single calls   -> the trace lists every request, with timings
 *   testInfo.attach of the body     -> the same trace already holds it
 *   ten log.info lines              -> each restated its own step name
 *
 * The cuts are only safe because `playwright.config.ts` sets `trace: 'on'` and
 * `video: 'on'` for every test, not just retries. Turn tracing off and this
 * whole pack should be turned off with it: the attachments stop being redundant.
 *
 * What this pack never touches: assertions, and test granularity. Every
 * `expect` in the ponytail spec survived, and three tests stayed three tests
 * because `describe.serial` reports each stage separately. That is a reporting
 * decision, not machinery.
 */
export default {
    gate: 'ponytail',
    rules: [
        {
            id: 'ponytail/step-wraps-single-call',
            title: 'test.step wraps a single statement',
            severity: 'warn',
            detect: 'callWrapsFewStatements',
            specsOnly: true,
            options: { call: /\btest\.step\s*\(/, maxStatements: 1 },
            why: 'The trace already shows that call, with its timing and its payload. The wrapper adds a report row and four lines to say it again.',
            fix: 'Drop the wrapper and keep the call. Reserve `test.step` for a group of statements that genuinely reads as one stage.',
        },
        {
            id: 'ponytail/log-restates-step-name',
            title: 'Log line repeats the step name',
            severity: 'warn',
            detect: 'stepLogEcho',
            specsOnly: true,
            options: { minOverlap: 0.5 },
            why: 'The step name is already in the HTML report and the trace. The log line is the same sentence a third time, in a place nobody looks first.',
            fix: 'Delete the log. Log what the report cannot show: a generated id, a chosen variant, a boundary value.',
        },
        {
            id: 'ponytail/log-restates-next-line',
            title: 'Log line narrates the call under it',
            severity: 'warn',
            detect: 'echoesNeighbour',
            // Specs and page objects only. The whole premise is that the trace
            // already recorded it, and the trace records page actions and HTTP
            // traffic - not what a helper module did internally. Applied to
            // `UtilElementLocator`, whose entire job is logging every action,
            // the rule inverts into nonsense.
            layers: ['spec', 'page'],
            options: { source: 'strings', anchor: /\blog(?:ger)?\.(?:info|debug|warn)\s*\(/, within: 2, minOverlap: 0.6 },
            why: '"Creating booking" above `createBooking()` is the code read aloud. It doubles the file length of a spec and adds nothing to a failure report.',
            fix: 'Log the values, not the intent: `log.info({ bookingId })` after the call beats `log.info("Creating booking")` before it.',
        },
        {
            id: 'ponytail/attaches-what-the-trace-holds',
            title: 'Attaches a payload the trace already carries',
            severity: 'warn',
            detect: 'regex',
            specsOnly: true,
            options: { pattern: /\btestInfo\.attach\s*\(/ },
            why: 'With `trace: on`, every request and response body is already in the trace viewer, indexed and searchable. An attachment is a second copy in the report directory.',
            fix: 'Open the trace. Attach only something the trace cannot hold: a diff you computed, a file you generated.',
        },
        {
            id: 'ponytail/explicit-screenshot-in-spec',
            title: 'Manual screenshot in a spec',
            severity: 'warn',
            detect: 'regex',
            specsOnly: true,
            options: { pattern: /\bpage\.screenshot\s*\(/ },
            why: 'The config already captures screenshots on failure and video for every test. A manual screenshot on the happy path is an artefact nobody opens.',
            fix: 'Use `visualStep` from `@utils/visualStep`, which is gated behind ATTACH_SCREENSHOTS, or rely on the failure screenshot.',
        },
        {
            id: 'ponytail/logs-what-it-asserts',
            title: 'Logs the status, then asserts it',
            severity: 'warn',
            detect: 'regex',
            layers: ['spec', 'page'],
            options: { pattern: /\blog(?:ger)?\.\w+\s*\([^;]*\.status\(\)/ },
            why: 'When the assertion fails, the failure message prints the actual status. When it passes, nobody reads the log. The line is never the thing that tells you.',
            fix: 'Delete the log and let the assertion report.',
        },
        {
            id: 'ponytail/manual-timing',
            title: 'Hand-rolled timing around a call',
            severity: 'info',
            detect: 'regex',
            specsOnly: true,
            options: { pattern: /\bDate\.now\(\)/ },
            why: 'The trace timeline already has the duration of every action and request, to the millisecond.',
            fix: 'Read it from the trace. Keep the timing only if you are asserting on it, which is a different thing entirely.',
        },
        {
            id: 'ponytail/describe-wraps-single-test',
            title: 'describe block around a single test',
            severity: 'info',
            detect: 'callWrapsFewStatements',
            specsOnly: true,
            options: { call: /\btest\.describe(?:\.serial|\.parallel)?\s*\(/, maxStatements: 1 },
            why: 'A grouping level in every report, for a group of one.',
            fix: 'Put the context in the test title and drop the wrapper. Keep `describe` where it carries a hook or `.serial`.',
        },
        {
            id: 'ponytail/ceremony-ratio',
            title: 'Too much spec per assertion',
            severity: 'warn',
            detect: 'metric',
            specsOnly: true,
            options: { metric: 'ceremonyRatio', max: 14, detail: 'machinery is outweighing the checks' },
            why: 'The ratio the ponytail rewrite moved: 73 lines to 33, same assertions. When it climbs, the file is mostly scaffolding.',
            fix: 'Ask of each line whether anything else in the run already records it. Steps, attachments, and logs usually go first.',
        },
    ],
};
