/**
 * repo-index.mjs - the cross-file half of the engine.
 *
 * Three of the four gates need to see past one file. "This helper has exactly
 * one caller" and "nothing imports this export" are the findings that actually
 * catch over-engineering, and neither is visible from inside the file that
 * defines it. This module resolves every import (path aliases included, read
 * from tsconfig.json rather than hard-coded) into a graph.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';

const CANDIDATE_SUFFIXES = ['', '.ts', '.tsx', '.mjs', '.js', '.json', '/index.ts', '/index.mjs'];

/** Reads the `paths` map out of tsconfig.json so aliases stay in one place. */
export function readAliases(root) {
    const file = join(root, 'tsconfig.json');
    if (!existsSync(file)) return {};
    try {
        const json = JSON.parse(readFileSync(file, 'utf8').replace(/^\s*\/\/.*$/gm, ''));
        const paths = json.compilerOptions?.paths ?? {};
        const aliases = {};
        for (const [pattern, targets] of Object.entries(paths)) {
            aliases[pattern.replace(/\*$/, '')] = targets[0].replace(/\*$/, '');
        }
        return aliases;
    } catch {
        return {};
    }
}

function resolveCandidate(root, base) {
    for (const suffix of CANDIDATE_SUFFIXES) {
        const candidate = base + suffix;
        if (existsSync(candidate) && !candidate.endsWith('/')) {
            return relative(root, candidate).replace(/\\/g, '/');
        }
    }
    return null;
}

/** Turns an import specifier into a repo-relative path, or null for a package. */
export function resolveImport(root, fromFile, specifier, aliases) {
    if (specifier.startsWith('.')) {
        return resolveCandidate(root, resolve(dirname(join(root, fromFile)), specifier));
    }
    for (const [prefix, target] of Object.entries(aliases)) {
        if (specifier.startsWith(prefix)) {
            return resolveCandidate(root, join(root, target + specifier.slice(prefix.length)));
        }
    }
    return null; // node_modules or unresolvable: not our business
}

/**
 * Builds the import graph plus a string-reference set.
 *
 * The string set matters: `playwright.config.ts` names the custom reporter as
 * './src/utils/CustomReporter.ts' in a reporter array, and a module referenced
 * that way is very much in use. Without this, "unused export" would report it.
 */
export function buildIndex(root, files, aliases = readAliases(root)) {
    const byPath = new Map(files.map((f) => [f.path, f]));
    const importers = new Map();   // target path -> [{ from, names }]
    const stringRefs = new Set();  // paths named inside a string literal somewhere

    for (const file of files) {
        for (const imp of file.imports) {
            const target = resolveImport(root, file.path, imp.source, aliases);
            if (!target) continue;
            if (!importers.has(target)) importers.set(target, []);
            importers.get(target).push({ from: file.path, names: imp.names, line: imp.line });
        }
        for (const str of file.strings) {
            const value = str.value.trim();
            if (!value.includes('/') && !value.includes('.')) continue;
            const normalized = value.replace(/^\.\//, '');
            for (const candidate of byPath.keys()) {
                if (candidate === file.path) continue;
                if (normalized === candidate || candidate.endsWith(normalized)) stringRefs.add(candidate);
            }
        }
    }

    /** Every file that imports `path`, whether or not it names a specific export. */
    const importersOf = (path) => importers.get(path) ?? [];

    /** Files that import `name` from `path`. Answers "how many callers?". */
    const consumersOfExport = (path, name) =>
        importersOf(path).filter((i) => i.names.includes(name) || i.names.length === 0).map((i) => i.from);

    /** Walks `extends` across files to measure how deep a class sits. */
    const inheritanceDepth = (file, className) => {
        let depth = 0;
        let currentFile = file;
        let current = className;
        const seen = new Set();
        while (depth < 10) {
            const cls = currentFile?.classes.find((c) => c.name === current);
            if (!cls || !cls.extends) return depth;
            const parent = cls.extends.split('.').pop();
            if (seen.has(parent)) return depth;
            seen.add(parent);
            depth += 1;
            const imp = currentFile.imports.find((i) => i.names.includes(parent));
            const parentPath = imp ? resolveImport(root, currentFile.path, imp.source, aliases) : null;
            currentFile = parentPath ? byPath.get(parentPath) : currentFile;
            current = parent;
        }
        return depth;
    };

    return { byPath, importersOf, consumersOfExport, inheritanceDepth, stringRefs, aliases };
}
