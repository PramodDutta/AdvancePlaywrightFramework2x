#!/usr/bin/env node
/**
 * lint-changed.mjs - ESLint over what this branch adds, nothing else.
 *
 * `npm run lint` covers the whole repo and does not pass: the baseline predates
 * these checks. That is fine for an audit and useless as a gate, because a
 * check that is red before you start gets ignored. This is the one to wire into
 * a hook.
 */
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }).split('\n').map((s) => s.trim()).filter(Boolean);
const base = process.env.GATE_BASE ?? 'origin/main';

let changed;
try {
    changed = git('diff', '--name-only', '--diff-filter=ACMR', git('merge-base', base, 'HEAD')[0], 'HEAD');
} catch {
    changed = git('diff', '--name-only', '--diff-filter=ACMR', 'HEAD');
}

const files = changed.filter((f) => /^src\/.*\.ts$/.test(f) || f === 'playwright.config.ts');
if (files.length === 0) {
    process.stdout.write('lint: nothing covered has changed\n');
    process.exit(0);
}

try {
    execFileSync(resolve(ROOT, 'node_modules/.bin/eslint'), ['--no-warn-ignored', ...files], { cwd: ROOT, stdio: 'inherit' });
    process.stdout.write(`lint: ${files.length} changed file(s) clean\n`);
} catch (err) {
    process.exit(err.status ?? 1);
}
