import type {
  AIProvider,
  AIResponse,
} from '@/lib/ai/types';
import { AIRouter } from '@/lib/ai/router';
import type {
  IntelligenceEvidence,
  IntelligenceObjective,
} from '@/types/core-intelligence';

import {
  createEvidenceAnalysis,
} from '@/lib/intelligence/evidence-analysis';

function assert(
  condition: boolean,
  message: string,
): void {
  if (!condition) {
    throw new Error(message);
  }
}

const fakeAIOutput = {
  assessments: [
    {
      evidenceId: 'evidence-1',
      relevanceScore: 0.95,
      reliabilityScore: 0.9,
      freshnessScore: 1,
      corroborationScore: 0.6,
      completenessScore: 0.8,
      overallConfidence: 0.88,
      supportingEvidenceIds: ['evidence-1'],
      conflictingEvidenceIds: [],
      reasoning:
        'The supplied evidence directly addresses the objective.',
    },
  ],
  claims: [
    {
      statement:
        'The supplier announced a pricing change.',
      predicate: 'announced_price_change',
      evidenceIds: ['evidence-1'],
      confidence: 0.92,
      status: 'supported',
    },
  ],
  findings: [
    {
      statement:
        'The pricing change may affect procurement planning.',
      claimIndexes: [0],
      evidenceIds: ['evidence-1'],
      referenceIds: [],
      relevanceScore: 0.9,
      confidenceScore: 0.85,
      importanceScore: 0.75,
      reasoning:
        'The claim is directly relevant to the business objective.',
      limitations: [
        'The supplied evidence does not quantify the price change.',
      ],
    },
  ],
  signals: [
    {
      type: 'commercial_change',
      statement:
        'A potential procurement-impacting pricing development has been identified.',
      findingIndexes: [0],
      evidenceIds: ['evidence-1'],
      relevanceScore: 0.85,
      confidenceScore: 0.8,
      potentialImpact:
        'Potential change to procurement economics.',
      reasoning:
        'The signal is derived from the supported finding.',
      recommendedAction:
        'Monitor subsequent supplier communications for confirmed pricing details.',
    },
  ],
};

const fakeResponse: AIResponse = {
  providerId: 'smoke-test-provider',
  modelId: 'smoke-test-model',
  content: JSON.stringify(fakeAIOutput),
};

const fakeProvider: AIProvider = {
  id: 'smoke-test-provider',
  name: 'Smoke Test Provider',
  models: ['smoke-test-model'],
  capabilities: ['reasoning'],
  async getStatus() {
    return 'available';
  },
  async complete() {
    return fakeResponse;
  },
};

const aiRouter = new AIRouter({
  providers: [fakeProvider],
});

const objective: IntelligenceObjective = {
  id: 'objective-smoke-test',
  statement:
    'Determine whether supplier developments could affect procurement planning.',
  intent: 'monitor',
  constraints: [],
  references: [],
  evidenceRequirements: [],
  status: 'active',
  createdAt: '2026-09-24T18:00:00.000Z',
  updatedAt: '2026-09-24T18:00:00.000Z',
};

const evidence: IntelligenceEvidence[] = [
  {
    id: 'evidence-1',
    sourceId: 'source-1',
    retrievedAt: '2026-09-24T18:00:00.000Z',
    locator: 'https://example.com/article',
    title: 'Supplier pricing announcement',
    content:
      'The supplier announced a pricing change.',
    extractionMethod: 'smoke-test',
    extractionConfidence: 1,
    freshness: {
      retrievedAt: '2026-09-24T18:00:00.000Z',
      status: 'fresh',
      confidence: 1,
    },
    claimIds: [],
    entityReferenceIds: [],
    geographyReferenceIds: [],
    industryReferenceIds: [],
    topicReferenceIds: [],
    provenanceIds: [],
  },
];

const analyzer = createEvidenceAnalysis({
  aiRouter,
  now: () =>
    new Date('2026-09-24T18:30:00.000Z'),
});

async function run(): Promise<void> {
  const result = await analyzer.analyze({
    objective,
    evidence,
  });

assert(
  result.aiResponse.providerId ===
    'smoke-test-provider',
  'Expected smoke-test provider to be recorded.',
);

assert(
  result.assessments.length === 1,
  'Expected one assessment.',
);

assert(
  result.claims.length === 1,
  'Expected one claim.',
);

assert(
  result.findings.length === 1,
  'Expected one finding.',
);

assert(
  result.signals.length === 1,
  'Expected one signal.',
);

assert(
  result.findings[0]?.claimIds[0] ===
    'claim-ai-1',
  'Expected finding to reference the generated claim.',
);

assert(
  result.signals[0]?.findingIds[0] ===
    'finding-ai-1',
  'Expected signal to reference the generated finding.',
);

assert(
  result.claims[0]?.evidenceIds[0] ===
    'evidence-1',
  'Expected claim to remain grounded in supplied evidence.',
);

assert(
  result.findings[0]?.objectiveId ===
    'objective-smoke-test',
  'Expected finding to reference the objective.',
);

assert(
  result.assessments[0]?.provenanceIds.length === 1,
  'Expected analyzer to attach assessment provenance.',
);

assert(
  result.claims[0]?.provenanceIds.length === 1,
  'Expected analyzer to attach claim provenance.',
);

assert(
  result.findings[0]?.provenanceIds.length === 1,
  'Expected analyzer to attach finding provenance.',
);

assert(
  result.signals[0]?.provenanceIds.length === 1,
  'Expected analyzer to attach signal provenance.',
);

console.log(
  'Evidence analysis end-to-end smoke test passed.',
);
console.log(
  'AI response parsed successfully.',
);
console.log(
  'Schema validation passed.',
);
console.log(
  'Evidence grounding passed.',
);
console.log(
  'Claims converted successfully.',
);
console.log(
  'Findings converted successfully.',
);
console.log(
  'Signals converted successfully.',
);
console.log(
    'Objective and evidence relationships preserved.',
  );
}

void run().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
