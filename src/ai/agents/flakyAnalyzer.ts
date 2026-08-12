/**
 * Flaky Test Analyzer stub.
 *
 * Diffs two build snapshots to detect flaky tests.  The reporter calls this
 * after `snapshotAndLoadPrev()` has collected the current + previous run data.
 */

export interface BuildSummary {
    runId: string;
    tests: Record<string, string>; // testFullTitle → status
}

export interface FlakyResult {
    counts: { flaky: number; failing: number; total: number };
    flaky: string[]; // test full-titles that flipped status
    summary?: string; // optional LLM-generated summary
}

export async function analyzeFlaky(
    prev: BuildSummary,
    curr: BuildSummary,
    _hasApiKey: boolean,
): Promise<FlakyResult> {
    // Deterministic diff — no LLM call needed for the stub.
    const allTests = new Set([...Object.keys(prev.tests), ...Object.keys(curr.tests)]);
    const flaky: string[] = [];

    for (const name of allTests) {
        const a = prev.tests[name];
        const b = curr.tests[name];
        if (a && b && a !== b) {
            flaky.push(name);
        }
    }

    return {
        counts: { flaky: flaky.length, failing: Object.values(curr.tests).filter((s) => s === 'failed' || s === 'timedOut').length, total: allTests.size },
        flaky,
        summary: flaky.length === 0 ? 'No flaky tests detected.' : undefined,
    };
}
