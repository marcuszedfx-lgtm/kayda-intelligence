import assert from 'node:assert/strict';
import type {
  IntelligenceEvidence,
  IntelligenceObjective,
  IntelligenceProvenance,
  IntelligenceReference,
  IntelligenceSource,
} from '@/types/core-intelligence';
import { createIntelligenceEngine } from './engine';
import type { IntelligenceRetrieval } from './retrieval';
import type { ReferenceDiscovery } from './reference-discovery';
import type { SourceDiscovery } from './source-discovery';
import type { SourceValidation } from './source-validation';

const now = '2026-09-23T09:00:00.000Z';

const reference: IntelligenceReference = {
  id: 'reference-example',
  value: 'Example Company',
  type: 'entity',
  aliases: [],
  attributes: {},
  confidence: 1,
  provenanceIds: [],
};

const objective: IntelligenceObjective = {
  id: 'objective-engine-test',
  statement: 'Find relevant developments for Example Company.',
  intent: 'discover_and_retrieve',
  constraints: [],
  references: [reference],
  evidenceRequirements: [],
  status: 'active',
  createdAt: now,
  updatedAt: now,
};

function source(id: string): IntelligenceSource {
  return {
    id,
    locator: `https://${id}.example/source`,
    sourceType: 'public_web_source',
    discoveredBy: 'smoke-test',
    discoveryProvenanceIds: ['provenance-discovery'],
    validation: {
      status: 'not_checked',
      checkedAt: now,
      identityConfirmed: false,
      accessibilityConfirmed: false,
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

function provenance(
  id: string,
  sourceId?: string,
): IntelligenceProvenance {
  return {
    id,
    recordType: sourceId ? 'source' : 'objective',
    recordId: sourceId ?? objective.id,
    ...(sourceId ? { sourceId } : {}),
    parentProvenanceIds: [],
    operation: 'smoke-test',
    actor: 'smoke-test',
    createdAt: now,
    attributes: {},
  };
}

const discoveredSources = [
  source('retrievable'),
  source('protected'),
];

let referenceDiscoveryCalled = false;
let validationInput: IntelligenceSource[] = [];
let retrievalInput: IntelligenceSource[] = [];

const referenceDiscovery: ReferenceDiscovery = {
  async discover(input) {
    referenceDiscoveryCalled = true;
    assert.equal(input.objective.id, objective.id);
    return {
      references: input.objective.references,
      provenance: [provenance('provenance-reference-discovery')],
      errors: [],
    };
  },
};

const discovery: SourceDiscovery = {
  async discover(input) {
    assert.deepEqual(input.references, objective.references);
    assert.deepEqual(input.entities, []);

    return {
      sources: discoveredSources,
      references: input.references,
      entities: input.entities,
      provenance: [provenance('provenance-discovery')],
      errors: [],
    };
  },
};

const validation: SourceValidation = {
  async validate(input) {
    validationInput = input.sources;

    return {
      sources: input.sources.map((item) => {
        const validated = item.id === 'retrievable';

        return {
          ...item,
          validation: {
            ...item.validation,
            status: validated ? 'validated' : 'protected',
            accessibilityConfirmed: validated,
            provenanceIds: [
              `provenance-validation-${item.id}`,
            ],
          },
          access: {
            ...item.access,
            status: validated ? 'reachable' : 'protected',
          },
          status: validated ? 'validated' : 'protected',
        };
      }),
      provenance: input.sources.map((item) =>
        provenance(`provenance-validation-${item.id}`, item.id),
      ),
      errors: ['Synthetic protected source.'],
    };
  },
};

const retrieval: IntelligenceRetrieval = {
  async retrieve(input) {
    retrievalInput = input.sources;

    const evidence: IntelligenceEvidence = {
      id: 'evidence-retrievable',
      sourceId: 'retrievable',
      retrievedAt: now,
      locator: 'https://retrievable.example/source',
      content: '<article>Safe raw evidence.</article>',
      extractionMethod: 'raw_transport_response',
      extractionConfidence: 0.5,
      freshness: {
        retrievedAt: now,
        status: 'retrieved',
        confidence: 1,
      },
      claimIds: [],
      entityReferenceIds: [],
      geographyReferenceIds: [],
      industryReferenceIds: [],
      topicReferenceIds: [],
      provenanceIds: ['provenance-retrieval-retrievable'],
    };

    return {
      evidence: [evidence],
      provenance: [
        provenance(
          'provenance-retrieval-retrievable',
          'retrievable',
        ),
      ],
      errors: [],
    };
  },
};

async function run() {
  const engine = createIntelligenceEngine({
    referenceDiscovery,
    sourceDiscovery: discovery,
    sourceValidation: validation,
    retrieval,
    now: () => new Date(now),
  });

  const result = await engine.run({ objective });

  assert.equal(referenceDiscoveryCalled, true);
  assert.deepEqual(validationInput, discoveredSources);
  assert.deepEqual(
    retrievalInput.map((item) => item.id),
    ['retrievable'],
  );
  assert.equal(result.sources.length, 2);
  assert.equal(result.evidence.length, 1);
  assert.equal(result.provenance.length, 5);
  assert.equal(result.status, 'completed_with_warnings');
  assert.equal(result.completedAt, now);
  assert.deepEqual(result.claims, []);
  assert.deepEqual(result.findings, []);
  assert.deepEqual(result.signals, []);

  console.log('✓ V1.5 engine orchestration smoke test passed.');
  console.log('  Only validated and reachable sources reached retrieval; protected sources retained provenance only.');
}

run().catch((error) => {
  console.error('✗ V1.5 engine orchestration smoke test failed.');
  console.error(error);
  process.exit(1);
});
