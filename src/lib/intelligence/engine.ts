import type {
  EvidenceAssessment,
  IntelligenceClaim,
  IntelligenceEntity,
  IntelligenceEvent,
  IntelligenceEvidence,
  IntelligenceFinding,
  IntelligenceObjective,
  IntelligenceProvenance,
  IntelligenceReference,
  IntelligenceRelationship,
  IntelligenceSignal,
  IntelligenceSource,
} from '@/types/core-intelligence';
import type {
  IntelligenceRetrieval,
} from './retrieval';
import type {
  ReferenceDiscovery,
} from './reference-discovery';
import type {
  SourceDiscovery,
} from './source-discovery';
import type {
  SourceValidation,
} from './source-validation';

import type {
  EvidenceAnalysis,
} from './evidence-analysis';

export interface IntelligenceEngineInput {
  objective: IntelligenceObjective;
}

export interface IntelligenceEngineResult {
  objective: IntelligenceObjective;

  references: IntelligenceReference[];
  entities: IntelligenceEntity[];

  sources: IntelligenceSource[];
  evidence: IntelligenceEvidence[];

  claims: IntelligenceClaim[];
  relationships: IntelligenceRelationship[];
  events: IntelligenceEvent[];

  assessments: EvidenceAssessment[];
  findings: IntelligenceFinding[];
  signals: IntelligenceSignal[];

  provenance: IntelligenceProvenance[];

  status: string;
  completedAt: string;
}

export interface IntelligenceEngine {
  run(input: IntelligenceEngineInput): Promise<IntelligenceEngineResult>;
}

export interface IntelligenceEngineDependencies {
  referenceDiscovery: ReferenceDiscovery;
  sourceDiscovery: SourceDiscovery;
  sourceValidation: SourceValidation;
  retrieval: IntelligenceRetrieval;
  evidenceAnalysis: EvidenceAnalysis;
  now?: () => Date;
}

function isRetrievalEligible(
  source: IntelligenceSource,
): boolean {
  return (
    source.status === 'validated' &&
    source.validation.status === 'validated' &&
    source.validation.accessibilityConfirmed &&
    source.access.status === 'reachable'
  );
}

/**
 * Coordinates the source-agnostic portion of the V1.5 pipeline.
 *
 * Providers are injected so this layer never depends on the legacy source
 * registry, feeds, or article adapters. It intentionally stops at raw
 * evidence: later pipeline stages must explicitly assess and extract it.
 */
export function createIntelligenceEngine(
  dependencies: IntelligenceEngineDependencies,
): IntelligenceEngine {
  const now = dependencies.now ?? (() => new Date());

  return {
    async run(
      input: IntelligenceEngineInput,
    ): Promise<IntelligenceEngineResult> {
      const referenceDiscovery =
        await dependencies.referenceDiscovery.discover({
          objective: input.objective,
        });

      const discovery = await dependencies.sourceDiscovery.discover({
        objective: input.objective,
        references: referenceDiscovery.references,
        entities: [],
      });

      const validation =
        await dependencies.sourceValidation.validate({
          sources: discovery.sources,
        });

      const retrieval = await dependencies.retrieval.retrieve({
        sources: validation.sources.filter(
          isRetrievalEligible,
        ),
      });

      const analysis =
        await dependencies.evidenceAnalysis.analyze({
          objective: input.objective,
          evidence: retrieval.evidence,
        });

      const errors = [
        ...referenceDiscovery.errors,
        ...discovery.errors,
        ...validation.errors,
        ...retrieval.errors,
      ];

      return {
        objective: input.objective,
        references: discovery.references,
        entities: discovery.entities,
        sources: validation.sources,
        evidence: retrieval.evidence,
        claims: analysis.claims,
        relationships: [],
        events: [],
        assessments: analysis.assessments,
        findings: analysis.findings,
        signals: analysis.signals,
        provenance: [
          ...referenceDiscovery.provenance,
          ...discovery.provenance,
          ...validation.provenance,
          ...retrieval.provenance,
          ...analysis.provenance,
        ],
        status: errors.length
          ? 'completed_with_warnings'
          : 'completed',
        completedAt: now().toISOString(),
      };
    },
  };
}
