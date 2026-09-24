import type {
  EvidenceAssessment,
  IntelligenceProvenance,
  IntelligenceClaim,
  IntelligenceEvidence,
  IntelligenceFinding,
  IntelligenceObjective,
  IntelligenceSignal,
} from '@/types/core-intelligence';

import type { AIRequest, AIResponse } from '@/lib/ai/types';
import { AIRouter } from '@/lib/ai/router';
import {
  validateAIAnalysisOutput,
  type AIAnalysisOutput,
} from '@/lib/intelligence/evidence-analysis-schema';
import {
  validateAIAnalysisGrounding,
} from '@/lib/intelligence/evidence-analysis-grounding';
import {
  attachEvidenceAnalysisProvenance,
} from '@/lib/intelligence/evidence-analysis-provenance';

export interface EvidenceAnalysisInput {
  objective: IntelligenceObjective;
  evidence: IntelligenceEvidence[];
}

export interface EvidenceAnalysisResult {
  assessments: EvidenceAssessment[];
  claims: IntelligenceClaim[];
  findings: IntelligenceFinding[];
  signals: IntelligenceSignal[];
  provenance: IntelligenceProvenance[];
  aiResponse: AIResponse;
}

export interface EvidenceAnalysisDependencies {
  aiRouter: AIRouter;
  now?: () => Date;
}

export interface EvidenceAnalysis {
  analyze(
    input: EvidenceAnalysisInput,
  ): Promise<EvidenceAnalysisResult>;
}

function buildSystemPrompt(): string {
  return [
    'You are the evidence analysis component of Kayda Intelligence.',
    '',
    'Analyze only the evidence supplied in the request.',
    'Do not invent facts, sources, entities, dates, claims, or business impacts.',
    'Every claim, finding, and signal must be grounded in supplied evidence IDs.',
    'If the evidence is insufficient, explicitly state the limitation.',
    'Distinguish observed facts from interpretation.',
    '',
    'Return ONLY valid JSON.',
    'Do not wrap the JSON in markdown code fences.',
    '',
    'The JSON must contain exactly these top-level arrays:',
    'assessments, claims, findings, signals.',
    '',
    'Finding claimIndexes must refer to indexes in the claims array.',
    'Signal findingIndexes must refer to indexes in the findings array.',
    'All evidence IDs must come from the supplied evidence.',
  ].join('\n');
}

function buildUserPrompt(
  input: EvidenceAnalysisInput,
): string {
  return JSON.stringify(
    {
      objective: input.objective,
      evidence: input.evidence.map((item) => ({
        id: item.id,
        sourceId: item.sourceId,
        locator: item.locator,
        title: item.title,
        publishedAt: item.publishedAt,
        retrievedAt: item.retrievedAt,
        content: item.content,
        excerpt: item.excerpt,
        extractionMethod: item.extractionMethod,
        extractionConfidence: item.extractionConfidence,
      })),
      requiredOutput: {
        assessments: {
          description: 'Assess the supplied evidence.',
          fields: [
            'evidenceId',
            'relevanceScore',
            'reliabilityScore',
            'freshnessScore',
            'corroborationScore',
            'completenessScore',
            'overallConfidence',
            'supportingEvidenceIds',
            'conflictingEvidenceIds',
            'reasoning',
          ],
        },
        claims: {
          description:
            'Extract claims directly supported by the supplied evidence.',
          fields: [
            'statement',
            'predicate',
            'evidenceIds',
            'confidence',
            'status',
          ],
        },
        findings: {
          description:
            'Produce findings only when the evidence supports a meaningful conclusion for the objective.',
          fields: [
            'statement',
            'claimIndexes',
            'evidenceIds',
            'referenceIds',
            'relevanceScore',
            'confidenceScore',
            'importanceScore',
            'reasoning',
            'limitations',
          ],
        },
        signals: {
          description:
            'Produce signals only when a finding indicates a potentially relevant business development.',
          fields: [
            'type',
            'statement',
            'findingIndexes',
            'evidenceIds',
            'relevanceScore',
            'confidenceScore',
            'potentialImpact',
            'reasoning',
            'recommendedAction',
          ],
        },
      },
    },
    null,
    2,
  );
}

function buildRequest(
  input: EvidenceAnalysisInput,
): AIRequest {
  return {
    capability: 'reasoning',
    systemPrompt: buildSystemPrompt(),
    userPrompt: buildUserPrompt(input),
    temperature: 0,
    maxOutputTokens: 4000,
  };
}

function extractJson(content: string): unknown {
  const trimmed = content.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const fencedMatch = trimmed.match(
      /^```(?:json)?\s*([\s\S]*?)\s*```$/i,
    );

    if (fencedMatch?.[1]) {
      return JSON.parse(fencedMatch[1]);
    }

    throw new Error(
      'AI response did not contain valid JSON.',
    );
  }
}

function convertAnalysisToRecords(
  output: AIAnalysisOutput,
  input: EvidenceAnalysisInput,
  now: () => Date,
): Omit<
  EvidenceAnalysisResult,
  'aiResponse'
> {
  const timestamp = now().toISOString();

  const assessments: EvidenceAssessment[] =
    output.assessments.map((assessment, index) => ({
      id: `assessment-ai-${index + 1}`,
      evidenceId: assessment.evidenceId,
      relevanceScore: assessment.relevanceScore,
      reliabilityScore: assessment.reliabilityScore,
      freshnessScore: assessment.freshnessScore,
      corroborationScore: assessment.corroborationScore,
      completenessScore: assessment.completenessScore,
      overallConfidence: assessment.overallConfidence,
      supportingEvidenceIds:
        assessment.supportingEvidenceIds,
      conflictingEvidenceIds:
        assessment.conflictingEvidenceIds,
      reasoning: assessment.reasoning,
      provenanceIds: [],
    }));

  const claims: IntelligenceClaim[] =
    output.claims.map((claim, index) => ({
      id: `claim-ai-${index + 1}`,
      statement: claim.statement,
      subjectReferenceId:
        claim.subjectReferenceId,
      predicate: claim.predicate,
      objectReferenceId:
        claim.objectReferenceId,
      objectValue: claim.objectValue,
      evidenceIds: claim.evidenceIds,
      confidence: claim.confidence,
      temporalContext: claim.temporalContext,
      status: claim.status,
      provenanceIds: [],
    }));

  const findings: IntelligenceFinding[] =
    output.findings.map((finding, index) => ({
      id: `finding-ai-${index + 1}`,
      statement: finding.statement,
      objectiveId: input.objective.id,
      claimIds: finding.claimIndexes.map(
        (claimIndex) => claims[claimIndex]!.id,
      ),
      evidenceIds: finding.evidenceIds,
      referenceIds: finding.referenceIds,
      relevanceScore: finding.relevanceScore,
      confidenceScore: finding.confidenceScore,
      importanceScore: finding.importanceScore,
      reasoning: finding.reasoning,
      limitations: finding.limitations,
      provenanceIds: [],
      createdAt: timestamp,
    }));

  const signals: IntelligenceSignal[] =
    output.signals.map((signal, index) => ({
      id: `signal-ai-${index + 1}`,
      type: signal.type,
      statement: signal.statement,
      objectiveId: input.objective.id,
      findingIds: signal.findingIndexes.map(
        (findingIndex) => findings[findingIndex]!.id,
      ),
      evidenceIds: signal.evidenceIds,
      relevanceScore: signal.relevanceScore,
      confidenceScore: signal.confidenceScore,
      potentialImpact: signal.potentialImpact,
      reasoning: signal.reasoning,
      recommendedAction:
        signal.recommendedAction,
      provenanceIds: [],
      createdAt: timestamp,
    }));

  return {
    assessments,
    claims,
    findings,
    signals,
    provenance: [],
  };
}

export function createEvidenceAnalysis(
  dependencies: EvidenceAnalysisDependencies,
): EvidenceAnalysis {
  const now = dependencies.now ?? (() => new Date());

  return {
    async analyze(
      input: EvidenceAnalysisInput,
    ): Promise<EvidenceAnalysisResult> {
      const response = await dependencies.aiRouter.complete(
        buildRequest(input),
      );

      const parsed = extractJson(response.content);

      const validated = validateAIAnalysisOutput(
        parsed,
      );

      const grounded =
        validateAIAnalysisGrounding(
          validated,
          input.evidence,
        );

      const records = convertAnalysisToRecords(
        grounded,
        input,
        now,
      );

      const withProvenance =
        attachEvidenceAnalysisProvenance({
          objective: input.objective,
          evidence: input.evidence,
          assessments: records.assessments,
          claims: records.claims,
          findings: records.findings,
          signals: records.signals,
          aiResponse: response,
          now,
        });

      return {
        ...withProvenance,
        aiResponse: response,
      };
    },
  };
}
