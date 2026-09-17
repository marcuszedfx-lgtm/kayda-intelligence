import type {
  IntelligenceProvenance,
  IntelligenceSource,
} from "@/types/core-intelligence";
import type {
  SourceValidation,
  SourceValidationInput,
  SourceValidationResult,
} from "./source-validation";

class SmokeTestSourceValidation implements SourceValidation {
  async validate(
    input: SourceValidationInput,
  ): Promise<SourceValidationResult> {
    const validatedSources: IntelligenceSource[] =
      input.sources.map((source) => ({
        ...source,
        validation: {
          ...source.validation,
          status: "validated",
          checkedAt: new Date().toISOString(),
          identityConfirmed: true,
          accessibilityConfirmed: true,
          contentType: "text/html",
          confidence: 1,
        },
        status: "validated",
      }));

    const provenance: IntelligenceProvenance[] =
      validatedSources.map((source) => ({
        id: `provenance-${source.id}`,
        recordType: "source",
        recordId: source.id,
        sourceId: source.id,
        parentProvenanceIds: [],
        operation: "source_validation",
        actor: "smoke-test",
        createdAt: new Date().toISOString(),
        confidence: 1,
        attributes: {},
      }));

    return {
      sources: validatedSources,
      provenance,
      errors: [],
    };
  }
}

async function main() {
  const source: IntelligenceSource = {
    id: "source-validation-example",
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

  const input: SourceValidationInput = {
    sources: [source],
  };

  const validator = new SmokeTestSourceValidation();
  const result = await validator.validate(input);

  if (result.errors.length > 0) {
    throw new Error(
      `Source validation smoke test returned errors: ${result.errors.join(", ")}`,
    );
  }

  if (result.sources.length !== 1) {
    throw new Error(
      `Expected 1 validated source, received ${result.sources.length}.`,
    );
  }

  const validatedSource = result.sources[0];

  if (validatedSource.validation.status !== "validated") {
    throw new Error("Source validation status was not updated.");
  }

  if (!validatedSource.validation.identityConfirmed) {
    throw new Error("Source identity was not confirmed.");
  }

  if (!validatedSource.validation.accessibilityConfirmed) {
    throw new Error("Source accessibility was not confirmed.");
  }

  if (result.provenance.length !== 1) {
    throw new Error(
      `Expected 1 provenance record, received ${result.provenance.length}.`,
    );
  }

  console.log("✓ Source validation contract smoke test passed.");
  console.log(`  Source: ${validatedSource.locator}`);
  console.log(
    `  Validation status: ${validatedSource.validation.status}`,
  );
  console.log(
    `  Provenance: ${result.provenance[0].operation}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
