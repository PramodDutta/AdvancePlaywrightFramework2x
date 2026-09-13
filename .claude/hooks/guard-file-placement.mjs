#!/usr/bin/env node
/**
 * PreToolUse hook: refuses a file in the wrong layer before it is written.
 *
 * Everything else in this system reports on content. This one is about
 * location, which is the one thing that cannot be fixed by editing the file
 * afterwards: a spec written next to a page object runs under the wrong
 * Playwright project, against the wrong baseURL, with no browser or with one it
 * did not want. `playwright.config.ts` scopes projects by directory, so the
 * directory is part of the contract.
 *
 * Kept to rules with no judgement in them. Taste belongs in the gate, where it
 * can be waived with a reason; this returns a hard deny.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { readInput, repoPath } from './lib.mjs';

const RULES = [
    {
        when: (rel) => /\.spec\.ts$/.test(rel) && !rel.startsWith('src/tests/'),
        reason: (rel) =>
            `${rel} is a spec outside src/tests/. playwright.config.ts sets testDir to ./src/tests and ` +
            'scopes the chromium, api, and ai projects by subdirectory, so a spec anywhere else is never ' +
            'collected. Put UI specs in src/tests/<feature>/, API specs in src/tests/apisTests/.',
    },
    {
        when: (rel) => /(?:^|\/)[A-Z]\w*Page\.ts$/.test(rel) && !rel.startsWith('src/pages/'),
        reason: (rel) =>
            `${rel} looks like a page object outside src/pages/. Page objects live there, extend BasePage, ` +
            'and reach specs through a fixture in src/fixtures/test-base.ts.',
    },
    {
        when: (rel) => rel === '.env',
        reason: () =>
            '.env is gitignored and holds real credentials. Add the key to .env.example instead, and read it ' +
            'through requireEnv/envOr from @config/env.',
    },
];

const input = readInput();
const root = input.cwd || process.cwd();
const rel = repoPath(root, input.tool_input?.file_path);
if (!rel) process.exit(0);

// Only new files: an existing file in an odd place is someone else's decision,
// already made, and blocking edits to it helps nobody.
if (existsSync(join(root, rel))) process.exit(0);

const broken = RULES.find((rule) => rule.when(rel));
if (!broken) process.exit(0);

process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: broken.reason(rel),
    },
}));
process.exit(0);
