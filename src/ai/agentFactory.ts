/**
 * Agent factory — turns a prompt plus a JSON Schema into a callable agent.
 *
 * Adding an agent is a config object, not a new file of HTTP code:
 *
 *   const agent = createAgent({
 *       name: 'my-agent',
 *       system: 'You are ...',
 *       schema: mySchema,
 *       buildPrompt: (input) => `...`,
 *   });
 *   const result = await agent.run(input);
 *   if (result.available) use(result.data);
 *
 * Two guarantees callers depend on:
 *   - `data` is schema-valid or `available` is false. There is no third state.
 *   - Nothing throws for a missing key, so a test suite runs unchanged without one.
 */

import { createLogger } from '@utils/logger';
import { SchemaValidator } from '@utils/SchemaValidator';
import { LLMClient, LLMError } from './LLMClient';

interface AgentSpec<TInput> {
    name: string;
    system: string;
    /** JSON Schema the model output must satisfy. */
    schema: object;
    buildPrompt: (input: TInput) => string;
    maxTokens?: number;
    temperature?: number;
    timeoutMs?: number;
}

export type AgentResult<TOutput> =
    | { available: true; data: TOutput; provider: string; latencyMs: number }
    | { available: false; reason: string };

export interface Agent<TInput, TOutput> {
    run(input: TInput): Promise<AgentResult<TOutput>>;
}

/**
 * Pull a JSON object out of a model response. Models wrap JSON in prose or
 * ```json fences often enough that trusting a bare JSON.parse is a bug.
 */
function extractJson(text: string): unknown {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const candidate = (fenced ? fenced[1] : text).trim();
    const start = candidate.search(/[[{]/);
    if (start === -1) throw new Error('no JSON found in response');
    const end = Math.max(candidate.lastIndexOf(']'), candidate.lastIndexOf('}'));
    return JSON.parse(candidate.slice(start, end + 1));
}

export function createAgent<TInput, TOutput>(
    spec: AgentSpec<TInput>,
    client: LLMClient = new LLMClient(),
): Agent<TInput, TOutput> {
    const log = createLogger(`agent:${spec.name}`);

    return {
        async run(input: TInput): Promise<AgentResult<TOutput>> {
            if (!client.isAvailable) {
                // The normal path in CI. Not an error.
                return { available: false, reason: 'no API key configured' };
            }

            let prompt = spec.buildPrompt(input);

            // Two attempts: the retry feeds the validation error back so the
            // model can correct its own output. A third attempt rarely helps.
            for (let attempt = 1; attempt <= 2; attempt++) {
                try {
                    const completion = await client.complete({
                        system: spec.system,
                        user: prompt,
                        maxTokens: spec.maxTokens,
                        temperature: spec.temperature,
                        timeoutMs: spec.timeoutMs,
                    });

                    const parsed = extractJson(completion.text);
                    const { valid, errors } = SchemaValidator.validate(spec.schema, parsed);

                    if (valid) {
                        return {
                            available: true,
                            data: parsed as TOutput,
                            provider: `${completion.provider}/${completion.model}`,
                            latencyMs: completion.latencyMs,
                        };
                    }

                    log.warn(`attempt ${attempt} failed schema: ${errors.join('; ')}`);
                    if (attempt === 2) {
                        return { available: false, reason: `output failed schema: ${errors.join('; ')}` };
                    }
                    prompt =
                        `${prompt}\n\nYour previous reply did not match the required schema:\n` +
                        `${errors.map((e) => `- ${e}`).join('\n')}\n` +
                        `Reply again with JSON only, matching the schema exactly.`;
                } catch (error) {
                    const reason = error instanceof LLMError ? error.message : (error as Error).message;
                    log.warn(`attempt ${attempt} failed: ${reason}`);
                    if (attempt === 2) return { available: false, reason };
                }
            }

            return { available: false, reason: 'exhausted retries' };
        },
    };
}
