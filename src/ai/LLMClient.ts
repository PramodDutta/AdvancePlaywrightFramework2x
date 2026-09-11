/**
 * LLMClient — one transport for every supported provider.
 *
 * Speaks two dialects: the OpenAI /chat/completions shape (DeepSeek, OpenRouter,
 * Groq, OpenAI) and Anthropic /v1/messages. Callers never see the difference.
 *
 * Uses global fetch (Node 18+), so no HTTP dependency is added.
 */

import { createLogger } from '@utils/logger';
import { resolveProvider, type ResolvedProvider } from './config/providers';

const log = createLogger('llm-client');

export interface CompletionRequest {
    system: string;
    user: string;
    /** Upper bound on response size. Cost control, not a quality knob. */
    maxTokens?: number;
    /** 0 keeps generated test data reproducible enough to debug. */
    temperature?: number;
    timeoutMs?: number;
}

export interface CompletionResult {
    text: string;
    model: string;
    provider: string;
    latencyMs: number;
    promptTokens?: number;
    completionTokens?: number;
}

/** Thrown for transport and HTTP failures. Callers above catch and degrade. */
export class LLMError extends Error {
    constructor(message: string, readonly status?: number) {
        super(`[LLMClient] ${message}`);
    }
}

export class LLMClient {
    private readonly provider: ResolvedProvider;

    constructor(provider: ResolvedProvider = resolveProvider()) {
        this.provider = provider;
    }

    get isAvailable(): boolean {
        return this.provider.apiKey !== undefined;
    }

    get description(): string {
        return `${this.provider.name}/${this.provider.model}`;
    }

    async complete(req: CompletionRequest): Promise<CompletionResult> {
        if (!this.provider.apiKey) {
            throw new LLMError(`no API key: set ${this.provider.keyEnv} in .env`);
        }

        const timeoutMs = req.timeoutMs ?? 30_000;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        const started = Date.now();

        try {
            const { url, headers, body } = this.buildRequest(req);
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
                signal: controller.signal,
            });

            if (!response.ok) {
                // Body may carry a provider error message, but can also echo the
                // prompt, so only the status line is surfaced.
                throw new LLMError(`${this.provider.name} returned ${response.status}`, response.status);
            }

            const json = await response.json() as Record<string, unknown>;
            const result = this.parseResponse(json, Date.now() - started);

            // Never log prompt or completion text: it can carry application data.
            log.info(
                `${result.provider}/${result.model} ${result.latencyMs}ms ` +
                `in=${result.promptTokens ?? '?'} out=${result.completionTokens ?? '?'}`,
            );
            return result;
        } catch (error) {
            if (error instanceof LLMError) throw error;
            if ((error as Error).name === 'AbortError') {
                throw new LLMError(`timed out after ${timeoutMs}ms`);
            }
            throw new LLMError((error as Error).message);
        } finally {
            clearTimeout(timer);
        }
    }

    private buildRequest(req: CompletionRequest) {
        const { provider } = this;
        const maxTokens = req.maxTokens ?? 1024;
        const temperature = req.temperature ?? 0;

        if (provider.dialect === 'anthropic') {
            return {
                url: `${provider.baseUrl}/messages`,
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': provider.apiKey as string,
                    'anthropic-version': '2023-06-01',
                },
                body: {
                    model: provider.model,
                    max_tokens: maxTokens,
                    temperature,
                    system: req.system,
                    messages: [{ role: 'user', content: req.user }],
                },
            };
        }

        return {
            url: `${provider.baseUrl}/chat/completions`,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${provider.apiKey}`,
            },
            body: {
                model: provider.model,
                max_tokens: maxTokens,
                temperature,
                messages: [
                    { role: 'system', content: req.system },
                    { role: 'user', content: req.user },
                ],
            },
        };
    }

    private parseResponse(json: Record<string, unknown>, latencyMs: number): CompletionResult {
        const base = { model: this.provider.model, provider: this.provider.name, latencyMs };

        if (this.provider.dialect === 'anthropic') {
            const content = json.content as { type: string; text?: string }[] | undefined;
            const text = content?.find((c) => c.type === 'text')?.text;
            const usage = json.usage as { input_tokens?: number; output_tokens?: number } | undefined;
            if (text === undefined) throw new LLMError('anthropic response had no text block');
            return { ...base, text, promptTokens: usage?.input_tokens, completionTokens: usage?.output_tokens };
        }

        const choices = json.choices as { message?: { content?: string } }[] | undefined;
        const text = choices?.[0]?.message?.content;
        const usage = json.usage as { prompt_tokens?: number; completion_tokens?: number } | undefined;
        if (text === undefined) throw new LLMError('response had no choices[0].message.content');
        return { ...base, text, promptTokens: usage?.prompt_tokens, completionTokens: usage?.completion_tokens };
    }
}

export default LLMClient;
