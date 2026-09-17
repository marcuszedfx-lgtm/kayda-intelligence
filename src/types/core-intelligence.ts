/**
 * Kayda Intelligence Core Schema
 *
 * This module defines the structure of Kayda's intelligence system.
 *
 * IMPORTANT:
 * - No hard-coded domains.
 * - No hard-coded industries.
 * - No hard-coded entity types.
 * - No hard-coded publishers or websites.
 * - No keyword dictionaries.
 *
 * The schema defines HOW intelligence is represented.
 * Actual values are discovered, extracted, validated, and assessed at runtime.
 */

export type IntelligenceReferenceType =
  | 'entity'
  | 'geography'
  | 'industry'
  | 'topic';

export interface IntelligenceReference {
  id: string;
  value: string;
  type: IntelligenceReferenceType;

  description?: string;

  aliases: string[];

  parentReferenceId?: string;

  attributes: Record<string, unknown>;

  confidence: number;

  provenanceIds: string[];
}

export interface IntelligenceConstraint {
  id: string;

  type: string;

  value: unknown;

  operator?: string;

  unit?: string;

  source: 'user' | 'inferred' | 'evidence';

  confidence: number;

  provenanceIds: string[];
}

export interface EvidenceRequirement {
  id: string;

  description: string;

  requirementType: string;

  required: boolean;

  attributes: Record<string, unknown>;
}

export interface IntelligenceObjective {
  id: string;

  statement: string;

  intent: string;

  desiredOutcome?: string;

  context?: string;

  constraints: IntelligenceConstraint[];

  references: IntelligenceReference[];

  evidenceRequirements: EvidenceRequirement[];

  status: string;

  createdAt: string;

  updatedAt: string;
}

export interface IntelligenceIdentifier {
  type: string;

  value: string;

  issuer?: string;

  confidence: number;

  provenanceIds: string[];
}

export interface IntelligenceEntity {
  id: string;

  name: string;

  type: string;

  description?: string;

  aliases: string[];

  identifiers: IntelligenceIdentifier[];

  attributes: Record<string, unknown>;

  referenceIds: string[];

  provenanceIds: string[];

  confidence: number;
}

export interface IntelligenceGeography {
  id: string;

  name: string;

  type: string;

  parentId?: string;

  attributes: Record<string, unknown>;

  confidence: number;

  provenanceIds: string[];
}

export interface IntelligenceIndustry {
  id: string;

  name: string;

  description?: string;

  parentId?: string;

  attributes: Record<string, unknown>;

  confidence: number;

  provenanceIds: string[];
}

export interface IntelligenceTopic {
  id: string;

  name: string;

  description?: string;

  parentId?: string;

  attributes: Record<string, unknown>;

  confidence: number;

  provenanceIds: string[];
}

export interface SourceValidation {
  status: string;

  checkedAt: string;

  identityConfirmed: boolean;

  accessibilityConfirmed: boolean;

  contentType?: string;

  freshness?: string;

  confidence: number;

  provenanceIds: string[];
}

export interface SourceReliability {
  score: number;

  basis: string[];

  assessedAt: string;

  confidence: number;

  provenanceIds: string[];
}

export interface SourceAccess {
  method: string;

  status: string;

  lastCheckedAt?: string;

  attributes: Record<string, unknown>;
}

export interface IntelligenceSource {
  id: string;

  locator: string;

  sourceType: string;

  publisher?: string;

  title?: string;

  description?: string;

  discoveredBy: string;

  discoveryProvenanceIds: string[];

  validation: SourceValidation;

  reliability: SourceReliability;

  access: SourceAccess;

  status: string;

  attributes: Record<string, unknown>;
}

export interface EvidenceFreshness {
  publishedAt?: string;

  retrievedAt: string;

  ageSeconds?: number;

  status: string;

  confidence: number;
}

export interface IntelligenceEvidence {
  id: string;

  sourceId: string;

  retrievedAt: string;

  publishedAt?: string;

  locator: string;

  title?: string;

  content: string;

  excerpt?: string;

  contentHash?: string;

  extractionMethod: string;

  extractionConfidence: number;

  freshness: EvidenceFreshness;

  claimIds: string[];

  entityReferenceIds: string[];

  geographyReferenceIds: string[];

  industryReferenceIds: string[];

  topicReferenceIds: string[];

  provenanceIds: string[];
}

export interface TemporalContext {
  startsAt?: string;

  endsAt?: string;

  occurredAt?: string;

  announcedAt?: string;

  effectiveAt?: string;

  description?: string;
}

export interface IntelligenceClaim {
  id: string;

  statement: string;

  subjectReferenceId?: string;

  predicate: string;

  objectReferenceId?: string;

  objectValue?: unknown;

  evidenceIds: string[];

  confidence: number;

  temporalContext?: TemporalContext;

  status: string;

  provenanceIds: string[];
}

export interface IntelligenceRelationship {
  id: string;

  fromReferenceId: string;

  relationshipType: string;

  toReferenceId: string;

  attributes: Record<string, unknown>;

  evidenceIds: string[];

  confidence: number;

  temporalContext?: TemporalContext;

  provenanceIds: string[];
}

export interface IntelligenceEvent {
  id: string;

  type: string;

  title: string;

  description?: string;

  occurredAt?: string;

  announcedAt?: string;

  effectiveAt?: string;

  entityReferenceIds: string[];

  geographyReferenceIds: string[];

  industryReferenceIds: string[];

  topicReferenceIds: string[];

  evidenceIds: string[];

  confidence: number;

  provenanceIds: string[];
}

export interface EvidenceAssessment {
  id: string;

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

  provenanceIds: string[];
}

export interface IntelligenceFinding {
  id: string;

  statement: string;

  objectiveId: string;

  claimIds: string[];

  evidenceIds: string[];

  referenceIds: string[];

  relevanceScore: number;

  confidenceScore: number;

  importanceScore: number;

  reasoning: string;

  limitations: string[];

  provenanceIds: string[];

  createdAt: string;
}

export interface IntelligenceSignal {
  id: string;

  type: string;

  statement: string;

  objectiveId: string;

  findingIds: string[];

  evidenceIds: string[];

  relevanceScore: number;

  confidenceScore: number;

  potentialImpact: string;

  reasoning: string;

  recommendedAction?: string;

  provenanceIds: string[];

  createdAt: string;
}

export interface IntelligenceProvenance {
  id: string;

  recordType: string;

  recordId: string;

  sourceId?: string;

  evidenceId?: string;

  parentProvenanceIds: string[];

  operation: string;

  actor: string;

  createdAt: string;

  confidence?: number;

  attributes: Record<string, unknown>;
}
