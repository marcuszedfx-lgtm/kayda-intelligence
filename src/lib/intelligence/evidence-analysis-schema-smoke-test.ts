import {
  AIAnalysisValidationError,
  validateAIAnalysisOutput,
} from '@/lib/intelligence/evidence-analysis-schema';

function assert(
  condition: boolean,
  message: string,
): void {
  if (!condition) {
    throw new Error(message);
  }
}

const validOutput = {
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
      reasoning: 'The evidence is directly relevant to the objective.',
    },
  ],
  claims: [
    {
      statement: 'The supplier announced a change in pricing.',
      predicate: 'announced_price_change',
      evidenceIds: ['evidence-1'],
      confidence: 0.88,
      status: 'supported',
    },
  ],
  findings: [
    {
      statement:
        'The pricing announcement may affect procurement planning.',
      claimIndexes: [0],
      evidenceIds: ['evidence-1'],
      referenceIds: [],
      relevanceScore: 0.9,
      confidenceScore: 0.82,
      importanceScore: 0.75,
      reasoning:
        'The claim is directly relevant to the stated business objective.',
      limitations: ['The evidence does not establish the size of the impact.'],
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
      potentialImpact: 'Potential change to procurement economics.',
      reasoning:
        'The signal is derived from the finding and supplied evidence.',
      recommendedAction:
        'Monitor subsequent supplier communications for confirmed pricing details.',
    },
  ],
};

const validated = validateAIAnalysisOutput(validOutput);

assert(
  validated.claims.length === 1,
  'Expected one validated claim.',
);

assert(
  validated.findings[0]?.claimIndexes[0] === 0,
  'Expected finding to reference claim index 0.',
);

assert(
  validated.signals[0]?.findingIndexes[0] === 0,
  'Expected signal to reference finding index 0.',
);

let invalidScoreRejected = false;

try {
  validateAIAnalysisOutput({
    ...validOutput,
    claims: [
      {
        ...validOutput.claims[0],
        confidence: 1.5,
      },
    ],
  });
} catch (error) {
  invalidScoreRejected =
    error instanceof AIAnalysisValidationError;
}

assert(
  invalidScoreRejected,
  'Expected invalid confidence score to be rejected.',
);

let invalidClaimIndexRejected = false;

try {
  validateAIAnalysisOutput({
    ...validOutput,
    findings: [
      {
        ...validOutput.findings[0],
        claimIndexes: [99],
      },
    ],
  });
} catch (error) {
  invalidClaimIndexRejected =
    error instanceof AIAnalysisValidationError;
}

assert(
  invalidClaimIndexRejected,
  'Expected invalid claim index to be rejected.',
);

let invalidFindingIndexRejected = false;

try {
  validateAIAnalysisOutput({
    ...validOutput,
    signals: [
      {
        ...validOutput.signals[0],
        findingIndexes: [99],
      },
    ],
  });
} catch (error) {
  invalidFindingIndexRejected =
    error instanceof AIAnalysisValidationError;
}

assert(
  invalidFindingIndexRejected,
  'Expected invalid finding index to be rejected.',
);

console.log('Evidence analysis schema smoke test passed.');
console.log('Valid output accepted.');
console.log('Invalid score rejected.');
console.log('Invalid claim reference rejected.');
console.log('Invalid finding reference rejected.');
