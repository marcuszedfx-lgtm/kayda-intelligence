import type {
  IntelligenceEvidence,
  IntelligenceProvenance,
  IntelligenceSource,
} from "@/types/core-intelligence";

export interface IntelligenceRetrievalInput {
  sources: IntelligenceSource[];
}

export interface IntelligenceRetrievalResult {
  evidence: IntelligenceEvidence[];
  provenance: IntelligenceProvenance[];
  errors: string[];
}

export interface IntelligenceRetrieval {
  retrieve(
    input: IntelligenceRetrievalInput,
  ): Promise<IntelligenceRetrievalResult>;
}
