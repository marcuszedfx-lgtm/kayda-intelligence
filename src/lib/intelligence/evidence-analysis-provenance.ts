import type {
  EvidenceAssessment,
  IntelligenceClaim,
  IntelligenceFinding,
  IntelligenceProvenance,
  IntelligenceSignal,
  IntelligenceObjective,
  IntelligenceEvidence,
} from '@/types/core-intelligence';

import type { AIResponse } from '@/lib/ai/types';

export interface EvidenceAnalysisProvenanceResult {
  provenance: IntelligenceProvenance[];
  assessments: EvidenceAssessment[];
  claims: IntelligenceClaim[];
  findings: IntelligenceFinding[];
  signals: IntelligenceSignal[];
}

export function attachEvidenceAnalysisProvenance(
  input: {
    objective: IntelligenceObjective;
    evidence: IntelligenceEvidence[];
    assessments: EvidenceAssessment[];
    claims: IntelligenceClaim[];
    findings: IntelligenceFinding[];
    signals: IntelligenceSignal[];
    aiResponse: AIResponse;
    now?: () => Date;
  },
): EvidenceAnalysisProvenanceResult {
  const now = input.now ?? (() => new Date());
  const timestamp = now().toISOString();

  const provenance: IntelligenceProvenance[] = [];

  const createProvenance = (
    recordType: IntelligenceProvenance['recordType'],
    recordId: string,
    evidenceIds: string[],
  ): string => {
    const provenanceId =
      `provenance-ai-${provenance.length + 1}`;

    provenance.push({
      id: provenanceId,
      recordType,
      recordId,
      parentProvenanceIds: [],
      operation: 'ai_evidence_analysis',
      actor: `ai:${input.aiResponse.providerId}/${input.aiResponse.modelId}`,
      createdAt: timestamp,
      confidence: undefined,
      attributes: {
        objectiveId: input.objective.id,
        evidenceIds,
        providerId: input.aiResponse.providerId,
        modelId: input.aiResponse.modelId,
      },
    });

    return provenanceId;
  };

  const assessments = input.assessments.map(
    (assessment) => {
      const provenanceId = createProvenance(
        'assessment',
        assessment.id,
        [
          assessment.evidenceId,
          ...assessment.supportingEvidenceIds,
          ...assessment.conflictingEvidenceIds,
        ],
      );

      return {
        ...assessment,
        provenanceIds: [
          ...assessment.provenanceIds,
          provenanceId,
        ],
      };
    },
  );

  const claims = input.claims.map((claim) => {
    const provenanceId = createProvenance(
      'claim',
      claim.id,
      claim.evidenceIds,
    );

    return {
      ...claim,
      provenanceIds: [
        ...claim.provenanceIds,
        provenanceId,
      ],
    };
  });

  const findings = input.findings.map((finding) => {
    const findingEvidenceIds = [
      ...finding.evidenceIds,
      ...finding.claimIds.flatMap((claimId) => {
        const claim = claims.find(
          (item) => item.id === claimId,
        );

        return claim?.evidenceIds ?? [];
      }),
    ];

    const provenanceId = createProvenance(
      'finding',
      finding.id,
      [...new Set(findingEvidenceIds)],
    );

    return {
      ...finding,
      provenanceIds: [
        ...finding.provenanceIds,
        provenanceId,
      ],
    };
  });

  const signals = input.signals.map((signal) => {
    const signalEvidenceIds = [
      ...signal.evidenceIds,
      ...signal.findingIds.flatMap((findingId) => {
        const finding = findings.find(
          (item) => item.id === findingId,
        );

        return finding?.evidenceIds ?? [];
      }),
    ];

    const provenanceId = createProvenance(
      'signal',
      signal.id,
      [...new Set(signalEvidenceIds)],
    );

    return {
      ...signal,
      provenanceIds: [
        ...signal.provenanceIds,
        provenanceId,
      ],
    };
  });

  return {
    provenance,
    assessments,
    claims,
    findings,
    signals,
  };
}
