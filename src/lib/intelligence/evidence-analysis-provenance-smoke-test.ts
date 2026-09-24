import type {
  EvidenceAssessment,
  IntelligenceClaim,
  IntelligenceEvidence,
  IntelligenceFinding,
  IntelligenceObjective,
  IntelligenceSignal,
} from '@/types/core-intelligence';

import type { AIResponse } from '@/lib/ai/types';

import {
  attachEvidenceAnalysisProvenance,
} from '@/lib/intelligence/evidence-analysis-provenance';

function assert(
  condition: boolean,
  message: string,
): void {
  if (!condition) {
    throw new Error(message);
  }
}

const objective: IntelligenceObjective = {
  id: 'objective-provenance-test',
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

const assessments: EvidenceAssessment[] = [
  {
    id: 'assessment-ai-1',
    evidenceId: 'evidence-1',
    relevanceScore: 0.9,
    reliabilityScore: 0.8,
    freshnessScore: 1,
    corroborationScore: 0.5,
    completenessScore: 0.7,
    overallConfidence: 0.82,
    supportingEvidenceIds: ['evidence-1'],
    conflictingEvidenceIds: [],
    reasoning: 'The evidence is directly relevant.',
    provenanceIds: [],
  },
];

const claims: IntelligenceClaim[] = [
  {
    id: 'claim-ai-1',
    statement:
      'The supplier announced a pricing change.',
    predicate: 'announced_price_change',
    evidenceIds: ['evidence-1'],
    confidence: 0.9,
    status: 'supported',
    provenanceIds: [],
  },
];

const findings: IntelligenceFinding[] = [
  {
    id: 'finding-ai-1',
    statement:
      'The pricing change may affect procurement planning.',
    objectiveId: objective.id,
    claimIds: ['claim-ai-1'],
    evidenceIds: ['evidence-1'],
    referenceIds: [],
    relevanceScore: 0.9,
    confidenceScore: 0.8,
    importanceScore: 0.7,
    reasoning:
      'The claim is relevant to the business objective.',
    limitations: [],
    provenanceIds: [],
    createdAt: '2026-09-24T18:30:00.000Z',
  },
];

const signals: IntelligenceSignal[] = [
  {
    id: 'signal-ai-1',
    type: 'commercial_change',
    statement:
      'A potential procurement-impacting development was identified.',
    objectiveId: objective.id,
    findingIds: ['finding-ai-1'],
    evidenceIds: ['evidence-1'],
    relevanceScore: 0.8,
    confidenceScore: 0.75,
    potentialImpact:
      'Potential procurement impact.',
    reasoning:
      'Derived from the supported finding.',
    recommendedAction:
      'Monitor subsequent supplier communications.',
    provenanceIds: [],
    createdAt: '2026-09-24T18:30:00.000Z',
  },
];

const aiResponse: AIResponse = {
  providerId: 'test-provider',
  modelId: 'test-model',
  content: '{}',
};

const result =
  attachEvidenceAnalysisProvenance({
    objective,
    evidence,
    assessments,
    claims,
    findings,
    signals,
    aiResponse,
    now: () =>
      new Date('2026-09-24T18:30:00.000Z'),
  });

assert(
  result.provenance.length === 4,
  'Expected provenance for assessment, claim, finding, and signal.',
);

assert(
  result.assessments[0]?.provenanceIds.length === 1,
  'Expected assessment provenance.',
);

assert(
  result.claims[0]?.provenanceIds.length === 1,
  'Expected claim provenance.',
);

assert(
  result.findings[0]?.provenanceIds.length === 1,
  'Expected finding provenance.',
);

assert(
  result.signals[0]?.provenanceIds.length === 1,
  'Expected signal provenance.',
);

const claimProvenanceId =
  result.claims[0]!.provenanceIds[0]!;

const claimProvenance =
  result.provenance.find(
    (item) => item.id === claimProvenanceId,
  );

assert(
  claimProvenance?.recordType === 'claim',
  'Expected claim provenance record type.',
);

assert(
  claimProvenance?.recordId === 'claim-ai-1',
  'Expected claim provenance to reference the claim.',
);

assert(
  claimProvenance?.operation ===
    'ai_evidence_analysis',
  'Expected AI evidence analysis operation.',
);

assert(
  claimProvenance?.actor ===
    'ai:test-provider/test-model',
  'Expected AI provider and model to be recorded.',
);

const findingProvenanceId =
  result.findings[0]!.provenanceIds[0]!;

const findingProvenance =
  result.provenance.find(
    (item) => item.id === findingProvenanceId,
  );

const findingEvidenceIds =
  findingProvenance?.attributes
    .evidenceIds as string[];

assert(
  findingEvidenceIds.includes('evidence-1'),
  'Expected finding provenance to contain evidence ID.',
);

const signalProvenanceId =
  result.signals[0]!.provenanceIds[0]!;

const signalProvenance =
  result.provenance.find(
    (item) => item.id === signalProvenanceId,
  );

const signalEvidenceIds =
  signalProvenance?.attributes
    .evidenceIds as string[];

assert(
  signalEvidenceIds.includes('evidence-1'),
  'Expected signal provenance to contain evidence ID.',
);

console.log(
  'Evidence analysis provenance smoke test passed.',
);
console.log(
  'Assessment provenance attached.',
);
console.log(
  'Claim provenance attached.',
);
console.log(
  'Finding provenance attached.',
);
console.log(
  'Signal provenance attached.',
);
console.log(
  'AI provider and model recorded.',
);
console.log(
  'Evidence lineage preserved.',
);
