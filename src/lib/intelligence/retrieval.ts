import type {
  IntelligenceEvidence,
  IntelligenceProvenance,
  IntelligenceSource,
} from '@/types/core-intelligence';
import {
  fetchSource,
  SourceTransportError,
  type SourceTransport,
  type SourceTransportResponse,
} from './source-transport';

export interface IntelligenceRetrievalInput {
  sources: IntelligenceSource[];
}

export interface IntelligenceRetrievalResult {
  evidence: IntelligenceEvidence[];
  provenance: IntelligenceProvenance[];
  errors: string[];
}

export interface IntelligenceRetrieval {
  retrieve(
    input: IntelligenceRetrievalInput,
  ): Promise<IntelligenceRetrievalResult>;
}

export interface IntelligenceRetrievalDependencies {
  transport?: SourceTransport;
}

function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function redactUrl(value: string): string {
  try {
    const url = new URL(value);
    url.username = '';
    url.password = '';

    return url.toString();
  } catch {
    return 'invalid-source-url';
  }
}

function isTlsFailure(error: SourceTransportError): boolean {
  return /certificate|cert_|self[- ]signed|tls/i.test(
    error.message,
  );
}

function classifyTransportError(error: unknown): string {
  if (!(error instanceof SourceTransportError)) {
    return 'error';
  }

  switch (error.code) {
    case 'INVALID_URL':
      return 'invalid_url';
    case 'UNSAFE_URL':
    case 'UNSAFE_REDIRECT':
      return 'unsafe_target';
    case 'TIMEOUT':
      return 'timeout';
    case 'BODY_TOO_LARGE':
      return 'response_too_large';
    case 'NETWORK_ERROR':
      return isTlsFailure(error)
        ? 'tls_error'
        : 'network_error';
    default:
      return 'error';
  }
}

function createTransportAttributes(
  requestedUrl: string,
  outcome: string,
  response?: SourceTransportResponse,
  failureCode?: string,
): Record<string, unknown> {
  return {
    requestedUrl: redactUrl(requestedUrl),
    transportStatus: outcome,
    ...(response
      ? {
          finalUrl: redactUrl(response.finalUrl),
          httpStatus: response.status,
          statusText: response.statusText,
          contentType: response.contentType,
          responseSizeBytes: response.bodyBytes,
          redirectCount: response.redirectCount,
          protected: response.protected,
          ...(response.protection
            ? { protection: response.protection }
            : {}),
        }
      : {}),
    ...(failureCode ? { failureCode } : {}),
  };
}

function createProvenance(
  source: IntelligenceSource,
  retrievedAt: string,
  outcome: string,
  response?: SourceTransportResponse,
  evidenceId?: string,
  failureCode?: string,
): IntelligenceProvenance {
  return {
    id: createId('provenance'),
    recordType: evidenceId ? 'evidence' : 'source',
    recordId: evidenceId ?? source.id,
    sourceId: source.id,
    ...(evidenceId ? { evidenceId } : {}),
    parentProvenanceIds: [
      ...source.discoveryProvenanceIds,
    ],
    operation: 'source_retrieval',
    actor: 'kayda-intelligence-engine',
    createdAt: retrievedAt,
    confidence: outcome === 'retrieved' ? 0.7 : 0,
    attributes: createTransportAttributes(
      source.locator,
      outcome,
      response,
      failureCode,
    ),
  };
}

function createEvidence(
  source: IntelligenceSource,
  response: SourceTransportResponse,
  retrievedAt: string,
): IntelligenceEvidence {
  return {
    id: createId('evidence'),
    sourceId: source.id,
    retrievedAt,
    locator: redactUrl(response.finalUrl),
    content: response.body,
    extractionMethod: 'raw_transport_response',
    extractionConfidence: 0.5,
    freshness: {
      retrievedAt,
      status: 'retrieved',
      confidence: 1,
    },
    claimIds: [],
    entityReferenceIds: [],
    geographyReferenceIds: [],
    industryReferenceIds: [],
    topicReferenceIds: [],
    provenanceIds: [],
  };
}

function getEvidenceUnsuitability(
  response: SourceTransportResponse,
): string | undefined {
  if (response.protected) {
    return 'protected';
  }

  if (!response.ok) {
    return 'unexpected_response';
  }

  if (!response.body.trim()) {
    return 'empty_response';
  }

  const contentType = response.contentType
    .split(';', 1)[0]
    .trim()
    .toLowerCase();

  const supported =
    contentType.startsWith('text/') ||
    [
      'application/json',
      'application/ld+json',
      'application/xml',
      'application/rss+xml',
      'application/atom+xml',
      'application/xhtml+xml',
    ].includes(contentType);

  return supported
    ? undefined
    : 'unsupported_content_type';
}

function createSafeErrorMessage(
  source: IntelligenceSource,
  outcome: string,
): string {
  return `Source retrieval ${outcome} for ${redactUrl(source.locator)}.`;
}

export function createRetrieval(
  dependencies: IntelligenceRetrievalDependencies = {},
): IntelligenceRetrieval {
  const transport: SourceTransport =
    dependencies.transport ?? { fetchSource };

  return {
    async retrieve(
      input: IntelligenceRetrievalInput,
    ): Promise<IntelligenceRetrievalResult> {
      const evidence: IntelligenceEvidence[] = [];
      const provenance: IntelligenceProvenance[] = [];
      const errors: string[] = [];

      for (const source of input.sources) {
        const retrievedAt = new Date().toISOString();

        try {
          const response = await transport.fetchSource(
            source.locator,
          );
          const unsuitable = getEvidenceUnsuitability(response);

          if (unsuitable) {
            provenance.push(
              createProvenance(
                source,
                retrievedAt,
                unsuitable,
                response,
              ),
            );
            errors.push(
              createSafeErrorMessage(source, unsuitable),
            );
            continue;
          }

          const evidenceRecord = createEvidence(
            source,
            response,
            retrievedAt,
          );
          const provenanceRecord = createProvenance(
            source,
            retrievedAt,
            'retrieved',
            response,
            evidenceRecord.id,
          );

          evidenceRecord.provenanceIds.push(
            provenanceRecord.id,
          );
          provenance.push(provenanceRecord);
          evidence.push(evidenceRecord);
        } catch (error) {
          const outcome = classifyTransportError(error);
          const failureCode =
            error instanceof SourceTransportError
              ? error.code
              : undefined;

          provenance.push(
            createProvenance(
              source,
              retrievedAt,
              outcome,
              undefined,
              undefined,
              failureCode,
            ),
          );
          errors.push(createSafeErrorMessage(source, outcome));
        }
      }

      return {
        evidence,
        provenance,
        errors,
      };
    },
  };
}

export const retrieval = createRetrieval();
