/**
 * detectors.mjs - the primitives a rule can be built from.
 *
 * The split is deliberate: detectors are code and live here, rules are data and
 * live in `rules/*.rules.mjs`. Adding "no `page.pause()` in specs" should be a
 * four-line data change, not a code change. A detector only earns its place
 * when a regex genuinely cannot express the idea.
 */
import { blockAfter, statementCount } from './source.mjs';

const EXCERPT_MAX = 120;

const excerptAt = (file, line) => (file.lines[line - 1] ?? '').trim().slice(0, EXCERPT_MAX);
const at = (file, line, detail) => ({ line, excerpt: excerptAt(file, line), detail });
const globalize = (re) => new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);

/** Splits identifiers and prose into comparable lowercase word sets. */
function words(text) {
    return new Set(
        text
            .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
            .split(/[^A-Za-z]+/)
            .map((w) => w.toLowerCase())
            .filter((w) => w.length > 3 && !STOP_WORDS.has(w)),
    );
}

const STOP_WORDS = new Set([
    'this', 'that', 'then', 'with', 'from', 'into', 'await', 'async', 'const', 'test', 'page',
    'here', 'when', 'will', 'should', 'have', 'been', 'they', 'them', 'also', 'your', 'have',
]);

/**
 * How much of `prose` the `code` already says - deliberately directional.
 *
 * Dividing by the smaller set was the first attempt and it was wrong: a short
 * code line whose two identifiers both appear in a long comment scored 1.0, so
 * `// No token argument: BookingApi re-auths on a 403 and retries` was reported
 * as restating `updateBooking(...)`. That comment is the best line in the file.
 * Measured against the comment's own word count it scores 0.14 and is left
 * alone, while `// click the login button` over `el.click(loginButton)` scores
 * 1.0 and is reported. The question is whether the comment adds anything, so
 * the comment has to be the denominator.
 */
function coverage(prose, code) {
    let shared = 0;
    for (const w of prose) if (code.has(w)) shared += 1;
    return prose.size === 0 ? 0 : shared / prose.size;
}

function matchParen(masked, openIdx) {
    let depth = 0;
    for (let i = openIdx; i < masked.length; i += 1) {
        if (masked[i] === '(') depth += 1;
        else if (masked[i] === ')') { depth -= 1; if (depth === 0) return i; }
    }
    return -1;
}

/**
 * Finds `pattern(` call sites and, where the call takes a callback, its body.
 *
 * The arrow is located at argument depth so a destructured parameter list does
 * not get mistaken for the body: in `test('x', async ({ page }) => { ... })`
 * the first `{` belongs to `{ page }`, not to the test.
 */
export function callSites(file, pattern) {
    const re = globalize(pattern);
    const sites = [];
    for (const m of file.masked.matchAll(re)) {
        const open = file.masked.indexOf('(', m.index + m[0].length - 1);
        if (open < 0) continue;
        const close = matchParen(file.masked, open);
        if (close < 0) continue;

        let depth = 0;
        let arrow = -1;
        for (let i = open + 1; i < close; i += 1) {
            const ch = file.masked[i];
            if ('([{'.includes(ch)) depth += 1;
            else if (')]}'.includes(ch)) depth -= 1;
            else if (ch === '=' && file.masked[i + 1] === '>' && depth === 0) { arrow = i; break; }
        }
        const block = arrow < 0 ? null : blockAfter(file.masked, arrow);
        const nameMatch = file.text.slice(open, Math.min(close, open + 200)).match(/['"`]([^'"`]{2,})['"`]/);
        sites.push({
            index: m.index,
            line: file.lineAt(m.index),
            name: nameMatch ? nameMatch[1] : null,
            args: file.masked.slice(open + 1, close),
            body: block ? block.body : null,
            bodyStart: block ? block.start : -1,
            bodyEnd: block ? block.end : -1,
            callEnd: close,
        });
    }
    return sites;
}

/** Plain pattern match against code, comments, strings, or the raw text. */
function regex(file, rule) {
    const { pattern, target = 'code', unless, detail } = rule.options;
    const re = globalize(pattern);
    const found = [];

    if (target === 'comments' || target === 'strings') {
        for (const item of target === 'comments' ? file.comments : file.strings) {
            const value = target === 'comments' ? item.text : item.value;
            if (!re.test(value)) { re.lastIndex = 0; continue; }
            re.lastIndex = 0;
            if (unless && unless.test(value)) continue;
            found.push(at(file, item.line, detail));
        }
        return found;
    }

    const haystack = target === 'raw' ? file.text : file.masked;
    for (const m of haystack.matchAll(re)) {
        const line = file.lineAt(m.index);
        if (unless && unless.test(file.lines[line - 1] ?? '')) continue;
        found.push(at(file, line, detail));
    }
    return found;
}

/**
 * A comment or log line that says what the next line of code already says.
 *
 * Overlap is measured on word sets, so `// click the login button` over
 * `await this.el.click(this.loginButton)` scores high while
 * `// booker returns 201, not 204` over a delete call scores zero. The second
 * comment carries information the code cannot; that is the whole distinction.
 */
function echoesNeighbour(file, rule) {
    const { source = 'comments', anchor, within = 1, minOverlap = 0.6, minWords = 2, detail } = rule.options;
    const found = [];
    const items = source === 'comments'
        ? file.comments.filter((c) => c.kind === 'line')
        : file.strings.filter((s) => !anchor || anchor.test(file.maskedLines[s.line - 1] ?? ''));

    for (const item of items) {
        const text = source === 'comments' ? item.text : item.value;
        const prose = words(text);
        if (prose.size < minWords) continue;

        for (let offset = 1; offset <= within; offset += 1) {
            for (const line of [item.line + offset, item.line - offset]) {
                // Presence of code is decided on the masked line (so a run of
                // comments is skipped), but the comparison uses the raw one.
                // `// click the login button` is echoing `'#login-button'`, and
                // masking blanks exactly the literal the comment is repeating.
                if (!file.maskedLines[line - 1]?.trim()) continue;
                if (coverage(prose, words(file.lines[line - 1])) >= minOverlap) {
                    found.push(at(file, item.line, detail ?? `restates line ${line}`));
                    offset = within; // one report per comment
                    break;
                }
            }
        }
    }
    return found;
}

/**
 * A `log.*` call inside a `test.step` whose message repeats the step name.
 *
 * Straight out of this repo's own ponytail table: "Ten log.info lines - each
 * restated its own step name". The step name is already in the HTML report and
 * the trace, so the log line is a third copy of the same sentence.
 */
function stepLogEcho(file, rule) {
    const { call = /\btest\.step\s*\(/, logPattern = /\blog(?:ger)?\.(?:info|debug|warn)\s*\(/, minOverlap = 0.5, detail } = rule.options ?? {};
    const found = [];
    for (const site of callSites(file, call)) {
        if (!site.name || site.bodyStart < 0) continue;
        const stepWords = words(site.name);
        if (stepWords.size < 2) continue;
        for (const str of file.strings) {
            if (str.start <= site.bodyStart || str.start >= site.bodyEnd) continue;
            if (!logPattern.test(file.maskedLines[str.line - 1] ?? '')) continue;
            if (coverage(stepWords, words(str.value)) >= minOverlap) {
                found.push(at(file, str.line, detail ?? `repeats the step name "${site.name}"`));
            }
        }
    }
    return found;
}

/** A callback wrapper (`test.step`, `describe`) around too little to be worth it. */
function callWrapsFewStatements(file, rule) {
    const { call, maxStatements = 1, detail } = rule.options;
    return callSites(file, call)
        .filter((s) => s.body !== null && statementCount(s.body) <= maxStatements)
        .map((s) => at(file, s.line, detail ?? `wraps ${statementCount(s.body)} statement(s)`));
}

/** A block that never does the one thing it exists to do (usually: assert). */
function blockMissing(file, rule) {
    const { call, required, requiredLabel = 'required call', skipIf, detail } = rule.options;
    return callSites(file, call)
        .filter((s) => s.body !== null && !required.test(s.body) && !(skipIf && skipIf.test(s.body)))
        .map((s) => at(file, s.line, detail ?? `"${s.name ?? 'block'}" contains no ${requiredLabel}`));
}

/** Budgets: length, comment density, ceremony per assertion, pattern counts. */
function metric(file, rule) {
    const { metric: kind, max, pattern, detail } = rule.options;
    const codeLines = file.maskedLines.filter((l) => l.trim().length > 0).length;
    let value;
    let label;

    switch (kind) {
        case 'fileLines':
            value = codeLines;
            label = `${value} code lines`;
            break;
        case 'commentDensity': {
            const commentLines = file.comments.reduce((n, c) => n + (c.kind === 'line' ? 1 : c.text.split('\n').length), 0);
            value = codeLines === 0 ? 0 : Number((commentLines / codeLines).toFixed(2));
            label = `${Math.round(value * 100)}% of lines are comments`;
            break;
        }
        case 'ceremonyRatio': {
            const assertions = (file.masked.match(/\bexpect\s*[.(]/g) ?? []).length;
            if (assertions === 0) return [];
            value = Number((codeLines / assertions).toFixed(1));
            label = `${value} code lines per assertion (${codeLines}/${assertions})`;
            break;
        }
        case 'patternCount':
            value = (file.masked.match(globalize(pattern)) ?? []).length;
            label = `${value} occurrences`;
            break;
        default:
            return [];
    }

    if (value <= max) return [];
    return [{ line: 1, excerpt: file.path, detail: detail ? `${detail} (${label}, budget ${max})` : `${label}, budget ${max}` }];
}

/** Two test bodies that are the same shape with different literals. */
function duplicateBlocks(file, rule, ctx) {
    const { call, minStatements = 4, detail } = rule.options;
    if (!ctx.duplicateCache) {
        ctx.duplicateCache = new Map();
        for (const f of ctx.files) {
            for (const site of callSites(f, call)) {
                if (!site.body || statementCount(site.body) < minStatements) continue;
                const shape = site.body.replace(/\s+/g, '').replace(/\d+/g, 'N').replace(/['"`]\s*['"`]/g, 'S');
                if (shape.length < 80) continue;
                if (!ctx.duplicateCache.has(shape)) ctx.duplicateCache.set(shape, []);
                ctx.duplicateCache.get(shape).push({ file: f.path, line: site.line, name: site.name });
            }
        }
    }
    const found = [];
    for (const group of ctx.duplicateCache.values()) {
        if (group.length < 2) continue;
        for (const hit of group.filter((g) => g.file === file.path)) {
            const others = group.filter((g) => g !== hit).map((g) => `${g.file}:${g.line}`).join(', ');
            found.push(at(file, hit.line, detail ?? `identical in shape to ${others}`));
        }
    }
    return found;
}

/** An export nothing imports: surface area with no consumer. */
function unusedExport(file, rule, ctx) {
    const { layers = [], ignoreNames = [], kinds = null, detail } = rule.options ?? {};
    if (layers.length > 0 && !layers.includes(file.layer)) return [];
    if (ctx.index.stringRefs.has(file.path)) return [];
    return file.exports
        .filter((e) => !ignoreNames.includes(e.name))
        .filter((e) => !kinds || kinds.includes(e.kind))
        .filter((e) => ctx.index.consumersOfExport(file.path, e.name).length === 0)
        .map((e) => at(file, e.line, detail ?? `\`${e.name}\` is exported but never imported`));
}

/** An abstraction built for exactly one caller. */
function singleConsumer(file, rule, ctx) {
    const { layers = ['util', 'api'], minLines = 15, detail } = rule.options ?? {};
    if (!layers.includes(file.layer)) return [];
    if (ctx.index.stringRefs.has(file.path)) return [];
    const codeLines = file.maskedLines.filter((l) => l.trim().length > 0).length;
    if (codeLines < minLines) return [];

    const consumers = new Set(ctx.index.importersOf(file.path).map((i) => i.from));
    if (consumers.size !== 1) return [];
    return [at(file, 1, detail ?? `${codeLines} lines of shared module, one caller: ${[...consumers][0]}`)];
}

/** A method whose body is one call forwarding the same arguments. */
function delegatingWrapper(file, rule) {
    const { detail } = rule.options ?? {};
    const found = [];
    const methodRe = /^[ \t]*(?:public\s+|private\s+|protected\s+)?(?:static\s+)?(?:async\s+)?([A-Za-z0-9_$]+)\s*\(([^)]*)\)\s*(?::\s*[^{;]+)?\{/gm;

    for (const m of file.masked.matchAll(methodRe)) {
        const name = m[1];
        if (['if', 'for', 'while', 'switch', 'catch', 'constructor', 'function', 'return'].includes(name)) continue;
        const block = blockAfter(file.masked, m.index + m[0].length - 1);
        if (!block || statementCount(block.body) !== 1) continue;

        const single = block.body.trim().match(/^(?:return\s+)?(?:await\s+)?([\w.$]+)\s*\(([^()]*)\)\s*;?$/);
        if (!single) continue;

        const params = m[2].split(',').map((p) => p.split(':')[0].replace(/[?.]/g, '').trim()).filter(Boolean);
        const args = single[2].split(',').map((a) => a.trim()).filter(Boolean);
        if (params.length === 0 || params.length !== args.length) continue;
        if (!params.every((p, i) => args[i] === p)) continue;

        const callee = single[1].split('.').pop();
        found.push(at(file, file.lineAt(m.index), detail ?? `\`${name}()\` forwards its arguments unchanged to \`${callee}()\``));
    }
    return found;
}

/** Import-shape policy: which layer may import what, and by which specifier. */
function importShape(file, rule) {
    const { forbidSource, requireAliasAcrossLayers, allowNames = [], detail } = rule.options;
    const found = [];
    for (const imp of file.imports) {
        if (forbidSource && forbidSource.test(imp.source)) {
            if (imp.names.length > 0 && imp.names.every((n) => allowNames.includes(n))) continue;
            found.push(at(file, imp.line, detail ?? `imports from \`${imp.source}\``));
            continue;
        }
        if (requireAliasAcrossLayers && /^\.\.\//.test(imp.source)) {
            const target = imp.source.replace(/^(\.\.\/)+/, '').split('/')[0];
            if (['pages', 'api', 'utils', 'config', 'fixtures', 'testdata'].includes(target)) {
                found.push(at(file, imp.line, `use \`@${target === 'utils' ? 'utils' : target}/...\` instead of \`${imp.source}\``));
            }
        }
    }
    return found;
}

/** How many classes deep a page object sits below BasePage. */
function inheritanceDepth(file, rule, ctx) {
    const { max = 2, detail } = rule.options ?? {};
    return file.classes
        .filter((c) => c.extends)
        .map((c) => ({ c, depth: ctx.index.inheritanceDepth(file, c.name) }))
        .filter(({ depth }) => depth > max)
        .map(({ c, depth }) => at(file, c.line, detail ?? `\`${c.name}\` is ${depth} levels below its root, budget ${max}`));
}

/** A file that never does something it is required to do. */
function fileMissing(file, rule) {
    const { required, skipIf, detail } = rule.options;
    if (skipIf && skipIf.test(file.masked)) return [];
    if (required.test(file.masked)) return [];
    return [{ line: 1, excerpt: file.path, detail }];
}

export const detectors = {
    regex,
    echoesNeighbour,
    stepLogEcho,
    callWrapsFewStatements,
    blockMissing,
    metric,
    duplicateBlocks,
    unusedExport,
    singleConsumer,
    delegatingWrapper,
    importShape,
    inheritanceDepth,
    fileMissing,
};
