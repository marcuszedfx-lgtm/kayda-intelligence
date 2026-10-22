import { createHmac, timingSafeEqual } from 'node:crypto';

import { requestScheme } from './trusted-proxy';

/**
 * =========================================================
 * KAYDA INTELLIGENCE — OPERATOR SESSION
 * =========================================================
 *
 * A stateless, signed session for the single operator.
 *
 * The cookie holds no secret: it is a version tag, the
 * issue time, the expiry time, and an HMAC-SHA256 over
 * those three fields, keyed with the operator token. The
 * server recomputes the HMAC and compares it in constant
 * time, so a forged or tampered cookie is rejected.
 *
 * Consequences of this design:
 *
 * - The token itself is never stored in a cookie, so a
 *   stolen cookie cannot be replayed as the token.
 * - Rotating the token invalidates every existing session.
 * - A session cannot outlive its expiry, even if the
 *   browser keeps the cookie.
 *
 * Server-only. Do not import this from a client component.
 */

/** Name of the session cookie. */
export const SESSION_COOKIE_NAME = 'kayda_session';

/** Format version, so the format can change safely later. */
export const SESSION_VERSION = 'v1';

/** Default session lifetime: twelve hours. */
export const DEFAULT_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

/** Longest session lifetime that may be configured. */
export const MAX_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Reads the configured session lifetime in milliseconds.
 * An unset or nonsensical value falls back to the default,
 * so a typo can never produce an unlimited session.
 */
export function getSessionTtlMs(): number {
  const raw = process.env.KAYDA_SESSION_TTL_HOURS;

  if (!raw) {
    return DEFAULT_SESSION_TTL_MS;
  }

  const hours = Number(raw);

  if (!Number.isFinite(hours) || hours <= 0) {
    return DEFAULT_SESSION_TTL_MS;
  }

  const ttl = Math.floor(hours * 60 * 60 * 1000);

  return Math.min(ttl, MAX_SESSION_TTL_MS);
}

/** Signs a session payload with the operator token. */
function sign(payload: string, token: string): string {
  return createHmac('sha256', token).update(payload).digest('base64url');
}

/**
 * Creates a signed session value for the operator token.
 * The value embeds its own expiry, so the server decides
 * how long the session lives regardless of the cookie.
 */
export function createSessionValue(token: string, now = Date.now()): string {
  const issuedAt = now;
  const expiresAt = now + getSessionTtlMs();
  const payload = `${SESSION_VERSION}.${issuedAt}.${expiresAt}`;

  return `${payload}.${sign(payload, token)}`;
}

/**
 * Verifies a session value.
 *
 * Returns false for anything that is not a well-formed,
 * correctly signed, unexpired session issued by this
 * server. Comparison is constant time.
 */
export function verifySessionValue(
  value: string | undefined,
  token: string,
  now = Date.now(),
): boolean {
  if (!value) {
    return false;
  }

  const parts = value.split('.');

  if (parts.length !== 4) {
    return false;
  }

  const [version, issuedRaw, expiresRaw, signature] = parts;

  if (version !== SESSION_VERSION) {
    return false;
  }

  const issuedAt = Number(issuedRaw);
  const expiresAt = Number(expiresRaw);

  if (!Number.isFinite(issuedAt) || !Number.isFinite(expiresAt)) {
    return false;
  }

  if (expiresAt <= now) {
    return false;
  }

  // Reject a session that claims to have been issued in the
  // future beyond a minute of clock skew.
  if (issuedAt > now + 60_000) {
    return false;
  }

  // Reject a session that claims a longer life than any
  // configuration can issue. `getSessionTtlMs()` caps what the
  // server will hand out at MAX_SESSION_TTL_MS, and the signature
  // already makes such a value unforgeable — but a verification
  // that accepts a lifetime the issuer can never produce is a
  // second, unnecessary degree of freedom, so it is refused.
  if (expiresAt - issuedAt > MAX_SESSION_TTL_MS) {
    return false;
  }

  const expected = sign(`${version}.${issuedRaw}.${expiresRaw}`, token);

  const signatureBytes = Buffer.from(signature, 'utf8');
  const expectedBytes = Buffer.from(expected, 'utf8');

  if (signatureBytes.length !== expectedBytes.length) {
    return false;
  }

  return timingSafeEqual(signatureBytes, expectedBytes);
}

/**
 * Builds the `Set-Cookie` value for a session.
 *
 * The cookie is:
 *
 * - `HttpOnly` — JavaScript cannot read it,
 * - `SameSite=Strict` — it is not sent on cross-site requests,
 * - `Path=/` — scoped to the whole application, and no wider,
 * - `Secure` whenever the request arrived over HTTPS, and
 * - a session cookie (no `Max-Age`) — it dies with the
 *   browser session, with the server-side expiry as a second,
 *   independent bound.
 *
 * The local preview runs over plain HTTP on loopback, so
 * `Secure` cannot be set there: the browser would refuse to
 * store the cookie at all. That exception is documented in
 * docs/SECURITY.md.
 *
 * Whether the request arrived over HTTPS is decided by
 * `isSecureRequest()`, which honours `X-Forwarded-Proto` only
 * when the operator has configured a trusted reverse proxy.
 */
export function buildSessionCookie(
  value: string,
  secure: boolean,
): string {
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
  ];

  if (secure) {
    parts.push('Secure');
  }

  return parts.join('; ');
}

/** Builds the `Set-Cookie` value that clears the session. */
export function buildClearedSessionCookie(secure: boolean): string {
  const parts = [
    `${SESSION_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
  ];

  if (secure) {
    parts.push('Secure');
  }

  return parts.join('; ');
}

/**
 * True when the request arrived over HTTPS, directly or via a
 * trusted terminating proxy.
 *
 * `X-Forwarded-Proto` is honoured only when the operator has
 * explicitly configured a reverse proxy to be trusted
 * (`KAYDA_TRUSTED_PROXY`), and then only for a value that is
 * exactly `http` or `https` — read right-to-left, so the value
 * the proxy observed wins over anything the client sent. With no
 * proxy configured the header is ignored entirely and the
 * connection itself decides, so a client can no longer strip
 * `Secure` from a session cookie by sending a header.
 */
export function isSecureRequest(request: Request): boolean {
  return requestScheme(request) === 'https:';
}
