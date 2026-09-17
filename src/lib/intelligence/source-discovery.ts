import type {
  IntelligenceEntity,
  IntelligenceObjective,
  IntelligenceProvenance,
  IntelligenceReference,
  IntelligenceSource,
} from "@/types/core-intelligence";

export interface SourceDiscoveryInput {
  objective: IntelligenceObjective;
  references: IntelligenceReference[];
  entities: IntelligenceEntity[];
}

export interface SourceDiscoveryResult {
  sources: IntelligenceSource[];
  references: IntelligenceReference[];
  entities: IntelligenceEntity[];
  provenance: IntelligenceProvenance[];
  errors: string[];
}

export interface SourceDiscovery {
  discover(
    input: SourceDiscoveryInput,
  ): Promise<SourceDiscoveryResult>;
}
