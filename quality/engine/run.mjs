/**
 * run.mjs - loads rule packs, runs them, applies waivers and budgets.
 *
 * Two things here are load-bearing:
 *
 * 1. The engine always indexes the whole repo, even when you ask about one
 *    file. "This export has no consumer" is unanswerable from a single file,
 *    so scoping happens at report time, not at scan time.
 * 2. A waiver must carry a reason. `// gate-allow rule/id -- why` is accepted;
 *    a bare `// gate-allow rule/id` is itself a finding. A silent opt-out is
 *    how a gate rots into decoration.
 */
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readSource } from './source.mjs';
import { detectors } from './detectors.mjs';

const SEVERITIES = ['error', 'warn', 'info'];
const WAIVER_RE = /gate-allow(-file)?\s+([^\s]+)\s*(?:--\s*(.*))?$/;
const MIN_REASON = 10;

function globToRegExp(glob) {
    // Sentinels from the private-use area, swapped in before the regex syntax
    // exists and back out after. An earlier version substituted `?` last and
    // rewrote the `(?:...)` groups it had just produced, which quietly matched
    // nothing and reported a clean repo.
    const [Q, DIR, ANY] = ['\uE000', '\uE001', '\uE002'];
    const body = glob
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .split('?').join(Q)
        .split('**/').join(DIR)
        .split('**').join(ANY)
        .split('*').join('[^/]*')
        .split(DIR).join('(?:.*/)?')
        .split(ANY).join('.*')
        .split(Q).join('[^/]');
    return new RegExp(`^${body}$`);
}

const matchesAny = (path, globs) => globs.some((g) => globToRegExp(g).test(path));

/** Walks the repo once, honouring the config's include/exclude globs. */
export function collectFiles(root, config) {
    const files = [];
    const walk = (dir) => {
        for (const entry of readdirSync(dir)) {
            if (entry === 'node_modules' || entry === '.git' || entry.startsWith('.') && entry !== '.github') continue;
            const abs = join(dir, entry);
            const rel = relative(root, abs).replace(/\\/g, '/');
            if (statSync(abs).isDirectory()) { walk(abs); continue; }
            if (!matchesAny(rel, config.include)) continue;
            if (matchesAny(rel, config.exclude)) continue;
            files.push(readSource(abs, rel));
        }
    };
    walk(root);
    return files;
}

/** Loads every `*.rules.mjs` pack from the rules directory. */
export async function loadRules(rulesDir) {
    const rules = [];
    for (const entry of readdirSync(rulesDir).sort()) {
        if (!entry.endsWith('.rules.mjs')) continue;
        const mod = await import(pathToFileURL(join(rulesDir, entry)).href);
        const pack = mod.default;
        if (!pack?.rules) continue;
        for (const rule of pack.rules) {
            rules.push({ gate: pack.gate, pack: entry, options: {}, ...rule });
        }
    }
    return rules;
}

function collectWaivers(file) {
    const waivers = [];
    for (const comment of file.comments) {
        const match = comment.text.match(WAIVER_RE);
        if (!match) continue;
        waivers.push({
            line: comment.line,
            fileWide: Boolean(match[1]),
            target: match[2],
            reason: (match[3] ?? '').trim(),
        });
    }
    return waivers;
}

const waiverCovers = (waiver, finding) =>
    waiver.target === '*' || waiver.target === finding.ruleId || waiver.target === finding.gate;

function ruleApplies(rule, file) {
    if (rule.enabled === false) return false;
    if (rule.layers && !rule.layers.includes(file.layer)) return false;
    if (rule.specsOnly && !file.isSpec) return false;
    if (rule.include && !matchesAny(file.path, rule.include)) return false;
    if (rule.exclude && matchesAny(file.path, rule.exclude)) return false;
    return true;
}

/**
 * Runs every applicable rule over every file, then filters to `scope`.
 * Returns findings plus the waivers that fired, so a report can show what was
 * suppressed rather than quietly dropping it.
 */
export function runRules({ files, rules, index, config, scope = null }) {
    const ctx = { files, index, config };
    const raw = [];
    const waived = [];
    const unexplained = [];

    for (const file of files) {
        const waivers = collectWaivers(file);
        for (const waiver of waivers) {
            if (waiver.reason.length < MIN_REASON) {
                unexplained.push({
                    ruleId: 'gate/unexplained-waiver',
                    gate: 'engine',
                    severity: 'error',
                    title: 'Waiver without a reason',
                    why: 'A gate that can be switched off silently stops being a gate. The reason is what a reviewer reads six months later.',
                    fix: `Write \`// gate-allow ${waiver.target} -- <why this case is genuinely different>\` (at least ${MIN_REASON} characters).`,
                    file: file.path,
                    line: waiver.line,
                    excerpt: (file.lines[waiver.line - 1] ?? '').trim(),
                });
            }
        }

        for (const rule of rules) {
            if (!ruleApplies(rule, file)) continue;
            const detector = detectors[rule.detect];
            if (!detector) throw new Error(`Rule ${rule.id} names unknown detector "${rule.detect}"`);

            for (const hit of detector(file, rule, ctx)) {
                const finding = {
                    ruleId: rule.id,
                    gate: rule.gate,
                    severity: config.severityOverrides?.[rule.id] ?? rule.severity ?? 'warn',
                    title: rule.title,
                    why: rule.why,
                    fix: rule.fix,
                    file: file.path,
                    line: hit.line,
                    excerpt: hit.excerpt,
                    detail: hit.detail,
                };
                const waiver = waivers.find((w) =>
                    waiverCovers(w, finding) &&
                    w.reason.length >= MIN_REASON &&
                    (w.fileWide || Math.abs(w.line - finding.line) <= 1));
                if (waiver) waived.push({ ...finding, reason: waiver.reason });
                else raw.push(finding);
            }
        }
    }

    const inScope = (f) => !scope || scope.includes(f.file);
    const findings = [...raw, ...unexplained]
        .filter(inScope)
        .sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.ruleId.localeCompare(b.ruleId));

    return { findings, waived: waived.filter(inScope) };
}

/** Applies the profile: which severities fail, and per-gate warning budgets. */
export function evaluate(findings, profile) {
    const counts = Object.fromEntries(SEVERITIES.map((s) => [s, 0]));
    const perGate = {};
    for (const f of findings) {
        counts[f.severity] = (counts[f.severity] ?? 0) + 1;
        perGate[f.gate] ??= { error: 0, warn: 0, info: 0 };
        perGate[f.gate][f.severity] += 1;
    }

    const breaches = [];
    for (const [gate, budget] of Object.entries(profile.budgets ?? {})) {
        for (const severity of SEVERITIES) {
            const limit = budget[severity];
            const actual = perGate[gate]?.[severity] ?? 0;
            if (limit !== undefined && actual > limit) {
                breaches.push({ gate, severity, limit, actual });
            }
        }
    }

    const failing = (profile.fail ?? ['error']).some((s) => counts[s] > 0) || breaches.length > 0;
    return { counts, perGate, breaches, failing };
}
