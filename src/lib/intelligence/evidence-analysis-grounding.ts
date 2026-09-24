import type { IntelligenceEvidence } from '@/types/core-intelligence';

import type {
  AIAnalysisOutput,
  AIAnalysisValidationError,
} from '@/lib/intelligence/evidence-analysis-schema';
import { AIAnalysisValidationError as AnalysisValidationError } from '@/lib/intelligence/evidence-analysis-schema';

function assertEvidenceIdsExist(
  ids: string[],
  validEvidenceIds: Set<string>,
  field: string,
): void {
  for (const id of ids) {
    if (!validEvidenceIds.has(id)) {
      throw new AnalysisValidationError(
        `${field} references unknown evidence ID: ${id}`,
      );
    }
  }
}

export function validateAIAnalysisGrounding(
  output: AIAnalysisOutput,
  evidence: IntelligenceEvidence[],
): AIAnalysisOutput {
  const validEvidenceIds = new Set(
    evidence.map((item) => item.id),
  );

  for (const assessment of output.assessments) {
    assertEvidenceIdsExist(
      [assessment.evidenceId],
      validEvidenceIds,
      'assessment.evidenceId',
    );

    assertEvidenceIdsExist(
      assessment.supportingEvidenceIds,
      validEvidenceIds,
      'assessment.supportingEvidenceIds',
    );

    assertEvidenceIdsExist(
      assessment.conflictingEvidenceIds,
      validEvidenceIds,
      'assessment.conflictingEvidenceIds',
    );
  }

  for (const claim of output.claims) {
    assertEvidenceIdsExist(
      claim.evidenceIds,
      validEvidenceIds,
      'claim.evidenceIds',
    );
  }

  for (const finding of output.findings) {
    assertEvidenceIdsExist(
      finding.evidenceIds,
      validEvidenceIds,
      'finding.evidenceIds',
    );
  }

  for (const signal of output.signals) {
    assertEvidenceIdsExist(
      signal.evidenceIds,
      validEvidenceIds,
      'signal.evidenceIds',
    );
  }

  return output;
}
