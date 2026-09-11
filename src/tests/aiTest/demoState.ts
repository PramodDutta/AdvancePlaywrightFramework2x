/**
 * Run counter for the flakiness demo.
 *
 * Real flakiness is non-deterministic, which makes it useless for a demo: you
 * cannot show a reliable "passes, then fails". This counts how many times each
 * test has run and lets a test fail on even-numbered runs, so run 1 is green,
 * run 2 is red, and the reporter's build-to-build diff has something real to
 * find.
 *
 * State lives beside the build snapshots the flaky analyzer already uses.
 */

import fs from 'fs';
import path from 'path';

const STATE_FILE = path.join('reports', 'ai-demo-state.json');

function read(): Record<string, number> {
    try {
        return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')) as Record<string, number>;
    } catch {
        return {};
    }
}

/** 1 on the first call for this key, 2 on the second, and so on. */
export function nthRun(key: string): number {
    const state = read();
    const next = (state[key] ?? 0) + 1;
    state[key] = next;
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    return next;
}

/** Forget every counter, so the next run is "run 1" again. */
export function resetDemoState(): void {
    fs.rmSync(STATE_FILE, { force: true });
}
