/**
 * source.mjs - turns a file on disk into a SourceFile record the detectors can
 * reason about.
 *
 * The one thing that makes a regex-based gate usable instead of noisy is
 * knowing which characters are code. `page.waitForTimeout` inside a doc comment
 * is documentation; inside a string it is a log message; only in code is it a
 * finding. `lex()` walks the text once and produces a `masked` copy where
 * comment bodies and string contents are blanked out (newlines preserved, so
 * every offset still maps to its original line). Rules run against `masked`
 * by default and opt into `comments` or `strings` when that is the point.
 */
import { readFileSync } from 'node:fs';

const LAYERS = [
    [/^src\/tests\//, 'spec'],
    [/^src\/pages\//, 'page'],
    [/^src\/fixtures\//, 'fixture'],
    [/^src\/api\//, 'api'],
    [/^src\/utils\//, 'util'],
    [/^src\/config\//, 'config'],
    [/^src\/testdata\//, 'testdata'],
    [/^src\/ai\//, 'ai'],
    [/^quality\//, 'quality'],
    [/^rules\//, 'quality'],
];

/** Maps a repo-relative path to the framework layer it belongs to. */
export function layerOf(relPath) {
    const p = relPath.replace(/\\/g, '/');
    for (const [re, layer] of LAYERS) if (re.test(p)) return layer;
    return 'other';
}

// A `/` starts a regex literal only where a value is expected. Getting this
// wrong turns `a / b // c` into a comment, so the check is worth the lines.
const REGEX_ALLOWED_BEFORE = new Set(['(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '+', '-', '*', '%', '<', '>', '~', '^', 'return', 'typeof', 'case', 'in', 'of', 'do', 'else', 'yield', 'await']);

function regexAllowedAt(text, i) {
    let j = i - 1;
    while (j >= 0 && /\s/.test(text[j])) j -= 1;
    if (j < 0) return true;
    const ch = text[j];
    if (REGEX_ALLOWED_BEFORE.has(ch)) return true;
    if (/[A-Za-z0-9_$]/.test(ch)) {
        let k = j;
        while (k >= 0 && /[A-Za-z0-9_$]/.test(text[k])) k -= 1;
        return REGEX_ALLOWED_BEFORE.has(text.slice(k + 1, j + 1));
    }
    return false;
}

/**
 * Single pass over the text. Returns the masked copy plus every comment and
 * string literal with the line it started on.
 */
export function lex(text) {
    const out = new Array(text.length);
    const comments = [];
    const strings = [];
    let line = 1;
    let i = 0;

    const blank = (from, to, keepNewlines = true) => {
        for (let k = from; k < to; k += 1) {
            out[k] = keepNewlines && text[k] === '\n' ? '\n' : ' ';
        }
    };

    while (i < text.length) {
        const ch = text[i];
        const next = text[i + 1];

        if (ch === '/' && next === '/') {
            const start = i;
            while (i < text.length && text[i] !== '\n') i += 1;
            comments.push({ line, kind: 'line', text: text.slice(start + 2, i).trim(), start, end: i });
            blank(start, i);
            continue;
        }

        if (ch === '/' && next === '*') {
            const start = i;
            const startLine = line;
            i += 2;
            while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) {
                if (text[i] === '\n') line += 1;
                i += 1;
            }
            i = Math.min(i + 2, text.length);
            comments.push({
                line: startLine,
                kind: text.startsWith('/**', start) ? 'jsdoc' : 'block',
                text: text.slice(start + 2, i - 2),
                start,
                end: i,
            });
            blank(start, i);
            continue;
        }

        if (ch === '"' || ch === "'" || ch === '`') {
            const quote = ch;
            const start = i;
            const startLine = line;
            i += 1;
            while (i < text.length) {
                if (text[i] === '\\') { i += 2; continue; }
                if (text[i] === quote) break;
                if (text[i] === '\n') {
                    line += 1;
                    if (quote !== '`') break; // unterminated: bail at the newline
                }
                i += 1;
            }
            const end = Math.min(i + 1, text.length);
            strings.push({ line: startLine, quote, value: text.slice(start + 1, end - 1), start, end });
            out[start] = quote;
            blank(start + 1, end - 1);
            out[end - 1] = text[end - 1] === '\n' ? '\n' : quote;
            i = end;
            continue;
        }

        if (ch === '/' && regexAllowedAt(text, i)) {
            const start = i;
            i += 1;
            let inClass = false;
            let closed = false;
            while (i < text.length && text[i] !== '\n') {
                if (text[i] === '\\') { i += 2; continue; }
                if (text[i] === '[') inClass = true;
                else if (text[i] === ']') inClass = false;
                else if (text[i] === '/' && !inClass) { closed = true; break; }
                i += 1;
            }
            if (closed) {
                i += 1;
                while (i < text.length && /[dgimsuvy]/.test(text[i])) i += 1;
                for (let k = start; k < i; k += 1) out[k] = text[k];
                continue;
            }
            i = start; // not a regex after all, fall through as a plain slash
        }

        out[i] = ch;
        if (ch === '\n') line += 1;
        i += 1;
    }

    return { masked: out.join(''), comments, strings };
}

function lineStarts(text) {
    const starts = [0];
    for (let i = 0; i < text.length; i += 1) if (text[i] === '\n') starts.push(i + 1);
    return starts;
}

const IMPORT_RE = /^[ \t]*import\s+(?:type\s+)?([\s\S]*?)\s*from\s*['"]([^'"]+)['"]/gm;
const BARE_IMPORT_RE = /^[ \t]*import\s*['"]([^'"]+)['"]/gm;
const REQUIRE_RE = /require\(\s*['"]([^'"]+)['"]\s*\)/g;
const EXPORT_DECL_RE = /^[ \t]*export\s+(?:default\s+)?(?:async\s+)?(?:abstract\s+)?(function|class|const|let|var|type|interface|enum)\s+([A-Za-z0-9_$]+)/gm;
const EXPORT_LIST_RE = /^[ \t]*export\s*\{([^}]*)\}/gm;
const CLASS_RE = /^[ \t]*(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+([A-Za-z0-9_$]+)(?:\s+extends\s+([A-Za-z0-9_$.]+))?/gm;

/** Reads one file and pre-computes everything the detectors ask for. */
export function readSource(absPath, relPath) {
    const text = readFileSync(absPath, 'utf8');
    const { masked, comments, strings } = lex(text);
    const starts = lineStarts(text);

    const lineAt = (offset) => {
        let lo = 0;
        let hi = starts.length - 1;
        while (lo < hi) {
            const mid = (lo + hi + 1) >> 1;
            if (starts[mid] <= offset) lo = mid; else hi = mid - 1;
        }
        return lo + 1;
    };

    const imports = [];
    for (const m of text.matchAll(IMPORT_RE)) {
        imports.push({
            line: lineAt(m.index),
            source: m[2],
            names: m[1].replace(/[{}]/g, ' ').split(',').map((s) => s.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean),
            raw: m[0].trim(),
        });
    }
    for (const m of text.matchAll(BARE_IMPORT_RE)) {
        imports.push({ line: lineAt(m.index), source: m[1], names: [], raw: m[0].trim() });
    }
    for (const m of masked.matchAll(REQUIRE_RE)) {
        // masked blanks the specifier, so re-read it from the raw text
        const raw = text.slice(m.index, m.index + m[0].length).match(/['"]([^'"]+)['"]/);
        if (raw) imports.push({ line: lineAt(m.index), source: raw[1], names: [], raw: raw[0] });
    }

    const exports = [];
    for (const m of masked.matchAll(EXPORT_DECL_RE)) {
        exports.push({ line: lineAt(m.index), name: m[2], kind: m[1] });
    }
    for (const m of masked.matchAll(EXPORT_LIST_RE)) {
        for (const name of m[1].split(',').map((s) => s.trim().split(/\s+as\s+/).pop().trim()).filter(Boolean)) {
            exports.push({ line: lineAt(m.index), name, kind: 'list' });
        }
    }

    const classes = [];
    for (const m of masked.matchAll(CLASS_RE)) {
        classes.push({ line: lineAt(m.index), name: m[1], extends: m[2] || null });
    }

    return {
        path: relPath.replace(/\\/g, '/'),
        abs: absPath,
        layer: layerOf(relPath),
        text,
        masked,
        lines: text.split('\n'),
        maskedLines: masked.split('\n'),
        comments,
        strings,
        imports,
        exports,
        classes,
        lineAt,
        isSpec: /\.spec\.ts$/.test(relPath),
    };
}

/**
 * Finds the `{ ... }` block that follows `fromIndex`, returning its bounds.
 * Brace counting is safe here because it runs on masked text: no braces from
 * strings, comments, or template interpolation survive into it.
 */
export function blockAfter(masked, fromIndex) {
    let i = masked.indexOf('{', fromIndex);
    if (i < 0) return null;
    let depth = 0;
    const start = i;
    for (; i < masked.length; i += 1) {
        if (masked[i] === '{') depth += 1;
        else if (masked[i] === '}') {
            depth -= 1;
            if (depth === 0) return { start, end: i + 1, body: masked.slice(start + 1, i) };
        }
    }
    return null;
}

/** Rough statement count for a block body: good enough to spot "wraps one call". */
export function statementCount(body) {
    const stripped = body.replace(/\s+/g, ' ').trim();
    if (!stripped) return 0;
    let depth = 0;
    let count = 0;
    let sawCode = false;
    for (let i = 0; i < body.length; i += 1) {
        const ch = body[i];
        if (ch === '(' || ch === '[' || ch === '{') depth += 1;
        else if (ch === ')' || ch === ']' || ch === '}') depth -= 1;
        else if (ch === ';' && depth === 0) { count += 1; sawCode = false; }
        else if (!/\s/.test(ch)) sawCode = true;
    }
    return count + (sawCode ? 1 : 0);
}
