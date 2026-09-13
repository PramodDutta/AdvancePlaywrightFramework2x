#!/usr/bin/env node
/**
 * UserPromptSubmit hook: puts the blocking rules in front of the model before
 * it writes anything.
 *
 * This is the cheap half of the pre-generation gate, and the one that changes
 * the most. Telling a model the rules up front costs a few hundred tokens;
 * letting it generate a spec that news the fixture layer, then blocking the
 * edit, then having it rewrite the file, costs a whole turn. The gate on the
 * other side exists for what slips through, not as the primary mechanism.
 *
 * Only the `error` rules are injected. Injecting all 46 would bury the eight
 * that actually block, and a prompt is not documentation.
 */
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { readInput } from './lib.mjs';

const VERB = /\b(?:write|generate|create|add|build|refactor|implement|fix|update|convert|migrate)\b/i;
const NOUN = /\b(?:test|tests|spec|specs|page object|pom|fixture|fixtures|locator|selector|assertion|scenario|suite|api test|helper|util|playwright)\b/i;

const input = readInput();
const prompt = input.prompt ?? '';
const root = input.cwd || process.cwd();

if (!(VERB.test(prompt) && NOUN.test(prompt))) process.exit(0);

let rules;
try {
    rules = execFileSync(process.execPath, [resolve(root, 'quality/gate.mjs'), '--list-rules'], {
        cwd: root,
        encoding: 'utf8',
        env: { ...process.env, NO_COLOR: '1' },
    });
} catch {
    process.exit(0);
}

const blocking = rules.split('\n').filter((line) => line.includes('[error]')).map((line) => line.trim());
if (blocking.length === 0) process.exit(0);

const context = [
    'Quality gates are active in this repo. Code you write is checked on save by',
    '`quality/gate.mjs` and again on the pull request. These rules BLOCK an edit:',
    '',
    ...blocking.map((r) => `  ${r}`),
    '',
    'Four gates also warn without blocking: ai-slop (comments that restate the code,',
    'assertion-free tests, generic titles), ponytail (machinery the trace already',
    'records - test.step around a single call, logs restating step names, attachments),',
    'over-engineering (abstractions with one caller, exports with none), and',
    'framework-patterns (the non-negotiables in .github/copilot-instructions.md).',
    '',
    'Write it right the first time rather than fixing it after the block. Run',
    '`npm run gate -- --file <path>` to check a file yourself. If a finding is genuinely',
    'wrong for a case, waive it with `// gate-allow <rule-id> -- <reason>`; a waiver',
    'without a reason is itself an error.',
].join('\n');

process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: context },
}));
