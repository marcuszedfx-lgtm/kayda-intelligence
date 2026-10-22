import { timingSafeEqual } from 'node:crypto';

/**
 * =========================================================
 * KAYDA INTELLIGENCE — OPERATOR TOKEN
 * =========================================================
 *
 * The single-operator secret that guards every read and
 * write route. It is read from the environment at runtime
 * and never leaves the server:
 *
 * - it is never returned in an API response,
 * - it is never written to a cookie (only a signed session
 *   value derived from it is),
 * - it is never logged,
 * - it never reaches the browser bundle, because this module
 *   is imported only from server-side code.
 *
 * Server-only. Do not import this from a client component.
 */

/** Environment variable that holds the operator token. */
export const OPERATOR_TOKEN_ENV = 'KAYDA_OPERATOR_TOKEN';

/**
 * Minimum accepted token length. Anything shorter is
 * rejected outright: a short token is guessable, and the
 * whole point of this secret is that it is not.
 */
export const MIN_OPERATOR_TOKEN_LENGTH = 32;

/**
 * Reads the configured operator token.
 *
 * Returns undefined when the token is missing, blank, or
 * too short to be considered a strong secret. A missing
 * token means authentication is impossible, which fails
 * closed: every protected route refuses access.
 */
export function readOperatorToken(): string | undefined {
  const raw = process.env[OPERATOR_TOKEN_ENV];

  if (typeof raw !== 'string') {
    return undefined;
  }

  const trimmed = raw.trim();

  if (trimmed.length < MIN_OPERATOR_TOKEN_LENGTH) {
    return undefined;
  }

  return trimmed;
}

/** True when a usable operator token is configured. */
export function isOperatorTokenConfigured(): boolean {
  return readOperatorToken() !== undefined;
}

/**
 * Compares a candidate token against the expected one in
 * constant time.
 *
 * Length is not secret — an attacker can learn it — so a
 * length mismatch is reported as a mismatch immediately
 * rather than as an error. Equal-length candidates are
 * compared with `timingSafeEqual`, which does not leak the
 * position of the first differing byte.
 */
export function tokensMatch(candidate: string, expected: string): boolean {
  const candidateBytes = Buffer.from(candidate, 'utf8');
  const expectedBytes = Buffer.from(expected, 'utf8');

  if (candidateBytes.length !== expectedBytes.length) {
    return false;
  }

  if (candidateBytes.length === 0) {
    return false;
  }

  return timingSafeEqual(candidateBytes, expectedBytes);
}
