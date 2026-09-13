/**
 * Shared plumbing for the Claude Code hooks.
 *
 * Every hook reads one JSON object from stdin and communicates back through an
 * exit code: 0 lets the action through, 2 blocks it and hands stderr to Claude
 * as feedback to act on. Anything a hook cannot do in a few hundred
 * milliseconds does not belong in a hook.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';

export function readInput() {
    let raw = '';
    try {
        raw = readFileSync(0, 'utf8');
    } catch {
        return {};
    }
    try {
        return JSON.parse(raw || '{}');
    } catch {
        return {};
    }
}

/** Repo-relative path, or null when the edit landed outside the project. */
export function repoPath(root, filePath) {
    if (!filePath) return null;
    const rel = relative(root, resolve(root, filePath)).replace(/\\/g, '/');
    return rel.startsWith('..') ? null : rel;
}

/** True for the files the gate actually covers. Everything else exits early. */
export const isCovered = (rel) =>
    Boolean(rel) && (/^src\/.*\.ts$/.test(rel) || rel === 'playwright.config.ts');

/** Runs the gate CLI and returns its report and exit status without throwing. */
export function runGate(root, args) {
    try {
        const stdout = execFileSync(process.execPath, [resolve(root, 'quality/gate.mjs'), ...args], {
            cwd: root,
            encoding: 'utf8',
            env: { ...process.env, NO_COLOR: '1' },
        });
        return { ok: true, output: stdout.trim() };
    } catch (err) {
        if (err.status === 1) return { ok: false, output: String(err.stdout ?? '').trim() };
        return { ok: true, output: '', error: String(err.stderr ?? err.message).trim() };
    }
}

export const block = (message) => {
    process.stderr.write(`${message}\n`);
    process.exit(2);
};
