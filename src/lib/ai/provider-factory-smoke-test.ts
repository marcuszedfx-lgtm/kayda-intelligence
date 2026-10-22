import assert from 'node:assert/strict';

import { AI_PROVIDER_CONFIGS } from './provider-config';
import {
  buildAIRouterFromEnv,
  getAIProviderStatuses,
  getSearchProviderStatuses,
} from './provider-factory';

/**
 * Provider factory smoke test.
 *
 * Deterministic: no network call is made, because the factory
 * only reads environment variables.
 */

const MANAGED_ENV = AI_PROVIDER_CONFIGS.flatMap((config) => [
  config.apiKeyEnv,
  config.modelEnv,
  ...(config.baseUrlEnv ? [config.baseUrlEnv] : []),
]).concat(['BRAVE_SEARCH_API_KEY', 'TAVILY_API_KEY']);

const saved = new Map<string, string | undefined>();

for (const name of MANAGED_ENV) {
  saved.set(name, process.env[name]);
  delete process.env[name];
}

function restoreEnv() {
  for (const [name, value] of saved) {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
}

try {
  // 1. Nothing configured: every provider is honestly off and
  //    no router is handed back.
  {
    const statuses = getAIProviderStatuses();

    assert.equal(statuses.length, AI_PROVIDER_CONFIGS.length);
    assert.ok(
      statuses.every((status) => status.configured === false),
      'no provider may be reported configured without credentials',
    );
    assert.ok(
      statuses.every(
        (status) =>
          typeof status.reason === 'string' && status.reason.length > 0,
      ),
      'every unconfigured provider must explain why',
    );
    assert.equal(buildAIRouterFromEnv(), undefined);
  }

  // 2. A fully configured OpenAI-compatible provider becomes
  //    usable and is reported without secrets.
  {
    process.env.GROQ_API_KEY = 'test-key-do-not-log';
    process.env.GROQ_MODEL = 'test-model';

    const statuses = getAIProviderStatuses();
    const groq = statuses.find((status) => status.id === 'groq');

    assert.ok(groq);
    assert.equal(groq.configured, true);
    assert.equal(groq.adapter, 'openai-compatible');
    assert.equal(groq.model, 'test-model');
    assert.equal(groq.reason, undefined);

    const serialized = JSON.stringify(statuses);
    assert.ok(
      !serialized.includes('test-key-do-not-log'),
      'provider status must never contain an API key',
    );

    const built = buildAIRouterFromEnv();
    assert.ok(built, 'a configured provider must produce a router');
    assert.deepEqual(built.providerIds, ['groq']);
  }

  // 3. A key without a model is not "configured", and the
  //    missing variable is named.
  {
    delete process.env.GROQ_API_KEY;
    delete process.env.GROQ_MODEL;

    process.env.OPENAI_API_KEY = 'test-key';

    const openai = getAIProviderStatuses().find(
      (status) => status.id === 'openai',
    );

    assert.ok(openai);
    assert.equal(openai.configured, false);
    assert.match(openai.reason ?? '', /OPENAI_MODEL/);
    assert.equal(buildAIRouterFromEnv(), undefined);
  }

  // 4. Anthropic has credentials but no adapter: it must not be
  //    reported usable, and must not enter the router.
  {
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
    process.env.ANTHROPIC_MODEL = 'test-anthropic-model';

    const anthropic = getAIProviderStatuses().find(
      (status) => status.id === 'anthropic',
    );

    assert.ok(anthropic);
    assert.equal(anthropic.configured, false);
    assert.equal(anthropic.adapter, 'not_implemented');
    assert.match(anthropic.reason ?? '', /No adapter is implemented/);

    assert.equal(
      buildAIRouterFromEnv(),
      undefined,
      'an unimplemented adapter must never be built',
    );
  }

  // 5. Qwen needs an explicit base URL; without it the
  //    provider is not usable.
  {
    delete process.env.OPENAI_API_KEY;
    process.env.QWEN_API_KEY = 'test-qwen-key';
    process.env.QWEN_MODEL = 'test-qwen-model';

    const qwen = getAIProviderStatuses().find(
      (status) => status.id === 'qwen',
    );

    assert.ok(qwen);
    assert.equal(qwen.configured, false);
    assert.match(qwen.reason ?? '', /QWEN_BASE_URL/);

    process.env.QWEN_BASE_URL = 'https://example.invalid/v1';

    const configuredQwen = getAIProviderStatuses().find(
      (status) => status.id === 'qwen',
    );

    assert.ok(configuredQwen);
    assert.equal(configuredQwen.configured, true);

    delete process.env.QWEN_BASE_URL;
    delete process.env.QWEN_API_KEY;
    delete process.env.QWEN_MODEL;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_MODEL;
  }

  // 6. Search providers are never claimed to be implemented.
  {
    process.env.BRAVE_SEARCH_API_KEY = 'test-brave-key';

    const search = getSearchProviderStatuses();
    const brave = search.find((provider) => provider.id === 'brave');

    assert.ok(brave);
    assert.equal(brave.apiKeyPresent, true);
    assert.equal(brave.implemented, false);
    assert.ok(search.every((provider) => provider.implemented === false));
    assert.ok(
      !JSON.stringify(search).includes('test-brave-key'),
      'search status must never contain an API key',
    );
  }

  console.log('✓ Provider factory smoke test passed.');
  console.log('  No network calls. Unconfigured providers, missing');
  console.log('  models, absent base URLs and unimplemented adapters');
  console.log('  are all reported honestly; secrets never appear.');
} finally {
  restoreEnv();
}
