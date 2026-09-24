import type { IntelligenceEvidence } from '@/types/core-intelligence';

import {
  validateAIAnalysisOutput,
} from '@/lib/intelligence/evidence-analysis-schema';
import {
  validateAIAnalysisGrounding,
} from '@/lib/intelligence/evidence-analysis-grounding';
import { AIAnalysisValidationError } from '@/lib/intelligence/evidence-analysis-schema';

function assert(
  condition: boolean,
  message: string,
): void {
  if (!condition) {
    throw new Error(message);
  }
}

const evidence: IntelligenceEvidence[] = [
  {
    id: 'evidence-1',
    sourceId: 'source-1',
    retrievedAt: '2026-09-24T18:00:00.000Z',
    locator: 'https://example.com/article',
    title: 'Test evidence',
    content: 'A supplier announced a pricing change.',
    extractionMethod: 'smoke-test',
    extractionConfidence: 1,
    freshness: { retrievedAt: '2026-09-24T18:00:00.000Z', status: 'fresh', confidence: 1 },
    claimIds: [],
    entityReferenceIds: [],
    geographyReferenceIds: [],
    industryReferenceIds: [],
    topicReferenceIds: [],
    provenanceIds: [],
  },
];

const validOutput = validateAIAnalysisOutput({
  assessments: [
    {
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
    },
  ],
  claims: [
    {
      statement: 'The supplier announced a pricing change.',
      predicate: 'announced_price_change',
      evidenceIds: ['evidence-1'],
      confidence: 0.9,
      status: 'supported',
    },
  ],
  findings: [
    {
      statement: 'The pricing change may affect procurement planning.',
      claimIndexes: [0],
      evidenceIds: ['evidence-1'],
      referenceIds: [],
      relevanceScore: 0.9,
      confidenceScore: 0.8,
      importanceScore: 0.7,
      reasoning: 'The claim is relevant to the objective.',
      limitations: [],
    },
  ],
  signals: [
    {
      type: 'commercial_change',
      statement: 'A potential commercial development was identified.',
      findingIndexes: [0],
      evidenceIds: ['evidence-1'],
      relevanceScore: 0.8,
      confidenceScore: 0.75,
      potentialImpact: 'Potential procurement impact.',
      reasoning: 'Derived from the finding.',
    },
  ],
});

validateAIAnalysisGrounding(validOutput, evidence);

console.log('Valid grounding accepted.');

let unknownEvidenceRejected = false;

try {
  const invalidOutput = validateAIAnalysisOutput({
    ...validOutput,
    claims: [
      {
        ...validOutput.claims[0],
        evidenceIds: ['evidence-does-not-exist'],
      },
    ],
  });

  validateAIAnalysisGrounding(
    invalidOutput,
    evidence,
  );
} catch (error) {
  unknownEvidenceRejected =
    error instanceof AIAnalysisValidationError;
}

assert(
  unknownEvidenceRejected,
  'Expected unknown evidence ID to be rejected.',
);

console.log('Unknown evidence ID rejected.');

let unknownSupportingEvidenceRejected = false;

try {
  const invalidOutput = validateAIAnalysisOutput({
    ...validOutput,
    assessments: [
      {
        ...validOutput.assessments[0],
        supportingEvidenceIds: ['evidence-999'],
      },
    ],
  });

  validateAIAnalysisGrounding(
    invalidOutput,
    evidence,
  );
} catch (error) {
  unknownSupportingEvidenceRejected =
    error instanceof AIAnalysisValidationError;
}

assert(
  unknownSupportingEvidenceRejected,
  'Expected unknown supporting evidence ID to be rejected.',
);

console.log('Unknown supporting evidence ID rejected.');

console.log('Evidence analysis grounding smoke test passed.');
