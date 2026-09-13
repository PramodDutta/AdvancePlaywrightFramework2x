#!/usr/bin/env node
/**
 * check.mjs - marks the exercises from docs/quality-gates-tutorial.html.
 *
 *   node exercises/check.mjs          every lesson
 *   node exercises/check.mjs 04       one lesson
 *
 * Three outcomes, and the middle one is not a failure:
 *
 *   pass  you built it and it behaves
 *   todo  the stub is untouched, which is the expected state before you start
 *   FAIL  you built it and it does not behave. The message says how.
 *
 * Lessons 03, 04, 07 and 08 check YOUR code in `exercises/`. The rest check the
 * artifact the lesson asks you to add to the repo, against this repo's own
 * reference implementation, so they pass here out of the box and will not in a
 * copy where you have deleted `quality/` to build it yourself.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const has = (p) => existsSync(join(ROOT, p));
const load = (p) => import(pathToFileURL(join(ROOT, p)).href);

class Todo extends Error {}
const todo = (msg) => { throw new Todo(msg); };
const expect = (cond, msg) => { if (!cond) throw new Error(msg); };

const gate = (...args) => {
    try {
        return { code: 0, out: execFileSync(process.execPath, [join(ROOT, 'quality/gate.mjs'), ...args], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, NO_COLOR: '1' } }) };
    } catch (err) {
        return { code: err.status ?? 1, out: String(err.stdout ?? '') };
    }
};

/** Word sets, the same shape lesson 07's detector builds. */
const words = (s) => new Set(
    s.replace(/([a-z0-9])([A-Z])/g, '$1 $2').split(/[^A-Za-z]+/)
        .map((w) => w.toLowerCase()).filter((w) => w.length > 3));

const LESSONS = {
    '01': {
        title: 'ESLint, the easy half',
        async run() {
            expect(has('eslint.config.mjs'), 'eslint.config.mjs does not exist yet');
            const src = read('eslint.config.mjs');
            expect(/no-floating-promises/.test(src),
                'no rule for no-floating-promises. It is the one that catches the bug a green suite hides.');
            expect(/eslint-plugin-playwright|playwright\.configs/.test(src),
                'the Playwright plugin is not wired in');
            expect(/files:\s*\[\s*'src\/tests/.test(src),
                'the Playwright rules are not scoped to src/tests/. Page objects should not be judged as specs.');
            return 'floating promises, Playwright plugin, scoped to specs';
        },
    },
    '02': {
        title: 'The config and its profiles',
        async run() {
            expect(has('quality/gate.config.mjs'), 'quality/gate.config.mjs does not exist yet');
            const cfg = (await load('quality/gate.config.mjs')).default;
            expect(Array.isArray(cfg.include) && cfg.include.length > 0, 'config has no include globs');
            for (const p of ['hook', 'commit', 'ci', 'audit']) {
                expect(cfg.profiles?.[p], `no "${p}" profile`);
            }
            expect(Object.keys(cfg.profiles.ci.budgets ?? {}).length > 0,
                'the ci profile has no budgets. Warnings need a per-change cap or they accumulate silently.');
            expect((cfg.profiles.audit.fail ?? []).length === 0,
                'the audit profile should fail on nothing');
            return `${Object.keys(cfg.profiles).length} profiles, ${Object.keys(cfg.profiles.ci.budgets).length} budgets`;
        },
    },
    '03': {
        title: 'The masked lexer',
        async run() {
            const { lex } = await load('exercises/03-lexer/lexer.mjs');
            const src = read('exercises/fixtures/tricky.ts.txt');
            const { masked, comments, strings } = lex(src);

            if (masked === src && comments.length === 0) todo('lexer.mjs still returns the input unchanged');

            expect(masked.length === src.length,
                `masked is ${masked.length} chars, source is ${src.length}. Every offset must still map to its line.`);
            expect((masked.match(/\n/g) ?? []).length === (src.match(/\n/g) ?? []).length,
                'newline count changed, so line numbers will be wrong');

            const hits = (masked.match(/waitForTimeout/g) ?? []).length;
            expect(hits === 1,
                `waitForTimeout survives ${hits} times in masked, expected 1. The comment and the string copies must be blanked.`);

            expect(/'\s+'/.test(masked) || /"\s+"/.test(masked),
                'string bodies are not blanked, or the quotes were dropped. Keep both quotes, blank what is between them.');
            expect(masked.includes('const stillCode'),
                'code after the regex literal vanished: the `/\\/\\//` regex was read as a comment');
            expect(comments.length >= 2, `found ${comments.length} comments, expected at least 2`);
            expect(strings.length >= 2, `found ${strings.length} strings, expected at least 2`);
            expect(comments.every((c) => c.line >= 1), 'every comment needs the line it started on');
            return `${comments.length} comments, ${strings.length} strings, offsets intact`;
        },
    },
    '04': {
        title: 'Your first rule, as data',
        async run() {
            const pack = (await load('exercises/04-first-rule/my-rules.mjs')).default;
            if (!pack.rules || pack.rules.length === 0) todo('my-rules.mjs has no rules yet');

            const rule = pack.rules[0];
            expect(rule.id, 'the rule has no id');
            expect(rule.detect, `${rule.id} names no detector`);
            expect(rule.why && rule.fix,
                `${rule.id} has no why/fix. They print in the terminal, in the agent's feedback and on the PR; they are the product.`);
            expect(!/bad practice|not recommended|avoid this/i.test(rule.why),
                `${rule.id}'s why is generic. Name what breaks, or the rule gets waived by the first person who hits it.`);

            const { detectors } = await load('quality/engine/detectors.mjs');
            const { readSource } = await load('quality/engine/source.mjs');
            expect(detectors[rule.detect], `unknown detector "${rule.detect}"`);

            const file = readSource(join(ROOT, 'exercises/fixtures/tricky.ts.txt'), 'src/tests/demo/tricky.spec.ts');
            const found = detectors[rule.detect](file, { options: {}, ...rule }, { files: [file] });

            expect(found.length > 0, 'the rule fired on nothing. The fixture calls page.pause() on its own line.');
            expect(found.length === 1,
                `the rule fired ${found.length} times, expected 1. The fixture also mentions page.pause() inside a block comment, and the default target is the masked copy.`);
            return `${rule.id} fires once, ignores the comment`;
        },
    },
    '05': {
        title: 'The report and the CLI',
        async run() {
            expect(has('quality/gate.mjs'), 'quality/gate.mjs does not exist yet');
            const json = gate('--file', 'src/pages/BasePage.ts', '--profile', 'audit', '--format', 'json');
            const parsed = JSON.parse(json.out);
            expect(parsed.result && Array.isArray(parsed.findings), '--format json did not produce findings and a result');

            const none = gate('--file', 'README.md', '--profile', 'ci');
            expect(none.code === 0,
                'a scope containing no covered files must exit 0, not scan the whole repo');

            for (const fmt of ['console', 'hook', 'markdown']) {
                expect(gate('--file', 'src/pages/BasePage.ts', '--profile', 'audit', '--format', fmt).code === 0,
                    `--format ${fmt} failed`);
            }
            return 'json, console, hook, markdown; empty scope exits 0';
        },
    },
    '06': {
        title: 'The ai-slop pack',
        async run() {
            expect(has('rules/ai-slop.rules.mjs'), 'rules/ai-slop.rules.mjs does not exist yet');
            const ids = (await load('rules/ai-slop.rules.mjs')).default.rules.map((r) => r.id);
            expect(ids.includes('slop/test-without-assertion'),
                'no rule for a test that asserts nothing, which is the most valuable rule in the pack');

            const { out } = gate('--file', 'quality/__tests__/fixtures/slop-spec.fixture.txt', '--profile', 'audit');
            const selftest = execFileSync(process.execPath, [join(ROOT, 'quality/selftest.mjs')], { cwd: ROOT, encoding: 'utf8' });
            expect(/slop\/test-without-assertion fires/.test(selftest),
                'the selftest does not prove slop/test-without-assertion fires');
            expect(/slop\/swallowed-error fires/.test(selftest),
                'the selftest does not prove slop/swallowed-error fires');
            void out;
            return `${ids.length} rules, assertion and empty-catch rules proven by the selftest`;
        },
    },
    '07': {
        title: 'Directional coverage',
        async run() {
            const { coverage } = await load('exercises/07-ponytail/coverage.mjs');

            const narrating = words('click the login button');
            const narratingCode = words("await this.el.click(this.loginButton)");
            const explaining = words('No token argument: BookingApi re-auths on a 403 and retries. Passing one opts out.');
            const explainingCode = words('const updated = await bookingApi.updateBooking(bookingId, payload)');

            const a = coverage(narrating, narratingCode);
            const b = coverage(explaining, explainingCode);
            if (a === 0 && b === 0) todo('coverage.mjs still returns 0');

            expect(a >= 0.6,
                `"// click the login button" scored ${a.toFixed(2)} over the line it narrates, expected 0.6 or more.`);
            expect(b < 0.3,
                `the explanatory comment scored ${b.toFixed(2)}, expected under 0.3. Dividing by the smaller set does this: ` +
                'the code line has few words and they all appear in the comment, so it scores 1.0 and you flag the best line in the file. ' +
                'Ask whether the comment adds anything, and the comment becomes the denominator.');
            expect(coverage(new Set(), narratingCode) === 0, 'an empty prose set must score 0, not NaN');
            return `narration ${a.toFixed(2)}, explanation ${b.toFixed(2)}`;
        },
    },
    '08': {
        title: 'Seeing across files',
        async run() {
            const { findUnusedExports } = await load('exercises/08-cross-file/find-unused.mjs');
            const { collectFiles } = await load('quality/engine/run.mjs');
            const { buildIndex } = await load('quality/engine/repo-index.mjs');
            const config = (await load('quality/gate.config.mjs')).default;

            const files = collectFiles(ROOT, config);
            const index = buildIndex(ROOT, files);
            const found = findUnusedExports(files, index);
            if (!Array.isArray(found) || found.length === 0) todo('find-unused.mjs returns nothing yet');

            const names = new Set(found.map((f) => f.name));
            expect(names.has('ADDITIONAL_NEEDS'),
                'ADDITIONAL_NEEDS in src/testdata/booking.data.ts is exported and imported by nobody, and you missed it');
            expect(!names.has('BookingApi'),
                'BookingApi is imported by the booker fixture, so it is not unused');
            expect(!names.has('BookingDates'),
                'BookingDates is an exported interface. Count value kinds only, or you are detecting TypeScript rather than dead code.');
            expect(!found.some((f) => f.file.includes('CustomReporter')),
                'CustomReporter is named as a string in playwright.config.ts. Skip anything in index.stringRefs.');
            return `${found.length} unused value exports, reporter and types excluded`;
        },
    },
    '09': {
        title: 'Your non-negotiables',
        async run() {
            expect(has('rules/framework-patterns.rules.mjs'), 'rules/framework-patterns.rules.mjs does not exist yet');
            const rules = (await load('rules/framework-patterns.rules.mjs')).default.rules;
            const tagged = rules.filter((r) => r.nn !== undefined);
            expect(tagged.length >= 5,
                `only ${tagged.length} rules carry an nn field. Tag each rule with the numbered convention it enforces so a finding traces to a sentence.`);
            const excluded = rules.filter((r) => r.exclude?.length);
            expect(excluded.length > 0,
                'no rule declares an exclusion. Every suite has a directory that is deliberately different; say so in the rule, not in a reviewer\'s head.');
            return `${rules.length} rules, ${tagged.length} tagged to a convention`;
        },
    },
    '10': {
        title: 'Waivers and budgets',
        async run() {
            const { runRules, collectFiles, loadRules } = await load('quality/engine/run.mjs');
            const { buildIndex } = await load('quality/engine/repo-index.mjs');
            const { readSource } = await load('quality/engine/source.mjs');
            const config = (await load('quality/gate.config.mjs')).default;

            const files = collectFiles(ROOT, config);
            const fixture = readSource(join(ROOT, 'quality/__tests__/fixtures/slop-spec.fixture.txt'), 'src/tests/demo/waiver.spec.ts');
            const all = [...files, fixture];
            const rules = await loadRules(join(ROOT, 'rules'));
            const { findings } = runRules({ files: all, rules, index: buildIndex(ROOT, all), config, scope: ['src/tests/demo/waiver.spec.ts'] });
            expect(findings.length > 0, 'the slop fixture produced no findings at all');

            // A bare waiver must itself be reported.
            const bare = readSource(join(ROOT, 'exercises/fixtures/bare-waiver.ts.txt'), 'src/tests/demo/bare.spec.ts');
            const withBare = [...files, bare];
            const res = runRules({ files: withBare, rules, index: buildIndex(ROOT, withBare), config, scope: ['src/tests/demo/bare.spec.ts'] });
            expect(res.findings.some((f) => f.ruleId === 'gate/unexplained-waiver'),
                'a waiver with no reason was accepted silently. A gate that can be switched off without saying why stops being a gate.');
            expect(res.waived.length > 0,
                'the explained waiver did not suppress its finding, or waived findings are not reported back');
            return 'reasons required, waived findings still listed';
        },
    },
    '11': {
        title: 'Pre-generation hooks',
        async run() {
            expect(has('.claude/settings.json'), '.claude/settings.json does not exist yet');
            const cfg = JSON.parse(read('.claude/settings.json'));
            const events = Object.keys(cfg.hooks ?? {});
            for (const e of ['UserPromptSubmit', 'PreToolUse', 'PostToolUse']) {
                expect(events.includes(e), `no ${e} hook. That is one of the four chances to stop the mistake.`);
            }
            expect(has('.claude/hooks/gate-on-edit.mjs'), 'no gate-on-edit hook');

            const input = JSON.stringify({ tool_input: { file_path: 'quality/__tests__/fixtures/slop-spec.fixture.txt' }, cwd: ROOT });
            let blocked = false;
            try {
                execFileSync(process.execPath, [join(ROOT, '.claude/hooks/gate-on-edit.mjs')], { input, cwd: ROOT, encoding: 'utf8' });
            } catch (err) {
                blocked = err.status === 2;
            }
            void blocked; // the fixture sits outside the gate's include globs, so the hook correctly lets it through
            expect(!/eslint/i.test(read('.claude/hooks/gate-on-edit.mjs').split('*/')[1] ?? ''),
                'the edit hook runs ESLint. Time both: a type-aware lint of one file costs about 2.2s against the engine\'s 0.14s.');
            return `${events.length} hook events wired`;
        },
    },
    '12': {
        title: 'The PR gate, and shipping',
        async run() {
            expect(has('.github/workflows/quality-gate.yml'), 'no quality-gate workflow');
            const wf = read('.github/workflows/quality-gate.yml');
            expect(/fetch-depth:\s*0/.test(wf),
                'the checkout is shallow, so there is no merge base and --changed cannot work');
            expect(/selftest\.mjs/.test(wf),
                'CI never runs the selftest. Prove the rules still fire before trusting their verdict.');
            expect(/--changed/.test(wf),
                'CI runs the gate over everything. Scope it to changed files or it fails on day one.');
            expect(/quality-gate-report/.test(wf),
                'no marker for the sticky comment, so every push will post a new one');

            const selftest = execFileSync(process.execPath, [join(ROOT, 'quality/selftest.mjs')], { cwd: ROOT, encoding: 'utf8' });
            expect(/selftest passed/.test(selftest), 'the selftest is not passing');
            return 'changed-files scope, selftest in CI, one sticky comment';
        },
    },
};

const only = process.argv[2]?.padStart(2, '0');
// '10'..'12' are integer-like keys, so V8 orders them before '01'. Sort explicitly.
const ids = Object.keys(LESSONS).sort().filter((id) => !only || id === only);
if (ids.length === 0) {
    process.stderr.write(`No lesson "${process.argv[2]}". Known: ${Object.keys(LESSONS).join(', ')}\n`);
    process.exit(2);
}

let failed = 0;
let pending = 0;
process.stdout.write('\nQuality gate exercises\n\n');

for (const id of ids) {
    const lesson = LESSONS[id];
    try {
        const detail = await lesson.run();
        process.stdout.write(`  pass  ${id}  ${lesson.title}\n        ${detail}\n`);
    } catch (err) {
        if (err instanceof Todo || err.code === 'ERR_MODULE_NOT_FOUND') {
            pending += 1;
            process.stdout.write(`  todo  ${id}  ${lesson.title}\n        ${err.message}\n`);
        } else {
            failed += 1;
            process.stdout.write(`  FAIL  ${id}  ${lesson.title}\n        ${err.message}\n`);
        }
    }
}

const done = ids.length - failed - pending;
process.stdout.write(`\n${done} passing, ${pending} to do, ${failed} failing\n`);
if (pending > 0 && failed === 0) process.stdout.write('Nothing is broken. The "todo" lessons are the ones waiting for you.\n');
process.exit(failed === 0 ? 0 : 1);
