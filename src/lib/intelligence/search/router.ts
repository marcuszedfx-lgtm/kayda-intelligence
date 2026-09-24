import type {
  SearchProvider,
  SearchProviderStatus,
  SearchRequest,
  SearchResponse,
  SearchRouterOptions,
} from './types';

export class SearchRouterError extends Error {
  constructor(
    message: string,
    public readonly attempts: string[],
  ) {
    super(message);
    this.name = 'SearchRouterError';
  }
}

function isFailoverStatus(
  status: SearchProviderStatus,
): boolean {
  return (
    status === 'rate_limited' ||
    status === 'quota_exhausted' ||
    status === 'temporarily_unavailable'
  );
}

export class SearchRouter {
  private readonly providers: SearchProvider[];

  constructor(options: SearchRouterOptions) {
    this.providers = options.providers;
  }

  async search(
    request: SearchRequest,
  ): Promise<SearchResponse> {
    const attempts: string[] = [];

    for (const provider of this.providers) {
      let status: SearchProviderStatus;

      try {
        status = await provider.getStatus();
      } catch (error) {
        attempts.push(
          `${provider.id}: status check failed - ${
            error instanceof Error
              ? error.message
              : String(error)
          }`,
        );
        continue;
      }

      if (status === 'disabled') {
        attempts.push(`${provider.id}: disabled`);
        continue;
      }

      if (isFailoverStatus(status)) {
        attempts.push(`${provider.id}: ${status}`);
        continue;
      }

      try {
        return await provider.search(request);
      } catch (error) {
        attempts.push(
          `${provider.id}: search failed - ${
            error instanceof Error
              ? error.message
              : String(error)
          }`,
        );
      }
    }

    throw new SearchRouterError(
      'No configured search provider could complete the request.',
      attempts,
    );
  }
}
