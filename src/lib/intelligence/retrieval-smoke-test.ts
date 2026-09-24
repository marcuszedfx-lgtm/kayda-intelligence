import assert from 'node:assert/strict';
import type { IntelligenceSource } from '@/types/core-intelligence';
import { createRetrieval } from './retrieval';
import {
  SourceTransportError,
  type SourceTransport,
  type SourceTransportResponse,
} from './source-transport';

const now = new Date().toISOString();

function source(id: string): IntelligenceSource {
  return {
    id,
    locator: `https://${id}.example/report`,
    sourceType: 'public_web_source',
    discoveredBy: 'smoke-test',
    discoveryProvenanceIds: [],
    validation: {
      status: 'validated',
      identityConfirmed: false,
      accessibilityConfirmed: true,
      checkedAt: now,
      confidence: 0.6,
      provenanceIds: [],
    },
    reliability: {
      score: 0.5,
      basis: ['Synthetic smoke-test source.'],
      assessedAt: now,
      confidence: 0.5,
      provenanceIds: [],
    },
    access: {
      method: 'https',
      status: 'reachable',
      lastCheckedAt: now,
      attributes: {},
    },
    status: 'validated',
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
    finalUrl: 'https://final.example/report',
    body: '<article>Safe source content.</article>',
    bodyBytes: 39,
    redirectCount: 1,
    protected: false,
    ...overrides,
  };
}

const transport: SourceTransport = {
  async fetchSource(locator) {
    if (locator.includes('protected')) {
      return transportResponse({
        status: 403,
        statusText: 'Forbidden',
        ok: false,
        body: '',
        bodyBytes: 0,
        protected: true,
        protection: 'access_forbidden',
      });
    }

    if (locator.includes('http-error')) {
      return transportResponse({
        status: 503,
        statusText: 'Service Unavailable',
        ok: false,
        body: '<html>Temporary error</html>',
      });
    }

    if (locator.includes('binary')) {
      return transportResponse({
        contentType: 'application/pdf',
        body: '%PDF-synthetic-content',
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

    if (locator.includes('network')) {
      throw new SourceTransportError(
        'NETWORK_ERROR',
        'Synthetic network failure.',
      );
    }

    return transportResponse();
  },
};

async function run() {
  const result = await createRetrieval({ transport }).retrieve({
    sources: [
      source('success'),
      source('protected'),
      source('unsafe'),
      source('timeout'),
      source('network'),
      source('http-error'),
      source('binary'),
    ],
  });

  assert.equal(result.evidence.length, 1);
  assert.equal(result.provenance.length, 7);
  assert.equal(result.errors.length, 6);

  const evidence = result.evidence[0];
  assert.equal(evidence.sourceId, 'success');
  assert.equal(evidence.locator, 'https://final.example/report');
  assert.equal(evidence.extractionMethod, 'raw_transport_response');
  assert.equal(evidence.provenanceIds.length, 1);

  const outcomes = new Map(
    result.provenance.map((record) => [
      record.sourceId,
      record.attributes.transportStatus,
    ]),
  );

  assert.equal(outcomes.get('success'), 'retrieved');
  assert.equal(outcomes.get('protected'), 'protected');
  assert.equal(outcomes.get('unsafe'), 'unsafe_target');
  assert.equal(outcomes.get('timeout'), 'timeout');
  assert.equal(outcomes.get('network'), 'network_error');
  assert.equal(
    outcomes.get('http-error'),
    'unexpected_response',
  );
  assert.equal(
    outcomes.get('binary'),
    'unsupported_content_type',
  );

  const protectedProvenance = result.provenance.find(
    (record) => record.sourceId === 'protected',
  );
  assert.equal(
    protectedProvenance?.attributes.protection,
    'access_forbidden',
  );
  assert.equal(
    protectedProvenance?.attributes.httpStatus,
    403,
  );

  console.log('✓ V1.5 retrieval smoke test passed.');
  console.log('  Successful retrieval created evidence; protected and failed attempts created provenance only.');
}

run().catch((error) => {
  console.error('✗ V1.5 retrieval smoke test failed.');
  console.error(error);
  process.exit(1);
});
