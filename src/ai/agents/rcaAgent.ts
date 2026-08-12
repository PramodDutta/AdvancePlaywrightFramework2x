/**
 * RCA Agent stub.
 *
 * Real implementation requires an LLM provider key (e.g. OpenAI / Anthropic).
 * When the key is missing the reporter skips AI verdict generation gracefully.
 */

export interface RcaVerdict {
    severity: 'critical' | 'high' | 'medium' | 'low';
    priority: string;
    rootCause: string;
    fixes: string[];
}

export async function analyzeFailure(_input: {
    title: string;
    file: string;
    error: string;
    stack?: string;
}): Promise<RcaVerdict> {
    // Stub — real analysis requires an LLM backend.
    // The reporter calls hasApiKey() first and won't reach here without a key.
    throw new Error('RCA agent: no LLM backend configured.');
}
