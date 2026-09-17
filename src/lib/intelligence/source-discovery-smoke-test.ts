import type {
  IntelligenceEntity,
  IntelligenceObjective,
  IntelligenceReference,
} from "@/types/core-intelligence";
import type {
  SourceDiscovery,
  SourceDiscoveryInput,
  SourceDiscoveryResult,
} from "./source-discovery";

class SmokeTestSourceDiscovery implements SourceDiscovery {
  async discover(
    input: SourceDiscoveryInput,
  ): Promise<SourceDiscoveryResult> {
    const source = {
      id: "source-example",
      locator: "https://example.com",
      sourceType: "public_web_source",
      discoveredBy: "smoke-test",
      discoveryProvenanceIds: [],
      validation: {
        status: "not_checked",
        checkedAt: new Date().toISOString(),
        identityConfirmed: false,
        accessibilityConfirmed: false,
        confidence: 0,
        provenanceIds: [],
      },
      reliability: {
        score: 0,
        basis: [],
        assessedAt: new Date().toISOString(),
        confidence: 0,
        provenanceIds: [],
      },
      access: {
        method: "web",
        status: "unknown",
        attributes: {},
      },
      status: "discovered",
      attributes: {},
    };

    return {
      sources: [source],
      references: input.references,
      entities: input.entities,
      provenance: [],
      errors: [],
    };
  }
}

async function main() {
  const reference: IntelligenceReference = {
    id: "reference-example",
    value: "Example Company",
    type: "entity",
    aliases: [],
    attributes: {},
    confidence: 1,
    provenanceIds: [],
  };

  const objective: IntelligenceObjective = {
    id: "objective-source-discovery-test",
    statement:
      "Discover potentially relevant sources for an intelligence objective.",
    intent: "discover_sources",
    constraints: [],
    references: [reference],
    evidenceRequirements: [],
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const entities: IntelligenceEntity[] = [];

  const input: SourceDiscoveryInput = {
    objective,
    references: [reference],
    entities,
  };

  const discovery = new SmokeTestSourceDiscovery();
  const result = await discovery.discover(input);

  if (result.errors.length > 0) {
    throw new Error(
      `Source discovery smoke test returned errors: ${result.errors.join(", ")}`,
    );
  }

  if (result.sources.length !== 1) {
    throw new Error(
      `Expected 1 discovered source, received ${result.sources.length}.`,
    );
  }

  if (result.sources[0].locator !== "https://example.com") {
    throw new Error("Discovered source locator is incorrect.");
  }

  if (result.references.length !== 1) {
    throw new Error(
      `Expected 1 reference to pass through discovery, received ${result.references.length}.`,
    );
  }

  console.log("✓ Source discovery contract smoke test passed.");
  console.log(`  Objective: ${objective.statement}`);
  console.log(`  Reference: ${reference.value}`);
  console.log(`  Source: ${result.sources[0].locator}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
