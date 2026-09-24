import assert from 'node:assert/strict';
import type { IntelligenceSource } from '@/types/core-intelligence';
import { createSourceValidation } from './source-validation';
import {
  SourceTransportError,
  type SourceTransport,
  type SourceTransportResponse,
} from './source-transport';

const now = new Date().toISOString();

function source(id: string): IntelligenceSource {
  return {
    id,
    locator: `https://${id}.example/source`,
    sourceType: 'public_web_source',
    discoveredBy: 'smoke-test',
    discoveryProvenanceIds: [],
    validation: {
      status: 'not_checked',
      identityConfirmed: false,
      accessibilityConfirmed: false,
      checkedAt: now,
      confidence: 0,
      provenanceIds: [],
    },
    reliability: {
      score: 0,
      basis: [],
      assessedAt: now,
      confidence: 0,
      provenanceIds: [],
    },
    access: {
      method: 'web',
      status: 'unknown',
      attributes: {},
    },
    status: 'discovered',
    attributes: {},
  };
}

function transportResponse(
  overrides: Partial<SourceTransportResponse> = {},
): SourceTransportResponse {
  return {
    status: 200,
    statusText: 'OK',
    ok: true,
    contentType: 'text/html; charset=utf-8',
    finalUrl: 'https://final.example/source',
    body: '<html>Safe source</html>',
    bodyBytes: 24,
    redirectCount: 1,
    protected: false,
    ...overrides,
  };
}

const transport: SourceTransport = {
  async fetchSource(locator) {
    if (locator.includes('protected')) {
      return transportResponse({
        status: 429,
        statusText: 'Too Many Requests',
        ok: false,
        body: '',
        bodyBytes: 0,
        protected: true,
        protection: 'rate_limited',
      });
    }

    if (locator.includes('http-error')) {
      return transportResponse({
        status: 500,
        statusText: 'Server Error',
        ok: false,
      });
    }

    if (locator.includes('unsafe')) {
      throw new SourceTransportError(
        'UNSAFE_URL',
        'Synthetic unsafe target.',
      );
    }

    if (locator.includes('timeout')) {
      throw new SourceTransportError(
        'TIMEOUT',
        'Synthetic timeout.',
      );
    }

    return transportResponse();
  },
};

async function run() {
  const result = await createSourceValidation({
    transport,
  }).validate({
    sources: [
      source('success'),
      source('protected'),
      source('unsafe'),
      source('timeout'),
      source('http-error'),
    ],
  });

  assert.equal(result.sources.length, 5);
  assert.equal(result.provenance.length, 5);
  assert.equal(result.errors.length, 4);

  const byId = new Map(
    result.sources.map((item) => [item.id, item]),
  );

  const successfulSource = byId.get('success');
  assert.equal(successfulSource?.status, 'validated');
  assert.equal(
    successfulSource?.validation.accessibilityConfirmed,
    true,
  );
  assert.equal(
    successfulSource?.validation.identityConfirmed,
    false,
  );
  assert.equal(successfulSource?.access.status, 'reachable');

  assert.equal(byId.get('protected')?.status, 'protected');
  assert.equal(byId.get('unsafe')?.status, 'unsafe_target');
  assert.equal(byId.get('timeout')?.status, 'timeout');
  assert.equal(
    byId.get('http-error')?.status,
    'unexpected_response',
  );

  const outcomes = new Map(
    result.provenance.map((record) => [
      record.sourceId,
      record.attributes.validationStatus,
    ]),
  );

  assert.equal(outcomes.get('success'), 'validated');
  assert.equal(outcomes.get('protected'), 'protected');
  assert.equal(outcomes.get('unsafe'), 'unsafe_target');
  assert.equal(outcomes.get('timeout'), 'timeout');
  assert.equal(
    outcomes.get('http-error'),
    'unexpected_response',
  );

  const protectedProvenance = result.provenance.find(
    (record) => record.sourceId === 'protected',
  );
  assert.equal(
    protectedProvenance?.attributes.protection,
    'rate_limited',
  );
  assert.equal(
    protectedProvenance?.attributes.responseSizeBytes,
    0,
  );

  console.log('✓ V1.5 source validation smoke test passed.');
  console.log('  Reachability, protected responses, and transport failures are recorded without automatic identity approval.');
}

run().catch((error) => {
  console.error('✗ V1.5 source validation smoke test failed.');
  console.error(error);
  process.exit(1);
});
