#!/usr/bin/env node
/**
 * gate.mjs - the one entry point every stage calls.
 *
 *   node quality/gate.mjs --all                        whole repo
 *   node quality/gate.mjs --staged --profile commit    what you are about to commit
 *   node quality/gate.mjs --changed origin/main        what the PR adds
 *   node quality/gate.mjs --file src/pages/CartPage.ts --format hook
 *
 * Zero dependencies on purpose. This runs on every Claude edit, so the cost of
 * starting it is the cost of the whole gate; an npm install in that path would
 * be felt on every keystroke-sized change.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { collectFiles, loadRules, runRules, evaluate } from './engine/run.mjs';
import { buildIndex } from './engine/repo-index.mjs';
import { renderConsole, renderHook, renderMarkdown, renderJson } from './engine/report.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
    const args = { files: [], format: 'console', profile: null, mode: 'all', base: null, out: null, listRules: false };
    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        switch (arg) {
            case '--all': args.mode = 'all'; break;
            case '--staged': args.mode = 'staged'; break;
            case '--changed': args.mode = 'changed'; args.base = argv[i + 1]?.startsWith('--') ? null : argv[++i]; break;
            case '--file': args.mode = 'files'; args.files.push(argv[++i]); break;
            case '--profile': args.profile = argv[++i]; break;
            case '--format': args.format = argv[++i]; break;
            case '--out': args.out = argv[++i]; break;
            case '--list-rules': args.listRules = true; break;
            default:
                if (!arg.startsWith('--')) { args.mode = 'files'; args.files.push(arg); }
        }
    }
    return args;
}

const git = (...cmd) => execFileSync('git', cmd, { cwd: ROOT, encoding: 'utf8' }).split('\n').map((s) => s.trim()).filter(Boolean);

/** Resolves the set of paths to report on. The scan itself is always repo-wide. */
function resolveScope(args) {
    switch (args.mode) {
        case 'staged':
            return git('diff', '--cached', '--name-only', '--diff-filter=ACMR');
        case 'changed': {
            const base = args.base ?? process.env.GATE_BASE ?? 'origin/main';
            try {
                const merge = git('merge-base', base, 'HEAD')[0];
                return git('diff', '--name-only', '--diff-filter=ACMR', merge, 'HEAD');
            } catch {
                return git('diff', '--name-only', '--diff-filter=ACMR', 'HEAD');
            }
        }
        case 'files':
            return args.files.map((f) => relative(ROOT, resolve(f)).replace(/\\/g, '/'));
        default:
            return null; // whole repo
    }
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const config = (await import(pathToFileURL(join(ROOT, 'quality/gate.config.mjs')).href)).default;
    const rules = await loadRules(join(ROOT, 'rules'));

    if (args.listRules) {
        const byGate = new Map();
        for (const rule of rules.filter((r) => r.enabled !== false)) {
            if (!byGate.has(rule.gate)) byGate.set(rule.gate, []);
            byGate.get(rule.gate).push(rule);
        }
        const lines = [];
        for (const [gate, group] of byGate) {
            lines.push(`${gate}:`);
            for (const r of group) lines.push(`  [${r.severity ?? 'warn'}] ${r.id} - ${r.title}`);
        }
        process.stdout.write(`${lines.join('\n')}\n`);
        return 0;
    }

    const profileName = args.profile ?? (process.env.CI ? 'ci' : 'commit');
    const profile = config.profiles[profileName];
    if (!profile) throw new Error(`Unknown profile "${profileName}". Known: ${Object.keys(config.profiles).join(', ')}`);

    const files = collectFiles(ROOT, config);
    const index = buildIndex(ROOT, files);

    const requested = resolveScope(args);
    const known = new Set(files.map((f) => f.path));
    const scope = requested === null ? null : requested.filter((p) => known.has(p));

    // A change that touches only files the gate does not cover is a pass, not
    // a scan of the whole repo. Without this, editing the README would report
    // every pre-existing finding in src/.
    if (scope !== null && scope.length === 0) {
        if (args.format === 'json') process.stdout.write(renderJson({ findings: [], waived: [], result: { counts: { error: 0, warn: 0, info: 0 }, perGate: {}, breaches: [], failing: false }, profileName, scanned: 0 }));
        else if (args.format === 'console') process.stdout.write(`Quality Gate - ${profileName} profile - no covered files in scope\n`);
        return 0;
    }

    const { findings, waived } = runRules({ files, rules, index, config, scope });
    const result = evaluate(findings, profile);
    const gates = [...new Set(rules.map((r) => r.gate))];
    const payload = { findings, waived, result, profile, profileName, scanned: scope ? scope.length : files.length, gates };

    const rendered =
        args.format === 'markdown' ? renderMarkdown(payload)
        : args.format === 'json' ? renderJson(payload)
        : args.format === 'hook' ? renderHook(payload)
        : renderConsole(payload);

    if (args.out) {
        const outPath = resolve(ROOT, args.out);
        mkdirSync(dirname(outPath), { recursive: true });
        writeFileSync(outPath, `${rendered}\n`);
    } else if (rendered) {
        process.stdout.write(`${rendered}\n`);
    }

    return result.failing ? 1 : 0;
}

main()
    .then((code) => process.exit(code))
    .catch((err) => {
        process.stderr.write(`quality gate failed to run: ${err.stack ?? err.message}\n`);
        process.exit(2);
    });
