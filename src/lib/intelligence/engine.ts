import type {
  IntelligenceClaim,
  IntelligenceEntity,
  IntelligenceEvent,
  IntelligenceEvidence,
  IntelligenceFinding,
  IntelligenceObjective,
  IntelligenceProvenance,
  IntelligenceReference,
  IntelligenceRelationship,
  IntelligenceSignal,
  IntelligenceSource,
  EvidenceAssessment,
} from "@/types/core-intelligence";

export interface IntelligenceEngineInput {
  objective: IntelligenceObjective;
}

export interface IntelligenceEngineResult {
  objective: IntelligenceObjective;

  references: IntelligenceReference[];
  entities: IntelligenceEntity[];

  sources: IntelligenceSource[];
  evidence: IntelligenceEvidence[];

  claims: IntelligenceClaim[];
  relationships: IntelligenceRelationship[];
  events: IntelligenceEvent[];

  assessments: EvidenceAssessment[];
  findings: IntelligenceFinding[];
  signals: IntelligenceSignal[];

  provenance: IntelligenceProvenance[];

  status: string;
  completedAt: string;
}

export interface IntelligenceEngine {
  run(input: IntelligenceEngineInput): Promise<IntelligenceEngineResult>;
}
