import assert from 'node:assert/strict';

import {
  AI_PROVIDER_CONFIGS,
  SEARCH_PROVIDER_CONFIGS,
  getConfiguredAIProviders,
  getConfiguredSearchProviders,
} from './provider-config';

assert.equal(AI_PROVIDER_CONFIGS.length, 8);
assert.deepEqual(
  AI_PROVIDER_CONFIGS.map((provider) => provider.id),
  [
    'gemini',
    'qwen',
    'groq',
    'cerebras',
    'mistral',
    'openai',
    'anthropic',
    'deepseek',
  ],
);

assert.equal(SEARCH_PROVIDER_CONFIGS.length, 2);
assert.deepEqual(
  SEARCH_PROVIDER_CONFIGS.map((provider) => provider.id),
  ['brave', 'tavily'],
);

const configuredAI = getConfiguredAIProviders();
const configuredSearch = getConfiguredSearchProviders();

assert.equal(Array.isArray(configuredAI), true);
assert.equal(Array.isArray(configuredSearch), true);

console.log('✓ Provider configuration smoke test passed.');
console.log(
  `  AI providers configured: ${configuredAI.length}`,
);
console.log(
  `  Search providers configured: ${configuredSearch.length}`,
);
