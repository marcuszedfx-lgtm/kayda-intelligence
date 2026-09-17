import type {
  AIProvider,
  AIProviderStatus,
  AIRequest,
  AIResponse,
  AIRouterOptions,
} from "./types";

export class AIRouterError extends Error {
  constructor(
    message: string,
    public readonly attempts: string[],
  ) {
    super(message);
    this.name = "AIRouterError";
  }
}

function isFailoverStatus(status: AIProviderStatus): boolean {
  return (
    status === "rate_limited" ||
    status === "quota_exhausted" ||
    status === "temporarily_unavailable"
  );
}

export class AIRouter {
  private readonly providers: AIProvider[];

  constructor(options: AIRouterOptions) {
    this.providers = options.providers;
  }

  async complete(request: AIRequest): Promise<AIResponse> {
    const attempts: string[] = [];

    for (const provider of this.providers) {
      if (!provider.capabilities.includes(request.capability)) {
        attempts.push(
          `${provider.id}: capability ${request.capability} not supported`,
        );
        continue;
      }

      let status: AIProviderStatus;

      try {
        status = await provider.getStatus();
      } catch (error) {
        attempts.push(
          `${provider.id}: status check failed - ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        continue;
      }

      if (status === "disabled") {
        attempts.push(`${provider.id}: disabled`);
        continue;
      }

      if (isFailoverStatus(status)) {
        attempts.push(`${provider.id}: ${status}`);
        continue;
      }

      try {
        return await provider.complete(request);
      } catch (error) {
        attempts.push(
          `${provider.id}: completion failed - ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    throw new AIRouterError(
      "No configured AI provider could complete the request.",
      attempts,
    );
  }
}
