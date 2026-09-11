/**
 * RCA agent — explains why a test failed and how badly it matters.
 *
 * The reporter calls analyzeFailure() for each failed test and renders the
 * result in the AI Verdict tab: severity and priority as badges, the root
 * cause as prose, the fixes as a list. That shape predates this agent, so the
 * schema below matches it exactly rather than inventing a new one.
 *
 * Severity and priority live here rather than in a separate triage agent: one
 * call is cheaper, and it keeps the two consistent with the explanation that
 * justified them.
 */

import { createAgent } from '../agentFactory';
import schema from '@testdata/schemas/ai-rca-verdict.schema.json';

export interface RcaVerdict {
    severity: 'critical' | 'high' | 'medium' | 'low';
    priority: string;
    rootCause: string;
    fixes: string[];
}

export interface FailureInput {
    title: string;
    file: string;
    error: string;
    stack?: string;
}

const SYSTEM =
    'You are a senior test automation engineer triaging a failed Playwright test. ' +
    'You reply with JSON only: no prose, no markdown fences. Be specific about this ' +
    'failure. Never suggest deleting or skipping the test to make it pass.';

const rcaAgent = createAgent<FailureInput, RcaVerdict>({
    name: 'rca',
    system: SYSTEM,
    schema: schema as object,
    temperature: 0,
    maxTokens: 700,
    buildPrompt: ({ title, file, error, stack }) => `
A Playwright test failed. Analyse it.

Test:  ${title}
File:  ${file}
Error: ${error}
${stack ? `Stack:\n${stack.split('\n').slice(0, 12).join('\n')}` : ''}

Reply with JSON only:
{"severity":"critical|high|medium|low","priority":"P0|P1|P2|P3",
"rootCause":"why this failed, naming the specific assertion or call",
"fixes":["concrete step","concrete step"]}

Guidance:
- rootCause names the actual assertion or call that broke, not a generic category.
- severity reflects user impact if this were real; priority reflects fix urgency.
- A wrong assertion in the test is usually medium/P2; a broken product path is high or critical.
- fixes are concrete actions, not "investigate further".
`.trim(),
});

/**
 * Analyse one failure. Throws when no verdict can be produced, which the
 * reporter catches per test so one bad analysis cannot lose the others.
 */
export async function analyzeFailure(input: FailureInput): Promise<RcaVerdict> {
    const result = await rcaAgent.run(input);
    if (!result.available) {
        throw new Error(`RCA agent unavailable: ${result.reason}`);
    }
    return result.data;
}
