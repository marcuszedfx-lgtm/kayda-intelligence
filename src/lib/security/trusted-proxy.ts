/**
 * =========================================================
 * KAYDA INTELLIGENCE — TRUSTED PROXY GATE
 * =========================================================
 *
 * Kayda normally runs directly on the loopback interface. In
 * that deployment the request's peer is the operator's own
 * machine and every `X-Forwarded-*` header on the request was
 * supplied by that client, not by a proxy — so neither may be
 * trusted for any decision.
 *
 * When, and only when, Kayda is placed behind a reverse proxy
 * the operator controls, `KAYDA_TRUSTED_PROXY=1` opts in to
 * honouring the two headers that proxy sets:
 *
 *   - `X-Forwarded-Proto` — the scheme the proxy terminated,
 *   - `X-Forwarded-For`   — the address that reached the proxy.
 *
 * Both are read right-to-left, because a single trusted proxy
 * appends its own view *after* whatever the client sent, so the
 * rightmost value is the one the proxy observed. Anything else
 * is ignored:
 *
 *   - a scheme that is not exactly `http` or `https` is
 *     ignored, so a malformed header can never strip `Secure`
 *     from a session cookie on an HTTPS request;
 *   - a missing header falls back to the connection itself.
 *
 * The flag is OFF by default. Nothing in this module can widen
 * trust without the operator explicitly setting it.
 *
 * Server-only.
 */

/** Environment variable that opts in to trusting a reverse proxy. */
export const TRUSTED_PROXY_ENV = 'KAYDA_TRUSTED_PROXY';

/** Values that switch proxy trust on. Everything else means off. */
const ENABLED_VALUES = new Set(['1', 'true', 'yes', 'on']);

/** Longest forwarded value this module will keep as a key. */
const MAX_FORWARDED_VALUE_LENGTH = 128;

type EnvLike = Record<string, string | undefined>;

/**
 * True only when the operator has explicitly configured a
 * trusted reverse proxy. An unset, empty, or unrecognised value
 * means "no proxy", which is the safe default.
 */
export function isTrustedProxyConfigured(env: EnvLike = process.env): boolean {
  const raw = env[TRUSTED_PROXY_ENV];

  if (typeof raw !== 'string') {
    return false;
  }

  return ENABLED_VALUES.has(raw.trim().toLowerCase());
}

/**
 * Reads the rightmost (proxy-supplied) value of a forwarded
 * header. Returns undefined when the header is absent, blank,
 * or no proxy is trusted.
 */
export function readTrustedForwardedHeader(
  request: Request,
  name: string,
  env: EnvLike = process.env,
): string | undefined {
  if (!isTrustedProxyConfigured(env)) {
    return undefined;
  }

  const raw = request.headers.get(name);

  if (!raw) {
    return undefined;
  }

  const parts = raw.split(',');
  const last = parts[parts.length - 1].trim().slice(0, MAX_FORWARDED_VALUE_LENGTH);

  return last || undefined;
}

/** The scheme a trusted proxy reports, or undefined. */
export type ForwardedProto = 'http' | 'https';

/**
 * The scheme a trusted proxy terminated, or undefined when no
 * proxy is trusted, the header is absent, or the value is not
 * exactly `http` or `https`.
 */
export function readForwardedProto(
  request: Request,
  env: EnvLike = process.env,
): ForwardedProto | undefined {
  const value = readTrustedForwardedHeader(request, 'x-forwarded-proto', env)?.toLowerCase();

  return value === 'http' || value === 'https' ? value : undefined;
}

/**
 * The scheme the request actually arrived with, as a URL
 * protocol (`http:` or `https:`).
 *
 * `request.url` is deliberately not consulted for the identity
 * of the scheme. Next.js rebuilds that URL from
 * `X-Forwarded-Proto` whenever the header is present, whether or
 * not a proxy is trusted, so a single client-supplied header
 * would otherwise move every decision that depends on the
 * scheme — the `Secure` cookie flag, and the origin comparison
 * on state-changing requests.
 *
 * The scheme therefore follows the same trust decision as the
 * `Secure` flag: the forwarded value when a proxy is trusted,
 * and otherwise the connection itself. When the header is
 * present but no proxy is trusted, the connection's own scheme
 * is no longer knowable from the request, so the answer falls
 * back to plain `http:` — the deployment this application
 * documents, and a refusal rather than an acceptance for any
 * caller that tries to claim otherwise.
 */
export function requestScheme(
  request: Request,
  env: EnvLike = process.env,
): 'http:' | 'https:' {
  const forwardedProto = readForwardedProto(request, env);

  if (forwardedProto) {
    return forwardedProto === 'https' ? 'https:' : 'http:';
  }

  if (request.headers.get('x-forwarded-proto')) {
    return 'http:';
  }

  try {
    return new URL(request.url).protocol === 'https:' ? 'https:' : 'http:';
  } catch {
    return 'http:';
  }
}

/**
 * The client address a trusted proxy observed, or undefined when
 * no proxy is trusted. Only ever used as a throttle bucket key —
 * never for attribution — and truncated by the caller's cap.
 */
export function readForwardedClientAddress(
  request: Request,
  env: EnvLike = process.env,
): string | undefined {
  return readTrustedForwardedHeader(request, 'x-forwarded-for', env);
}
