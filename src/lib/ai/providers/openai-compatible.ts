import type {
  AICapability,
  AIProvider,
  AIProviderStatus,
  AIRequest,
  AIResponse,
} from '../types';

export class AIProviderRequestError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'AIProviderRequestError';
  }
}

export interface OpenAICompatibleProviderOptions {
  id: string;
  name: string;
  apiKey?: string;
  model?: string;
  baseUrl: string;
  capabilities: readonly AICapability[];
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  maxTokensField?: 'max_tokens' | 'max_output_tokens';
}

interface ChatCompletionResponse {
  model?: string;
  choices?: Array<{
    message?: {
      content?: unknown;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    input_tokens?: number;
    output_tokens?: number;
  };
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

function extractText(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }

  if (!Array.isArray(content)) {
    return '';
  }

  return content
    .map((part) => {
      if (
        part &&
        typeof part === 'object' &&
        'text' in part
      ) {
        const text = (part as { text?: unknown }).text;
        return typeof text === 'string' ? text : '';
      }

      return '';
    })
    .filter(Boolean)
    .join('');
}

async function readErrorMessage(
  response: Response,
): Promise<string> {
  try {
    const data = (await response.json()) as unknown;

    if (
      data &&
      typeof data === 'object' &&
      'error' in data
    ) {
      const error = (data as {
        error?: {
          message?: unknown;
        };
      }).error;

      if (
        error &&
        typeof error.message === 'string'
      ) {
        return error.message;
      }
    }
  } catch {
    // Ignore malformed error bodies.
  }

  return `Provider request failed with HTTP ${response.status}.`;
}

export function createOpenAICompatibleProvider(
  options: OpenAICompatibleProviderOptions,
): AIProvider {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const timeoutMs = options.timeoutMs ?? 30_000;
  const maxTokensField =
    options.maxTokensField ?? 'max_tokens';

  return {
    id: options.id,
    name: options.name,
    models: options.model ? [options.model] : [],
    capabilities: [...options.capabilities],

    async getStatus(): Promise<AIProviderStatus> {
      if (!options.apiKey || !options.model) {
        return 'disabled';
      }

      return 'available';
    },

    async complete(
      request: AIRequest,
    ): Promise<AIResponse> {
      if (!options.apiKey) {
        throw new AIProviderRequestError(
          `${options.id} API key is not configured.`,
        );
      }

      if (!options.model) {
        throw new AIProviderRequestError(
          `${options.id} model is not configured.`,
        );
      }

      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        timeoutMs,
      );

      const tokenField =
        request.maxOutputTokens !== undefined
          ? {
              [maxTokensField]:
                request.maxOutputTokens,
            }
          : {};

      try {
        const response = await fetchImpl(
          `${baseUrl}/chat/completions`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${options.apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: options.model,
              messages: [
                {
                  role: 'system',
                  content: request.systemPrompt,
                },
                {
                  role: 'user',
                  content: request.userPrompt,
                },
              ],
              ...(request.temperature !== undefined
                ? {
                    temperature:
                      request.temperature,
                  }
                : {}),
              ...tokenField,
            }),
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new AIProviderRequestError(
            await readErrorMessage(response),
            response.status,
          );
        }

        const data =
          (await response.json()) as ChatCompletionResponse;

        const content = extractText(
          data.choices?.[0]?.message?.content,
        );

        if (!content) {
          throw new AIProviderRequestError(
            `${options.id} returned an empty response.`,
            response.status,
          );
        }

        return {
          providerId: options.id,
          modelId:
            data.model ?? options.model,
          content,
          usage: {
            inputTokens:
              data.usage?.input_tokens ??
              data.usage?.prompt_tokens,
            outputTokens:
              data.usage?.output_tokens ??
              data.usage?.completion_tokens,
          },
        };
      } catch (error) {
        if (error instanceof AIProviderRequestError) {
          throw error;
        }

        if (
          error instanceof DOMException &&
          error.name === 'AbortError'
        ) {
          throw new AIProviderRequestError(
            `${options.id} request timed out after ${timeoutMs}ms.`,
          );
        }

        throw new AIProviderRequestError(
          `${options.id} request failed.`,
        );
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
