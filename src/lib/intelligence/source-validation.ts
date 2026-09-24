import type {
  IntelligenceProvenance,
  IntelligenceSource,
} from '@/types/core-intelligence';
import {
  fetchSource,
  SourceTransportError,
  type SourceTransport,
  type SourceTransportResponse,
} from './source-transport';

export interface SourceValidationInput {
  sources: IntelligenceSource[];
}

export interface SourceValidationResult {
  sources: IntelligenceSource[];
  provenance: IntelligenceProvenance[];
  errors: string[];
}

export interface SourceValidation {
  validate(
    input: SourceValidationInput,
  ): Promise<SourceValidationResult>;
}

export interface SourceValidationDependencies {
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

function getResponseOutcome(
  response: SourceTransportResponse,
): string {
  if (response.protected) {
    return 'protected';
  }

  return response.ok
    ? 'validated'
    : 'unexpected_response';
}

function createTransportAttributes(
  source: IntelligenceSource,
  outcome: string,
  response?: SourceTransportResponse,
  failureCode?: string,
): Record<string, unknown> {
  return {
    requestedUrl: redactUrl(source.locator),
    validationStatus: outcome,
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
  checkedAt: string,
  outcome: string,
  response?: SourceTransportResponse,
  failureCode?: string,
): IntelligenceProvenance {
  return {
    id: createId('provenance'),
    recordType: 'source',
    recordId: source.id,
    sourceId: source.id,
    parentProvenanceIds: [
      ...source.discoveryProvenanceIds,
    ],
    operation: 'source_validation',
    actor: 'kayda-intelligence-engine',
    createdAt: checkedAt,
    confidence: outcome === 'validated' ? 0.6 : 0,
    attributes: createTransportAttributes(
      source,
      outcome,
      response,
      failureCode,
    ),
  };
}

function createValidatedSource(
  source: IntelligenceSource,
  checkedAt: string,
  outcome: string,
  provenance: IntelligenceProvenance,
  response?: SourceTransportResponse,
): IntelligenceSource {
  const reachable = outcome === 'validated';

  return {
    ...source,
    validation: {
      ...source.validation,
      status: outcome,
      checkedAt,
      identityConfirmed:
        source.validation.identityConfirmed,
      accessibilityConfirmed: reachable,
      ...(response?.contentType
        ? { contentType: response.contentType }
        : {}),
      confidence: reachable ? 0.6 : 0,
      provenanceIds: [
        ...source.validation.provenanceIds,
        provenance.id,
      ],
    },
    access: {
      ...source.access,
      method: reachable ? 'https' : source.access.method,
      status: reachable ? 'reachable' : outcome,
      lastCheckedAt: checkedAt,
      attributes: {
        ...source.access.attributes,
        ...provenance.attributes,
      },
    },
    status: outcome,
  };
}

function createSafeErrorMessage(
  source: IntelligenceSource,
  outcome: string,
): string {
  return `Source validation ${outcome} for ${redactUrl(source.locator)}.`;
}

export function createSourceValidation(
  dependencies: SourceValidationDependencies = {},
): SourceValidation {
  const transport: SourceTransport =
    dependencies.transport ?? { fetchSource };

  return {
    async validate(
      input: SourceValidationInput,
    ): Promise<SourceValidationResult> {
      const sources: IntelligenceSource[] = [];
      const provenance: IntelligenceProvenance[] = [];
      const errors: string[] = [];

      for (const source of input.sources) {
        const checkedAt = new Date().toISOString();

        try {
          const response = await transport.fetchSource(
            source.locator,
          );
          const outcome = getResponseOutcome(response);
          const provenanceRecord = createProvenance(
            source,
            checkedAt,
            outcome,
            response,
          );

          sources.push(
            createValidatedSource(
              source,
              checkedAt,
              outcome,
              provenanceRecord,
              response,
            ),
          );
          provenance.push(provenanceRecord);

          if (outcome !== 'validated') {
            errors.push(
              createSafeErrorMessage(source, outcome),
            );
          }
        } catch (error) {
          const outcome = classifyTransportError(error);
          const failureCode =
            error instanceof SourceTransportError
              ? error.code
              : undefined;
          const provenanceRecord = createProvenance(
            source,
            checkedAt,
            outcome,
            undefined,
            failureCode,
          );

          sources.push(
            createValidatedSource(
              source,
              checkedAt,
              outcome,
              provenanceRecord,
            ),
          );
          provenance.push(provenanceRecord);
          errors.push(createSafeErrorMessage(source, outcome));
        }
      }

      return {
        sources,
        provenance,
        errors,
      };
    },
  };
}

export const sourceValidation = createSourceValidation();
