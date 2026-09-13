#!/usr/bin/env node
/**
 * PostToolUse hook: runs the quality gate on the file Claude just wrote.
 *
 * This is the pre-generation gate's other half. It fires on every Write and
 * Edit, scopes the report to that one file, and blocks (exit 2) when the file
 * carries an `error`. Claude reads stderr and fixes it in the same turn, so the
 * violation never reaches a commit, let alone a reviewer.
 *
 * Warnings are printed but do not block. The judgement calls - a comment that
 * narrates, a step that wraps one call - are worth showing at the moment the
 * code is fresh, and not worth stopping the work over.
 *
 * ESLint is deliberately NOT run here. A type-aware lint of a single file costs
 * about 2.2 seconds against the engine's 0.14, and paying that on every edit
 * buys nothing this hook does not already catch. It runs at commit time and in
 * CI, where two seconds is free.
 */
import { readInput, repoPath, isCovered, runGate, block } from './lib.mjs';

const input = readInput();
const root = input.cwd || process.cwd();
const rel = repoPath(root, input.tool_input?.file_path);

if (!isCovered(rel)) process.exit(0);

const { ok, output, error } = runGate(root, ['--file', rel, '--profile', 'hook', '--format', 'hook']);

if (error) {
    // A broken gate must not become a broken edit loop. Say so and move on.
    process.stderr.write(`quality gate could not run: ${error}\n`);
    process.exit(0);
}

if (!ok) {
    block([
        `Quality gate blocked this edit to ${rel}:`,
        '',
        output,
        '',
        'Fix the errors above and re-apply the edit. If a finding is genuinely wrong for this case,',
        'add `// gate-allow <rule-id> -- <reason>` on the line and say why in your reply.',
    ].join('\n'));
}

if (output) process.stdout.write(`Quality gate notes for ${rel}:\n${output}\n`);
process.exit(0);
