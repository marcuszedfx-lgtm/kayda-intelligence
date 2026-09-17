import type {
  IntelligenceEntity,
  IntelligenceObjective,
  IntelligenceProvenance,
  IntelligenceReference,
  IntelligenceSource,
} from "@/types/core-intelligence";

export interface IntelligenceDiscoveryInput {
  objective: IntelligenceObjective;
  references: IntelligenceReference[];
  entities: IntelligenceEntity[];
}

export interface IntelligenceDiscoveryResult {
  sources: IntelligenceSource[];
  references: IntelligenceReference[];
  entities: IntelligenceEntity[];
  provenance: IntelligenceProvenance[];
  errors: string[];
}

export interface IntelligenceDiscovery {
  discover(
    input: IntelligenceDiscoveryInput,
  ): Promise<IntelligenceDiscoveryResult>;
}
