/**
 * Self-healing locator agent — proposes replacements for a locator that no
 * longer matches anything.
 *
 * It only ever *suggests*. Nothing here rewrites a spec file, because a
 * selector an LLM invented and nobody checked is a worse failure than the one
 * it replaced: the test goes green while asserting on the wrong element.
 * Verification against the live page happens in @utils/selfHeal, and only
 * verified candidates are reported.
 */

import { createAgent } from '../agentFactory';
import schema from '@testdata/schemas/ai-heal-candidates.schema.json';

export interface HealCandidate {
    selector: string;
    strategy: 'css' | 'testid' | 'role' | 'text' | 'label' | 'placeholder';
    reasoning: string;
}

export interface HealCandidates {
    candidates: HealCandidate[];
}

export interface HealInput {
    /** The selector that matched nothing. */
    failedSelector: string;
    /** What the element is for, e.g. "the username field". */
    intent: string;
    /** Trimmed markup of the interactive elements actually on the page. */
    domDigest: string;
}

const SYSTEM =
    'You repair broken Playwright locators. You are given a selector that matched nothing and ' +
    'the interactive elements actually present on the page. You reply with JSON only: no prose, ' +
    'no markdown fences. Only propose selectors for elements that appear in the supplied markup.';

export const selfHealAgent = createAgent<HealInput, HealCandidates>({
    name: 'self-heal',
    system: SYSTEM,
    schema: schema as object,
    temperature: 0,
    maxTokens: 900,
    buildPrompt: ({ failedSelector, intent, domDigest }) => `
This Playwright locator matched 0 elements:

    ${failedSelector}

It was meant to find: ${intent}

These are the interactive elements actually on the page:

${domDigest}

Reply with JSON only:
{"candidates":[{"selector":"...","strategy":"css|testid|role|text|label|placeholder","reasoning":"..."}]}

Rules:
- Every selector must target an element present in the markup above. Do not invent attributes.
- Order candidates best first. Prefer stable attributes (data-test, id, name) over text or position.
- Use Playwright selector syntax. For role, write it as: role=button[name="Login"]
- Give 2 to 4 candidates so a human has a real choice, not one guess.
`.trim(),
});
