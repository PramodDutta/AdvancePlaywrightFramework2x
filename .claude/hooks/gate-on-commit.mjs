#!/usr/bin/env node
/**
 * PreToolUse hook on Bash: the last check before history is written.
 *
 * Runs the gate and ESLint over the staged files. This is where ESLint belongs:
 * a commit happens a hundred times less often than an edit, so the two seconds
 * a type-aware lint costs are affordable here and are not affordable in the
 * edit loop.
 *
 * `--no-verify` is honoured. Someone with a reason to bypass a gate will find a
 * way regardless, and a bypass that is visible in the command is better than
 * one that is not.
 */
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { readInput, runGate, isCovered } from './lib.mjs';

const input = readInput();
const command = input.tool_input?.command ?? '';
const root = input.cwd || process.cwd();

const isCommit = /\bgit\s+(?:-[^\s]+\s+)*commit\b/.test(command);
const bypassed = /--no-verify|(?:^|\s)-[a-zA-Z]*n[a-zA-Z]*(?=\s|$)/.test(command);
if (!isCommit || bypassed) process.exit(0);

const deny = (reason) => {
    process.stdout.write(JSON.stringify({
        hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: 'deny',
            permissionDecisionReason: reason,
        },
    }));
    process.exit(0);
};

let staged = [];
try {
    staged = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], { cwd: root, encoding: 'utf8' })
        .split('\n').map((s) => s.trim()).filter(Boolean);
} catch {
    process.exit(0);
}

const covered = staged.filter(isCovered);
if (covered.length === 0) process.exit(0);

const { ok, output, error } = runGate(root, ['--staged', '--profile', 'commit', '--format', 'hook']);
if (error) process.exit(0);
if (!ok) {
    deny([
        'The quality gate rejected the staged changes:',
        '',
        output,
        '',
        'Fix these, re-stage, and commit again. `git commit --no-verify` bypasses the gate if you have a reason to.',
    ].join('\n'));
}

try {
    execFileSync(resolve(root, 'node_modules/.bin/eslint'), ['--no-warn-ignored', ...covered], {
        cwd: root,
        encoding: 'utf8',
        env: { ...process.env, NO_COLOR: '1' },
    });
} catch (err) {
    if (err.status === 1) {
        deny([
            'ESLint found errors in the staged files:',
            '',
            String(err.stdout ?? '').trim(),
            '',
            'Many are auto-fixable: `npm run lint:fix`. Then re-stage and commit again.',
        ].join('\n'));
    }
}

process.exit(0);
