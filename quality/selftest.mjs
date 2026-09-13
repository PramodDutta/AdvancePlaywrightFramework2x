#!/usr/bin/env node
/**
 * selftest.mjs - proves the rules still fire.
 *
 * A gate with no test of its own is the thing this repo's own rules exist to
 * catch. Two fixtures: one written the way a model writes a spec when nobody is
 * watching, one written the way the framework documents. The first must produce
 * a named list of findings, the second must produce none.
 *
 * The fixtures are `.txt` so neither tsc nor ESLint tries to compile deliberately
 * broken code. They are read with a pretend repo-relative path, which is what
 * decides their layer: `src/tests/...` makes them specs, and the spec-only rules
 * apply.
 */
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSource } from './engine/source.mjs';
import { buildIndex } from './engine/repo-index.mjs';
import { collectFiles, loadRules, runRules } from './engine/run.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURES = join(ROOT, 'quality/__tests__/fixtures');

const CASES = [
    {
        fixture: 'slop-spec.fixture.txt',
        as: 'src/tests/demo/slop.spec.ts',
        expect: [
            'framework/spec-imports-playwright-test',
            'framework/page-object-constructed-in-spec',
            'framework/locator-in-spec',
            'framework/dotenv-in-spec',
            'framework/env-read-directly',
            'framework/inline-credential-literal',
            'framework/credential-argument-literal',
            'framework/hardcoded-url',
            'slop/test-without-assertion',
            'slop/constant-assertion',
            'slop/weak-status-assertion',
            'slop/swallowed-error',
            'slop/narrating-comment',
            'slop/section-banner-comment',
            'slop/decorative-divider',
            'slop/generic-test-title',
            'ponytail/step-wraps-single-call',
            'ponytail/log-restates-step-name',
        ],
    },
    {
        fixture: 'clean-spec.fixture.txt',
        as: 'src/tests/demo/clean.spec.ts',
        expect: [],
    },
];

const config = (await import(new URL('./gate.config.mjs', import.meta.url))).default;
const rules = await loadRules(join(ROOT, 'rules'));
const repoFiles = collectFiles(ROOT, config);

let failures = 0;
const report = (ok, message) => {
    process.stdout.write(`${ok ? '  pass' : '  FAIL'}  ${message}\n`);
    if (!ok) failures += 1;
};

for (const testCase of CASES) {
    process.stdout.write(`\n${testCase.fixture} as ${testCase.as}\n`);

    const fixture = readSource(join(FIXTURES, testCase.fixture), testCase.as);
    const files = [...repoFiles, fixture];
    const index = buildIndex(ROOT, files);
    const { findings } = runRules({ files, rules, index, config, scope: [testCase.as] });
    const fired = new Set(findings.map((f) => f.ruleId));

    for (const ruleId of testCase.expect) {
        report(fired.has(ruleId), `${ruleId} fires`);
    }

    if (testCase.expect.length === 0) {
        report(findings.length === 0, `clean fixture produces no findings${findings.length ? `: ${[...fired].join(', ')}` : ''}`);
    } else {
        const unexpected = [...fired].filter((id) => !testCase.expect.includes(id));
        if (unexpected.length > 0) process.stdout.write(`  note  also fired: ${unexpected.join(', ')}\n`);
    }
}

process.stdout.write(`\n${failures === 0 ? 'selftest passed' : `selftest failed: ${failures} check(s)`}\n`);
process.exit(failures === 0 ? 0 : 1);
