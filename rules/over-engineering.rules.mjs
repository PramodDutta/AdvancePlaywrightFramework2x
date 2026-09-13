/**
 * over-engineering - abstraction bought before it was needed.
 *
 * The signal is almost always countable: how many callers does this have? A
 * helper with one caller is a function with extra steps. A base class with one
 * subclass is a rename. An export nobody imports is dead surface that still has
 * to be read, typed, and kept compiling.
 *
 * Most of these rules need the whole repo, not one file, which is why the
 * engine indexes every import before any rule runs.
 *
 * What this pack deliberately does not flag: `UtilElementLocator` and
 * `BasePage`. A wrapper whose job is to log every action is not indirection for
 * its own sake, and one base class one level deep is the framework's documented
 * shape. Over-engineering is an abstraction with no consumer, not an
 * abstraction you personally would not have written.
 */
export default {
    gate: 'over-engineering',
    rules: [
        {
            id: 'overeng/unused-export',
            title: 'Export with no importer',
            severity: 'warn',
            detect: 'unusedExport',
            options: {
                layers: ['util', 'api', 'config', 'testdata', 'page'],
                ignoreNames: ['default'],
                // Types only: an exported interface is often the published return
                // type of an exported function, so a consumer needs it importable
                // even when nothing imports it by name today. Values have no such
                // excuse.
                kinds: ['const', 'let', 'var', 'function', 'class'],
            },
            why: 'Public surface with no consumer. It still has to be read, kept type-correct, and considered on every refactor, and the first person to change it has no test telling them who cares.',
            fix: 'Delete it, or drop the `export` and keep it module-private until something outside actually needs it.',
        },
        {
            id: 'overeng/single-consumer-module',
            title: 'Shared module with one caller',
            severity: 'info',
            detect: 'singleConsumer',
            options: { layers: ['util', 'api'], minLines: 25 },
            why: 'It sits in a shared directory, so everyone pays the cost of finding it and keeping it general, and exactly one file benefits.',
            fix: 'Move it next to its caller. Promote it back to `@utils` on the day a second caller appears.',
        },
        {
            id: 'overeng/pass-through-method',
            title: 'Method forwards its arguments unchanged',
            severity: 'warn',
            detect: 'delegatingWrapper',
            layers: ['page', 'api', 'util', 'fixture'],
            why: 'A name in front of another name. It adds a stack frame, a place to look, and a thing to keep in sync, and changes nothing about the call.',
            fix: 'Call the underlying method directly and delete the wrapper. Keep it only when it adds logging, a default, or a narrower type.',
        },
        {
            id: 'overeng/deep-inheritance',
            title: 'Page object more than one level below BasePage',
            severity: 'error',
            detect: 'inheritanceDepth',
            layers: ['page'],
            options: { max: 1 },
            why: 'Every level is another file to open before you know what a locator resolves to. The framework is documented as `BasePage` plus one concrete page, and deeper hierarchies in a POM are where shared state starts hiding.',
            fix: 'Flatten it. Share behaviour through a helper the pages call, not through a class they inherit.',
        },
        {
            id: 'overeng/page-object-too-long',
            title: 'Page object too long',
            severity: 'warn',
            detect: 'metric',
            layers: ['page'],
            options: { metric: 'fileLines', max: 220 },
            why: 'A page object this size is usually two pages, or a page plus a workflow that belongs in a fixture.',
            fix: 'Split by the region of the page, or move multi-page journeys into a fixture that composes several page objects.',
        },
        {
            id: 'overeng/spec-too-long',
            title: 'Spec file too long',
            severity: 'warn',
            detect: 'metric',
            specsOnly: true,
            options: { metric: 'fileLines', max: 180 },
            why: 'With `fullyParallel: true` a long file is also a long critical path, and long files are where shared mutable state between tests accumulates.',
            fix: 'Split by feature. Shared setup belongs in a fixture, not at the top of the file.',
        },
        {
            id: 'overeng/module-does-too-much',
            title: 'Utility module exports many things',
            severity: 'info',
            detect: 'metric',
            layers: ['util'],
            options: { metric: 'patternCount', pattern: /^export\s+(?:async\s+)?(?:function|class|const|type|interface)\s/m, max: 8 },
            why: 'A module with a dozen exports has no single reason to change, so every consumer imports a grab bag and every change touches everyone.',
            fix: 'Split along the axis the names already suggest.',
        },
        {
            id: 'overeng/barrel-file',
            title: 'Barrel file',
            severity: 'info',
            detect: 'regex',
            include: ['src/**/index.ts'],
            options: { pattern: /export\s+(?:\*|\{[^}]*\})\s+from/ },
            why: 'Path aliases already give every module a short specifier, so a re-export layer buys nothing and costs import cycles and slower type-checks.',
            fix: 'Import from the module directly through its `@alias` path.',
        },
        {
            id: 'overeng/premature-generic',
            title: 'Generic type parameter in a helper',
            severity: 'info',
            detect: 'regex',
            layers: ['util', 'api'],
            options: { pattern: /\bexport\s+(?:async\s+)?function\s+\w+\s*<[A-Z]\w*(?:\s+extends\b[^>]*)?>\s*\(/ },
            why: 'Not wrong, but worth one look: a type parameter with a single concrete call site is a guess about a future caller.',
            fix: 'If every call site passes the same type, use that type. Generalise when the second one arrives.',
        },
    ],
};
