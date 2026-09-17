import type {
  IntelligenceClaim,
  IntelligenceEvidence,
  IntelligenceFinding,
  IntelligenceObjective,
  IntelligenceProvenance,
  IntelligenceReference,
  IntelligenceSignal,
  IntelligenceSource,
} from "@/types/core-intelligence";

const reference: IntelligenceReference = {
  id: "ref-company-example",
  value: "Example Company",
  type: "entity",
  aliases: [],
  attributes: {},
  confidence: 1,
  provenanceIds: [],
};

const objective: IntelligenceObjective = {
  id: "objective-example",
  statement: "Determine whether a newly discovered development could affect the business.",
  intent: "assess_business_relevance",
  constraints: [],
  references: [reference],
  evidenceRequirements: [],
  status: "active",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const source: IntelligenceSource = {
  id: "source-example",
  locator: "https://example.com/source",
  sourceType: "web",
  discoveredBy: "test",
  discoveryProvenanceIds: [],
  validation: {
    status: "validated",
    checkedAt: new Date().toISOString(),
    identityConfirmed: true,
    accessibilityConfirmed: true,
    confidence: 1,
    provenanceIds: [],
  },
  reliability: {
    score: 1,
    basis: ["test"],
    assessedAt: new Date().toISOString(),
    confidence: 1,
    provenanceIds: [],
  },
  access: {
    method: "direct",
    status: "available",
    attributes: {},
  },
  status: "active",
  attributes: {},
};

const provenance: IntelligenceProvenance = {
  id: "provenance-example",
  recordType: "evidence",
  recordId: "evidence-example",
  sourceId: source.id,
  parentProvenanceIds: [],
  operation: "test",
  actor: "system",
  createdAt: new Date().toISOString(),
  attributes: {},
};

const evidence: IntelligenceEvidence = {
  id: "evidence-example",
  sourceId: source.id,
  retrievedAt: new Date().toISOString(),
  locator: source.locator,
  content: "Example evidence content.",
  extractionMethod: "test",
  extractionConfidence: 1,
  freshness: {
    retrievedAt: new Date().toISOString(),
    status: "fresh",
    confidence: 1,
  },
  claimIds: ["claim-example"],
  entityReferenceIds: [reference.id],
  geographyReferenceIds: [],
  industryReferenceIds: [],
  topicReferenceIds: [],
  provenanceIds: [provenance.id],
};

const claim: IntelligenceClaim = {
  id: "claim-example",
  statement: "The development may affect the business.",
  predicate: "may_affect",
  subjectReferenceId: reference.id,
  objectValue: "business operations",
  evidenceIds: [evidence.id],
  confidence: 0.8,
  status: "supported",
  provenanceIds: [provenance.id],
};

const finding: IntelligenceFinding = {
  id: "finding-example",
  statement: "The available evidence indicates a potentially relevant development.",
  objectiveId: objective.id,
  claimIds: [claim.id],
  evidenceIds: [evidence.id],
  referenceIds: [reference.id],
  relevanceScore: 80,
  confidenceScore: 80,
  importanceScore: 70,
  reasoning: "The finding is directly supported by the available claim and evidence.",
  limitations: [],
  provenanceIds: [provenance.id],
  createdAt: new Date().toISOString(),
};

const signal: IntelligenceSignal = {
  id: "signal-example",
  type: "potential_change",
  statement: "Monitor the development for further evidence of business impact.",
  objectiveId: objective.id,
  findingIds: [finding.id],
  evidenceIds: [evidence.id],
  relevanceScore: 80,
  confidenceScore: 80,
  potentialImpact: "moderate",
  reasoning: "The finding indicates a potentially material development.",
  provenanceIds: [provenance.id],
  createdAt: new Date().toISOString(),
};

if (
  !objective.id ||
  !source.id ||
  !evidence.id ||
  !claim.id ||
  !finding.id ||
  !signal.id ||
  !provenance.id
) {
  throw new Error("Core intelligence schema smoke test failed.");
}

console.log("✓ Core intelligence schema smoke test passed.");
console.log(`  Objective: ${objective.statement}`);
console.log(`  Source: ${source.locator}`);
console.log(`  Evidence: ${evidence.id}`);
console.log(`  Claim: ${claim.statement}`);
console.log(`  Finding: ${finding.statement}`);
console.log(`  Signal: ${signal.statement}`);
