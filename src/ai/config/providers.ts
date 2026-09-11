/**
 * LLM provider registry.
 *
 * Five providers behind one config surface. Four of them (DeepSeek, OpenRouter,
 * Groq, OpenAI) speak the OpenAI /chat/completions shape; Anthropic uses
 * /v1/messages, so LLMClient branches on `dialect` rather than on provider name.
 *
 * Selection is env-driven, never import-driven:
 *   AI_PROVIDER  deepseek | openrouter | groq | openai | anthropic   (default: deepseek)
 *   AI_MODEL     overrides the provider default
 *   AI_BASE_URL  overrides the provider default (proxies, gateways)
 *   <PROVIDER>_API_KEY  e.g. DEEPSEEK_API_KEY
 */

import { envOr } from '@config/env';

type ProviderName = 'deepseek' | 'openrouter' | 'groq' | 'openai' | 'anthropic';
type Dialect = 'openai' | 'anthropic';

interface ProviderSpec {
    name: ProviderName;
    dialect: Dialect;
    baseUrl: string;
    defaultModel: string;
    keyEnv: string;
}

const PROVIDERS: Record<ProviderName, ProviderSpec> = {
    deepseek: {
        name: 'deepseek', dialect: 'openai',
        baseUrl: 'https://api.deepseek.com', defaultModel: 'deepseek-chat',
        keyEnv: 'DEEPSEEK_API_KEY',
    },
    openrouter: {
        name: 'openrouter', dialect: 'openai',
        baseUrl: 'https://openrouter.ai/api/v1', defaultModel: 'deepseek/deepseek-chat',
        keyEnv: 'OPENROUTER_API_KEY',
    },
    groq: {
        name: 'groq', dialect: 'openai',
        baseUrl: 'https://api.groq.com/openai/v1', defaultModel: 'llama-3.3-70b-versatile',
        keyEnv: 'GROQ_API_KEY',
    },
    openai: {
        name: 'openai', dialect: 'openai',
        baseUrl: 'https://api.openai.com/v1', defaultModel: 'gpt-4o-mini',
        keyEnv: 'OPENAI_API_KEY',
    },
    anthropic: {
        name: 'anthropic', dialect: 'anthropic',
        baseUrl: 'https://api.anthropic.com/v1', defaultModel: 'claude-sonnet-5',
        keyEnv: 'ANTHROPIC_API_KEY',
    },
};

export interface ResolvedProvider extends ProviderSpec {
    model: string;
    apiKey?: string;
}

/** The provider selected by AI_PROVIDER, with model, base URL and key resolved. */
export function resolveProvider(): ResolvedProvider {
    const requested = envOr('AI_PROVIDER', 'deepseek').toLowerCase() as ProviderName;
    const spec = PROVIDERS[requested] ?? PROVIDERS.deepseek;
    const key = envOr(spec.keyEnv, '').trim();

    return {
        ...spec,
        baseUrl: envOr('AI_BASE_URL', spec.baseUrl),
        model: envOr('AI_MODEL', spec.defaultModel),
        apiKey: key === '' ? undefined : key,
    };
}

/**
 * Whether the selected provider has a key. The reporter calls this before any
 * AI path, so a missing key degrades to "no AI tabs" instead of an error.
 */
export function hasApiKey(): boolean {
    return resolveProvider().apiKey !== undefined;
}
