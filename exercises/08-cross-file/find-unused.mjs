/**
 * Exercise 08 - answering a question one file cannot.
 *
 * `findUnusedExports(files, index)` returns an array of
 * `{ file, name }` for every VALUE export in `src/utils/`, `src/api/` and
 * `src/testdata/` that no other file imports.
 *
 *   files   SourceFile records from quality/engine/source.mjs. Each has
 *           `.path`, `.layer`, and `.exports` of { line, name, kind }.
 *   index   from quality/engine/repo-index.mjs. You want:
 *             index.consumersOfExport(path, name) -> string[]
 *             index.stringRefs                    -> Set of paths named in a
 *                                                    string literal somewhere
 *
 * Two traps the checker will spring:
 *   1. A module can be in use without an import. `playwright.config.ts` names
 *      the custom reporter as a string. Skip anything in `index.stringRefs`.
 *   2. An exported `interface` is often the published return type of an
 *      exported function. Count only value kinds: const, let, var, function,
 *      class. Include types and you are detecting TypeScript, not dead code.
 *
 * Run:  node exercises/check.mjs 08
 */
export function findUnusedExports(files, index) {
    // TODO: your implementation.
    return [];
}
