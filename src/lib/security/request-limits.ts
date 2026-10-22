/**
 * =========================================================
 * KAYDA INTELLIGENCE — REQUEST BODY LIMITS
 * =========================================================
 *
 * Untrusted request bodies are read here, once, with three
 * guarantees:
 *
 * 1. The declared `Content-Length` is checked before a
 *    single byte is read.
 * 2. The body is streamed with a hard byte cap, so a
 *    request that lies about (or omits) its length cannot
 *    exhaust memory.
 * 3. Only `application/json` is accepted. This matters
 *    for more than tidiness: a `text/plain` POST is a CORS
 *    "simple request" that a browser will send cross-site
 *    without a preflight, so rejecting it removes the
 *    cheapest cross-origin write vector outright.
 *
 * Server-only.
 */

/** Maximum body for a single record write. */
export const MAX_CREATE_BODY_BYTES = 64 * 1024;

/** Maximum body for the one-time legacy import. */
export const MAX_IMPORT_BODY_BYTES = 8 * 1024 * 1024;

/** Maximum body for the login request. */
export const MAX_LOGIN_BODY_BYTES = 4 * 1024;

/**
 * A request body that must be refused. Carries the HTTP
 * status and a stable machine-readable code so route
 * handlers can translate it into a response.
 */
export class RequestBodyError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = 'RequestBodyError';
    this.status = status;
    this.code = code;
  }
}

/** True when the content type declares JSON. */
export function isJsonContentType(contentType: string | null): boolean {
  if (!contentType) {
    return false;
  }

  const mediaType = contentType.split(';')[0].trim().toLowerCase();

  return mediaType === 'application/json' || mediaType.endsWith('+json');
}

/**
 * Reads and parses a JSON body, refusing anything larger
 * than `maxBytes` or not declared as JSON.
 */
export async function readJsonBody(
  request: Request,
  maxBytes: number,
): Promise<unknown> {
  if (!isJsonContentType(request.headers.get('content-type'))) {
    throw new RequestBodyError(
      'Content-Type must be application/json.',
      415,
      'unsupported_media_type',
    );
  }

  const declaredLength = request.headers.get('content-length');

  if (declaredLength !== null) {
    const length = Number(declaredLength);

    if (!Number.isFinite(length) || length < 0) {
      throw new RequestBodyError(
        'Content-Length is not a valid length.',
        400,
        'invalid_length',
      );
    }

    if (length > maxBytes) {
      throw new RequestBodyError(
        `Request body must be at most ${maxBytes} bytes.`,
        413,
        'payload_too_large',
      );
    }
  }

  const body = request.body;

  if (!body) {
    throw new RequestBodyError(
      'Request body must be valid JSON.',
      400,
      'invalid_json',
    );
  }

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      if (!value) {
        continue;
      }

      total += value.byteLength;

      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined);

        throw new RequestBodyError(
          `Request body must be at most ${maxBytes} bytes.`,
          413,
          'payload_too_large',
        );
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const text = new TextDecoder('utf-8', { fatal: false }).decode(
    Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))),
  );

  try {
    return JSON.parse(text);
  } catch {
    throw new RequestBodyError(
      'Request body must be valid JSON.',
      400,
      'invalid_json',
    );
  }
}
