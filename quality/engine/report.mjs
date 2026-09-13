/**
 * report.mjs - four renderings of the same findings.
 *
 * console  : what a developer reads in a terminal.
 * hook     : what a Claude hook feeds back for self-correction, no colour.
 * markdown : what the PR gate posts as a sticky comment.
 * json     : what anything else consumes.
 *
 * `why` and `fix` print on the first occurrence of each rule and are omitted
 * on repeats. Repeating the same two paragraphs eleven times is how a report
 * teaches people to skim past it.
 */
const CSI = String.fromCharCode(27) + '[';
const COLOR = process.stdout.isTTY && !process.env.NO_COLOR && process.env.TERM !== 'dumb';
const paint = (code, text) => (COLOR ? `${CSI}${code}m${text}${CSI}0m` : text);
const dim = (t) => paint('2', t);
const bold = (t) => paint('1', t);
const green = (t) => paint('32', t);
const SEVERITY_STYLE = { error: (t) => paint('31', t), warn: (t) => paint('33', t), info: (t) => paint('36', t) };
const MARK = { error: 'error', warn: 'warn ', info: 'info ' };

const pluralize = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function groupBy(items, key) {
    const map = new Map();
    for (const item of items) {
        const k = key(item);
        if (!map.has(k)) map.set(k, []);
        map.get(k).push(item);
    }
    return map;
}

export function renderConsole({ findings, waived, result, profileName, scanned }) {
    const out = [bold(`Quality Gate - ${profileName} profile - ${pluralize(scanned, 'file')} scanned`)];

    if (findings.length === 0) {
        out.push(green('  no findings'));
    } else {
        const seen = new Set();
        for (const [file, group] of groupBy(findings, (f) => f.file)) {
            out.push('');
            out.push(bold(file));
            for (const f of group) {
                const style = SEVERITY_STYLE[f.severity] ?? ((t) => t);
                out.push(`  ${dim(String(f.line).padStart(4))}  ${style(MARK[f.severity])}  ${f.title}  ${dim(f.ruleId)}`);
                if (f.detail) out.push(`        ${dim(f.detail)}`);
                if (f.excerpt) out.push(`        ${dim('> ' + f.excerpt)}`);
                if (!seen.has(f.ruleId)) {
                    seen.add(f.ruleId);
                    if (f.why) out.push(`        ${dim('why')} ${f.why}`);
                    if (f.fix) out.push(`        ${dim('fix')} ${f.fix}`);
                }
            }
        }
    }

    if (waived.length > 0) {
        out.push('');
        out.push(dim(`${pluralize(waived.length, 'finding')} waived:`));
        for (const w of waived) out.push(dim(`  ${w.file}:${w.line}  ${w.ruleId} - ${w.reason}`));
    }

    out.push('');
    const counts = Object.entries(result.counts).filter(([, n]) => n > 0).map(([s, n]) => `${n} ${s}`).join(', ') || 'clean';
    out.push(`${bold('Summary')}  ${counts}`);
    for (const [gate, c] of Object.entries(result.perGate)) {
        out.push(dim(`  ${gate.padEnd(20)} ${c.error} error, ${c.warn} warn, ${c.info} info`));
    }
    for (const b of result.breaches) {
        out.push(SEVERITY_STYLE.error(`  budget: ${b.gate} allows ${b.limit} ${b.severity} per change, found ${b.actual}`));
    }
    out.push('');
    out.push(result.failing ? SEVERITY_STYLE.error('gate failed') : green('gate passed'));
    out.push(dim('  waive a genuine exception with: // gate-allow <rule-id> -- <reason>'));
    return out.join('\n');
}

/** Compact form for a Claude hook: no colour, no prose, just what to change. */
export function renderHook({ findings }) {
    const lines = [];
    for (const f of findings) {
        lines.push(`${f.file}:${f.line}  [${f.severity}] ${f.ruleId} - ${f.title}`);
        if (f.detail) lines.push(`    ${f.detail}`);
        if (f.excerpt) lines.push(`    > ${f.excerpt}`);
        if (f.fix) lines.push(`    fix: ${f.fix}`);
    }
    return lines.join('\n');
}

export function renderMarkdown({ findings, waived, result, profileName, scanned, gates }) {
    const out = ['<!-- quality-gate-report -->', '## Quality Gate'];
    const verdict = result.failing ? '**failed**' : '**passed**';
    const counts = Object.entries(result.counts).filter(([, n]) => n > 0).map(([s, n]) => `${n} ${s}`).join(', ') || 'no findings';
    out.push(`${verdict} - profile \`${profileName}\` - ${pluralize(scanned, 'changed file')} checked - ${counts}`);
    out.push('');

    out.push('| Gate | Error | Warn | Info |');
    out.push('|:--|--:|--:|--:|');
    for (const gate of gates) {
        const c = result.perGate[gate] ?? { error: 0, warn: 0, info: 0 };
        out.push(`| \`${gate}\` | ${c.error} | ${c.warn} | ${c.info} |`);
    }
    out.push('');

    for (const b of result.breaches) {
        out.push(`> Budget breach: \`${b.gate}\` allows ${b.limit} ${b.severity} per change, found ${b.actual}.`);
        out.push('');
    }

    if (findings.length > 0) {
        for (const [gate, group] of groupBy(findings, (f) => f.gate)) {
            out.push(`<details open><summary><b>${gate}</b> - ${pluralize(group.length, 'finding')}</summary>`);
            out.push('');
            out.push('| File | Rule | What |');
            out.push('|:--|:--|:--|');
            for (const f of group) {
                const what = [f.title, f.detail].filter(Boolean).join(' - ').replace(/\|/g, '\\|');
                out.push(`| \`${f.file}:${f.line}\` | \`${f.ruleId}\` | ${what} |`);
            }
            out.push('');
            const seen = new Set();
            for (const f of group) {
                if (seen.has(f.ruleId)) continue;
                seen.add(f.ruleId);
                out.push(`- **\`${f.ruleId}\`** - ${f.why}<br>_Fix:_ ${f.fix}`);
            }
            out.push('');
            out.push('</details>');
            out.push('');
        }
    }

    if (waived.length > 0) {
        out.push('<details><summary>Waived</summary>');
        out.push('');
        for (const w of waived) out.push(`- \`${w.file}:${w.line}\` \`${w.ruleId}\` - ${w.reason}`);
        out.push('');
        out.push('</details>');
    }

    out.push('');
    out.push('<sub>Run `npm run gate` locally. Waive a genuine exception with `// gate-allow &lt;rule-id&gt; -- &lt;reason&gt;`.</sub>');
    return out.join('\n');
}

export function renderJson({ findings, waived, result, profileName, scanned }) {
    return JSON.stringify({ profile: profileName, scanned, result, findings, waived }, null, 2);
}
