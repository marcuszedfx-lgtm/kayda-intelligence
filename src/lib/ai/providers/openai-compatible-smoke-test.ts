import assert from 'node:assert/strict';

import {
  AIProviderRequestError,
  createOpenAICompatibleProvider,
} from './openai-compatible';

import type { AIRequest } from '../types';

async function run() {
  const requests: Request[] = [];

  const fakeFetch: typeof fetch = async (
    input,
    init,
  ) => {
    requests.push(new Request(input, init));

    return new Response(
      JSON.stringify({
        model: 'test-model',
        choices: [
          {
            message: {
              content: 'Provider adapter works.',
            },
          },
        ],
        usage: {
          prompt_tokens: 12,
          completion_tokens: 8,
        },
      }),
      {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      },
    );
  };

  const provider =
    createOpenAICompatibleProvider({
      id: 'test-provider',
      name: 'Test Provider',
      apiKey: 'test-key',
      model: 'test-model',
      baseUrl: 'https://example.com/v1',
      capabilities: [
        'structured_extraction',
        'reasoning',
        'synthesis',
      ],
      fetchImpl: fakeFetch,
    });

  assert.equal(
    await provider.getStatus(),
    'available',
  );

  const request: AIRequest = {
    capability: 'reasoning',
    systemPrompt: 'You are a test system.',
    userPrompt: 'Return a test result.',
    maxOutputTokens: 50,
  };

  const response =
    await provider.complete(request);

  assert.equal(
    response.providerId,
    'test-provider',
  );

  assert.equal(
    response.modelId,
    'test-model',
  );

  assert.equal(
    response.content,
    'Provider adapter works.',
  );

  assert.equal(
    response.usage?.inputTokens,
    12,
  );

  assert.equal(
    response.usage?.outputTokens,
    8,
  );

  assert.equal(requests.length, 1);

  assert.equal(
    requests[0].url,
    'https://example.com/v1/chat/completions',
  );

  const body =
    (await requests[0].json()) as {
      model: string;
      messages: Array<{
        role: string;
        content: string;
      }>;
      max_tokens?: number;
    };

  assert.equal(
    body.model,
    'test-model',
  );

  assert.deepEqual(
    body.messages,
    [
      {
        role: 'system',
        content: 'You are a test system.',
      },
      {
        role: 'user',
        content: 'Return a test result.',
      },
    ],
  );

  assert.equal(body.max_tokens, 50);

  const disabled =
    createOpenAICompatibleProvider({
      id: 'disabled-provider',
      name: 'Disabled Provider',
      apiKey: '',
      model: '',
      baseUrl: 'https://example.com/v1',
      capabilities: ['reasoning'],
      fetchImpl: fakeFetch,
    });

  assert.equal(
    await disabled.getStatus(),
    'disabled',
  );

  await assert.rejects(
    () =>
      disabled.complete({
        capability: 'reasoning',
        systemPrompt: 'x',
        userPrompt: 'y',
      }),
    AIProviderRequestError,
  );

  console.log(
    '✓ OpenAI-compatible AI provider smoke test passed.',
  );
}

run().catch((error: unknown) => {
  console.error(
    '✗ OpenAI-compatible AI provider smoke test failed.',
  );
  console.error(error);
  process.exit(1);
});
