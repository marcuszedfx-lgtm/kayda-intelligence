import {
  AI_PROVIDER_CONFIGS,
  isEnvConfigured,
  type AIProviderConfig,
  type SearchProviderConfig,
} from './provider-config';
import { createOpenAICompatibleProvider } from './providers/openai-compatible';
import { AIRouter } from './router';
import type { AIProvider } from './types';

/**
 * =========================================================
 * KAYDA INTELLIGENCE — AI PROVIDER FACTORY
 * =========================================================
 *
 * Builds real AI providers from environment configuration,
 * reusing the existing OpenAI-compatible adapter and the
 * failover router.
 *
 * Safety rules:
 *
 * - No network call is ever made here. `getStatus()` is a
 *   local check of whether credentials are present; only an
 *   explicit `complete()` reaches out to a provider.
 * - Secret values are never logged, returned, or included in
 *   any status object. Only presence booleans and the
 *   configured model name are exposed.
 * - A provider is only "configured" when it is actually
 *   callable: an API key, a model, a resolvable base URL AND
 *   an implemented adapter. A vendor with no adapter is
 *   reported as not implemented rather than half-wired.
 * =========================================================
 */

/**
 * Providers whose HTTP API speaks the OpenAI chat-completions
 * shape, which is the only adapter implemented today.
 *
 * Anthropic's native Messages API is deliberately absent: it is
 * not OpenAI-compatible, so building one with this adapter
 * would produce a provider that always fails.
 */
const OPENAI_COMPATIBLE_ADAPTER_IDS: ReadonlySet<string> = new Set([
  'gemini',
  'qwen',
  'groq',
  'cerebras',
  'mistral',
  'openai',
  'deepseek',
]);

export type ProviderAdapterState =
  | 'openai-compatible'
  | 'not_implemented';

export interface ProviderStatusEntry {
  id: string;
  name: string;
  /** True only when this provider could actually serve a request. */
  configured: boolean;
  adapter: ProviderAdapterState;
  model?: string;
  costClass: 'free_tier' | 'optional_paid';
  /** Present only when configured=false, explaining why. */
  reason?: string;
}

export interface SearchProviderStatusEntry {
  id: string;
  name: string;
  apiKeyPresent: boolean;
  implemented: boolean;
  note: string;
}

/** Resolves a provider's base URL from env, then its default. */
function resolveBaseUrl(config: AIProviderConfig): string | undefined {
  if (config.baseUrlEnv) {
    return (
      process.env[config.baseUrlEnv]?.trim() || config.defaultBaseUrl
    );
  }

  return config.defaultBaseUrl;
}

function describeMissing(config: AIProviderConfig): string | undefined {
  if (!OPENAI_COMPATIBLE_ADAPTER_IDS.has(config.id)) {
    return `No adapter is implemented for ${config.name}. Its API is not OpenAI-compatible, so it cannot be called yet.`;
  }

  const missing: string[] = [];

  if (!isEnvConfigured(config.apiKeyEnv)) {
    missing.push(config.apiKeyEnv);
  }

  if (!isEnvConfigured(config.modelEnv)) {
    missing.push(config.modelEnv);
  }

  if (!resolveBaseUrl(config)) {
    missing.push(config.baseUrlEnv ?? 'base URL');
  }

  if (!missing.length) {
    return undefined;
  }

  return `Missing: ${missing.join(', ')}`;
}

/**
 * Reports the configuration state of every known AI provider
 * without exposing any secret value.
 */
export function getAIProviderStatuses(): ProviderStatusEntry[] {
  return AI_PROVIDER_CONFIGS.map((config) => {
    const adapter: ProviderAdapterState =
      OPENAI_COMPATIBLE_ADAPTER_IDS.has(config.id)
        ? 'openai-compatible'
        : 'not_implemented';

    const model = isEnvConfigured(config.modelEnv)
      ? process.env[config.modelEnv]?.trim()
      : undefined;

    const configured =
      adapter === 'openai-compatible' &&
      isEnvConfigured(config.apiKeyEnv) &&
      Boolean(model) &&
      Boolean(resolveBaseUrl(config));

    return {
      id: config.id,
      name: config.name,
      configured,
      adapter,
      ...(model ? { model } : {}),
      costClass: config.costClass,
      ...(configured
        ? {}
        : { reason: describeMissing(config) ?? 'Not configured' }),
    };
  });
}

/**
 * Reports search provider state honestly. No search adapter
 * is implemented yet, so `implemented` is false regardless of
 * whether an API key is present.
 */
export function getSearchProviderStatuses(): SearchProviderStatusEntry[] {
  return (
    Object.entries({
      brave: {
        name: 'Brave Search',
        apiKeyEnv: 'BRAVE_SEARCH_API_KEY',
      },
      tavily: {
        name: 'Tavily',
        apiKeyEnv: 'TAVILY_API_KEY',
      },
    } as const).map(([id, entry]) => {
      const config: SearchProviderConfig = {
        id,
        name: entry.name,
        apiKeyEnv: entry.apiKeyEnv,
        enabledByDefault: true,
        costClass: 'free_tier',
      };

      return {
        id: config.id,
        name: config.name,
        apiKeyPresent: isEnvConfigured(config.apiKeyEnv),
        implemented: false,
        note: 'No search adapter is implemented yet. The router and interfaces exist; wiring a real provider requires a separate, approved step.',
      };
    })
  );
}

/**
 * Builds a real AI provider from a config entry and the
 * environment. Returns undefined when the provider lacks the
 * credentials it needs or has no implemented adapter, so
 * callers cannot accidentally use a provider that will fail.
 */
export function buildAIProviderFromEnv(
  config: AIProviderConfig,
): AIProvider | undefined {
  if (!OPENAI_COMPATIBLE_ADAPTER_IDS.has(config.id)) {
    return undefined;
  }

  const apiKey = process.env[config.apiKeyEnv]?.trim();
  const model = process.env[config.modelEnv]?.trim();
  const baseUrl = resolveBaseUrl(config);

  if (!apiKey || !model || !baseUrl) {
    return undefined;
  }

  return createOpenAICompatibleProvider({
    id: config.id,
    name: config.name,
    apiKey,
    model,
    baseUrl,
    capabilities: config.capabilities,
  });
}

export interface BuiltAIRouter {
  router: AIRouter;
  providerIds: string[];
}

/**
 * Builds an AIRouter over every fully configured, callable
 * provider.
 *
 * Returns undefined when no provider is configured, so
 * callers must handle the honest "nothing configured" state
 * rather than receiving a router that will always fail.
 */
export function buildAIRouterFromEnv(): BuiltAIRouter | undefined {
  const providers: AIProvider[] = [];

  for (const config of AI_PROVIDER_CONFIGS) {
    const provider = buildAIProviderFromEnv(config);

    if (provider) {
      providers.push(provider);
    }
  }

  if (!providers.length) {
    return undefined;
  }

  return {
    router: new AIRouter({ providers }),
    providerIds: providers.map((provider) => provider.id),
  };
}
