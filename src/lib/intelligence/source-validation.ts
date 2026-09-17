import type {
  IntelligenceProvenance,
  IntelligenceSource,
} from "@/types/core-intelligence";

export interface SourceValidationInput {
  sources: IntelligenceSource[];
}

export interface SourceValidationResult {
  sources: IntelligenceSource[];
  provenance: IntelligenceProvenance[];
  errors: string[];
}

export interface SourceValidation {
  validate(
    input: SourceValidationInput,
  ): Promise<SourceValidationResult>;
}
