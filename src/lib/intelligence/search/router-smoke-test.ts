import {
  SearchRouter,
  SearchRouterError,
} from './router';

import type {
  SearchProvider,
  SearchRequest,
} from './types';

async function run() {
  const request: SearchRequest = {
    query: 'test intelligence search',
    maxResults: 5,
  };

  const providerA: SearchProvider = {
    id: 'provider-a',
    name: 'Test Provider A',
    async getStatus() {
      return 'quota_exhausted';
    },
    async search() {
      throw new Error('Provider A should not be called.');
    },
  };

  const providerB: SearchProvider = {
    id: 'provider-b',
    name: 'Test Provider B',
    async getStatus() {
      return 'available';
    },
    async search(searchRequest) {
      return {
        providerId: 'provider-b',
        results: [
          {
            title: 'Test result',
            url: 'https://example.com/test',
            snippet: `Search query: ${searchRequest.query}`,
            attributes: {},
          },
        ],
        searchedAt: new Date().toISOString(),
        attributes: {},
      };
    },
  };

  const router = new SearchRouter({
    providers: [providerA, providerB],
  });

  const response = await router.search(request);

  if (response.providerId !== 'provider-b') {
    throw new Error(
      `Expected provider-b, received ${response.providerId}`,
    );
  }

  if (response.results.length !== 1) {
    throw new Error(
      `Expected 1 result, received ${response.results.length}`,
    );
  }

  console.log('✓ Search router failover smoke test passed.');
  console.log(`  Selected provider: ${response.providerId}`);
  console.log(`  Result: ${response.results[0].title}`);

  const failingRouter = new SearchRouter({
    providers: [
      {
        ...providerA,
        getStatus: async () => 'temporarily_unavailable',
      },
      {
        ...providerB,
        getStatus: async () => 'rate_limited',
      },
    ],
  });

  try {
    await failingRouter.search(request);

    throw new Error(
      'Expected SearchRouterError when all providers fail.',
    );
  } catch (error: unknown) {
    if (!(error instanceof SearchRouterError)) {
      throw error;
    }

    if (error.attempts.length !== 2) {
      throw new Error(
        `Expected 2 recorded attempts, received ${error.attempts.length}`,
      );
    }
  }

  console.log('✓ Search router exhaustion test passed.');
}

run().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
