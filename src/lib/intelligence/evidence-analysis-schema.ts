export interface AIAnalysisAssessment {
  evidenceId: string;
  relevanceScore: number;
  reliabilityScore: number;
  freshnessScore: number;
  corroborationScore: number;
  completenessScore: number;
  overallConfidence: number;
  supportingEvidenceIds: string[];
  conflictingEvidenceIds: string[];
  reasoning: string;
}

export interface AIAnalysisClaim {
  statement: string;
  subjectReferenceId?: string;
  predicate: string;
  objectReferenceId?: string;
  objectValue?: unknown;
  evidenceIds: string[];
  confidence: number;
  temporalContext?: {
    startsAt?: string;
    endsAt?: string;
    occurredAt?: string;
    announcedAt?: string;
    effectiveAt?: string;
    description?: string;
  };
  status: string;
}

export interface AIAnalysisFinding {
  statement: string;
  claimIndexes: number[];
  evidenceIds: string[];
  referenceIds: string[];
  relevanceScore: number;
  confidenceScore: number;
  importanceScore: number;
  reasoning: string;
  limitations: string[];
}

export interface AIAnalysisSignal {
  type: string;
  statement: string;
  findingIndexes: number[];
  evidenceIds: string[];
  relevanceScore: number;
  confidenceScore: number;
  potentialImpact: string;
  reasoning: string;
  recommendedAction?: string;
}

export interface AIAnalysisOutput {
  assessments: AIAnalysisAssessment[];
  claims: AIAnalysisClaim[];
  findings: AIAnalysisFinding[];
  signals: AIAnalysisSignal[];
}

export class AIAnalysisValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AIAnalysisValidationError';
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(
    value &&
      typeof value === 'object' &&
      !Array.isArray(value),
  );
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item) => isString(item))
  );
}

function assertScore(
  value: unknown,
  field: string,
): void {
  if (!isNumber(value) || value < 0 || value > 1) {
    throw new AIAnalysisValidationError(
      `${field} must be a number between 0 and 1.`,
    );
  }
}

function assertEvidenceIdArray(
  value: unknown,
  field: string,
): void {
  if (!isStringArray(value)) {
    throw new AIAnalysisValidationError(
      `${field} must be an array of evidence IDs.`,
    );
  }
}

function validateAssessment(
  value: unknown,
): AIAnalysisAssessment {
  if (!isObject(value)) {
    throw new AIAnalysisValidationError(
      'Each assessment must be an object.',
    );
  }

  if (!isString(value.evidenceId)) {
    throw new AIAnalysisValidationError(
      'Assessment evidenceId must be a string.',
    );
  }

  const scoreFields = [
    'relevanceScore',
    'reliabilityScore',
    'freshnessScore',
    'corroborationScore',
    'completenessScore',
    'overallConfidence',
  ] as const;

  for (const field of scoreFields) {
    assertScore(value[field], `assessment.${field}`);
  }

  assertEvidenceIdArray(
    value.supportingEvidenceIds,
    'assessment.supportingEvidenceIds',
  );

  assertEvidenceIdArray(
    value.conflictingEvidenceIds,
    'assessment.conflictingEvidenceIds',
  );

  if (!isString(value.reasoning)) {
    throw new AIAnalysisValidationError(
      'Assessment reasoning must be a string.',
    );
  }

  return value as unknown as AIAnalysisAssessment;
}

function validateClaim(
  value: unknown,
): AIAnalysisClaim {
  if (!isObject(value)) {
    throw new AIAnalysisValidationError(
      'Each claim must be an object.',
    );
  }

  if (!isString(value.statement)) {
    throw new AIAnalysisValidationError(
      'Claim statement must be a string.',
    );
  }

  if (!isString(value.predicate)) {
    throw new AIAnalysisValidationError(
      'Claim predicate must be a string.',
    );
  }

  assertEvidenceIdArray(
    value.evidenceIds,
    'claim.evidenceIds',
  );

  assertScore(value.confidence, 'claim.confidence');

  if (!isString(value.status)) {
    throw new AIAnalysisValidationError(
      'Claim status must be a string.',
    );
  }

  return value as unknown as AIAnalysisClaim;
}

function validateFinding(
  value: unknown,
): AIAnalysisFinding {
  if (!isObject(value)) {
    throw new AIAnalysisValidationError(
      'Each finding must be an object.',
    );
  }

  if (!isString(value.statement)) {
    throw new AIAnalysisValidationError(
      'Finding statement must be a string.',
    );
  }

  if (
    !Array.isArray(value.claimIndexes) ||
    !value.claimIndexes.every(
      (item) =>
        Number.isInteger(item) &&
        item >= 0,
    )
  ) {
    throw new AIAnalysisValidationError(
      'Finding claimIndexes must contain non-negative integers.',
    );
  }

  assertEvidenceIdArray(
    value.evidenceIds,
    'finding.evidenceIds',
  );

  if (!isStringArray(value.referenceIds)) {
    throw new AIAnalysisValidationError(
      'Finding referenceIds must be an array of strings.',
    );
  }

  assertScore(
    value.relevanceScore,
    'finding.relevanceScore',
  );

  assertScore(
    value.confidenceScore,
    'finding.confidenceScore',
  );

  assertScore(
    value.importanceScore,
    'finding.importanceScore',
  );

  if (!isString(value.reasoning)) {
    throw new AIAnalysisValidationError(
      'Finding reasoning must be a string.',
    );
  }

  if (!isStringArray(value.limitations)) {
    throw new AIAnalysisValidationError(
      'Finding limitations must be an array of strings.',
    );
  }

  return value as unknown as AIAnalysisFinding;
}

function validateSignal(
  value: unknown,
): AIAnalysisSignal {
  if (!isObject(value)) {
    throw new AIAnalysisValidationError(
      'Each signal must be an object.',
    );
  }

  if (!isString(value.type)) {
    throw new AIAnalysisValidationError(
      'Signal type must be a string.',
    );
  }

  if (!isString(value.statement)) {
    throw new AIAnalysisValidationError(
      'Signal statement must be a string.',
    );
  }

  if (
    !Array.isArray(value.findingIndexes) ||
    !value.findingIndexes.every(
      (item) =>
        Number.isInteger(item) &&
        item >= 0,
    )
  ) {
    throw new AIAnalysisValidationError(
      'Signal findingIndexes must contain non-negative integers.',
    );
  }

  assertEvidenceIdArray(
    value.evidenceIds,
    'signal.evidenceIds',
  );

  assertScore(
    value.relevanceScore,
    'signal.relevanceScore',
  );

  assertScore(
    value.confidenceScore,
    'signal.confidenceScore',
  );

  if (!isString(value.potentialImpact)) {
    throw new AIAnalysisValidationError(
      'Signal potentialImpact must be a string.',
    );
  }

  if (!isString(value.reasoning)) {
    throw new AIAnalysisValidationError(
      'Signal reasoning must be a string.',
    );
  }

  if (
    value.recommendedAction !== undefined &&
    !isString(value.recommendedAction)
  ) {
    throw new AIAnalysisValidationError(
      'Signal recommendedAction must be a string when provided.',
    );
  }

  return value as unknown as AIAnalysisSignal;
}

export function validateAIAnalysisOutput(
  value: unknown,
): AIAnalysisOutput {
  if (!isObject(value)) {
    throw new AIAnalysisValidationError(
      'AI analysis output must be an object.',
    );
  }

  if (!Array.isArray(value.assessments)) {
    throw new AIAnalysisValidationError(
      'AI analysis assessments must be an array.',
    );
  }

  if (!Array.isArray(value.claims)) {
    throw new AIAnalysisValidationError(
      'AI analysis claims must be an array.',
    );
  }

  if (!Array.isArray(value.findings)) {
    throw new AIAnalysisValidationError(
      'AI analysis findings must be an array.',
    );
  }

  if (!Array.isArray(value.signals)) {
    throw new AIAnalysisValidationError(
      'AI analysis signals must be an array.',
    );
  }

  const assessments =
    value.assessments.map(validateAssessment);

  const claims =
    value.claims.map(validateClaim);

  const findings =
    value.findings.map(validateFinding);

  const signals =
    value.signals.map(validateSignal);

  for (const finding of findings) {
    for (const claimIndex of finding.claimIndexes) {
      if (claimIndex >= claims.length) {
        throw new AIAnalysisValidationError(
          `Finding references claim index ${claimIndex}, but only ${claims.length} claims exist.`,
        );
      }
    }
  }

  for (const signal of signals) {
    for (const findingIndex of signal.findingIndexes) {
      if (findingIndex >= findings.length) {
        throw new AIAnalysisValidationError(
          `Signal references finding index ${findingIndex}, but only ${findings.length} findings exist.`,
        );
      }
    }
  }

  return {
    assessments,
    claims,
    findings,
    signals,
  };
}
