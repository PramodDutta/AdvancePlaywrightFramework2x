/**
 * Flaky test analyzer — diffs two build snapshots to find tests that changed
 * status, then optionally asks a model to explain the pattern.
 *
 * The diff is deterministic and runs with no key. Only the summary is AI, and
 * only when there is something to summarise: asking a model to comment on an
 * empty list costs a call to be told nothing happened.
 */

import { createAgent } from '../agentFactory';
import schema from '@testdata/schemas/ai-flaky-summary.schema.json';

export interface BuildSummary {
    runId: string;
    tests: Record<string, string>; // testFullTitle -> status
}

export interface FlakyResult {
    counts: { flaky: number; failing: number; total: number };
    flaky: string[]; // test full-titles that flipped status
    summary?: string; // LLM-generated, absent without a key
}

interface FlakySummaryInput {
    prevId: string;
    currId: string;
    flips: { test: string; from: string; to: string }[];
    total: number;
}

const SYSTEM =
    'You are a senior test automation engineer reviewing test stability across two CI builds. ' +
    'You reply with JSON only: no prose, no markdown fences.';

const flakySummaryAgent = createAgent<FlakySummaryInput, { summary: string }>({
    name: 'flaky-summary',
    system: SYSTEM,
    schema: schema as object,
    temperature: 0,
    maxTokens: 500,
    buildPrompt: ({ prevId, currId, flips, total }) => `
${flips.length} of ${total} tests changed status between build ${prevId} and build ${currId}.

${flips.map((f) => `- ${f.test}: ${f.from} -> ${f.to}`).join('\n')}

Reply with JSON only: {"summary":"..."}

The summary should say what these tests have in common, the most likely cause of the
instability, and what to check first. Name the tests. Two to four sentences.
`.trim(),
});

export async function analyzeFlaky(
    prev: BuildSummary,
    curr: BuildSummary,
    hasApiKey: boolean,
): Promise<FlakyResult> {
    const allTests = new Set([...Object.keys(prev.tests), ...Object.keys(curr.tests)]);
    const flips: { test: string; from: string; to: string }[] = [];

    for (const name of allTests) {
        const a = prev.tests[name];
        const b = curr.tests[name];
        if (a && b && a !== b) {
            flips.push({ test: name, from: a, to: b });
        }
    }

    const counts = {
        flaky: flips.length,
        failing: Object.values(curr.tests).filter((s) => s === 'failed' || s === 'timedOut').length,
        total: allTests.size,
    };
    const flaky = flips.map((f) => f.test);

    if (flips.length === 0) {
        return { counts, flaky, summary: 'No flaky tests detected.' };
    }
    if (!hasApiKey) {
        return { counts, flaky };
    }

    const result = await flakySummaryAgent.run({
        prevId: prev.runId,
        currId: curr.runId,
        flips,
        total: allTests.size,
    });

    // A missing summary degrades the tab, it does not break the report.
    return { counts, flaky, summary: result.available ? result.data.summary : undefined };
}
