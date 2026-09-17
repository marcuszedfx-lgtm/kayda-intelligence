import type {
  IntelligenceObjective,
  IntelligenceProvenance,
  IntelligenceReference,
} from "@/types/core-intelligence";

export interface ReferenceDiscoveryInput {
  objective: IntelligenceObjective;
}

export interface ReferenceDiscoveryResult {
  references: IntelligenceReference[];
  provenance: IntelligenceProvenance[];
  errors: string[];
}

export interface ReferenceDiscovery {
  discover(
    input: ReferenceDiscoveryInput,
  ): Promise<ReferenceDiscoveryResult>;
}
