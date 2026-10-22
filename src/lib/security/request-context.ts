/**
 * =========================================================
 * KAYDA INTELLIGENCE — REQUEST CONTEXT (HOST / ORIGIN)
 * =========================================================
 *
 * Kayda is a single-operator application bound to the
 * loopback interface. Two browser-level attacks follow
 * from that, and both are handled here:
 *
 * 1. DNS rebinding. An attacker-controlled name is
 *    pointed at 127.0.0.1. The browser then treats the
 *    attacker's origin as same-origin, so the "no CORS
 *    header" property that would normally stop a cross
 *    origin read stops protecting anything. The defence is
 *    to validate the `Host` header and refuse anything
 *    that is not a local address.
 *
 * 2. Cross-origin writes. A form post or a `text/plain`
 *    fetch from any site is a CORS "simple request" that
 *    reaches the server without a preflight. The defence
 *    is to validate `Origin` on every state-changing
 *    request and refuse anything that is not this origin —
 *    matched on scheme, hostname AND effective port, and
 *    refused outright when the header is absent.
 *
 * Neither of these replaces authentication. They are
 * defence in depth around a boundary that is enforced by
 * the operator token.
 *
 * This module is deliberately free of Node and Edge APIs so
 * it can run in both the request proxy and the smoke test.
 */

/** Hostnames that are always considered local. */
export const LOOPBACK_HOSTNAMES = [
  'localhost',
  '127.0.0.1',
  '::1',
] as const;

/** Environment variable holding extra allowed hosts. */
export const ALLOWED_HOSTS_ENV = 'KAYDA_ALLOWED_HOSTS';

export interface ParsedHost {
  /** Lowercase hostname, without brackets for IPv6 literals. */
  hostname: string;
  /** Port, when the header carried one. */
  port?: string;
}

/**
 * Parses a `Host` header into hostname and port.
 *
 * Returns null for a malformed header. An unbracketed IPv6
 * literal is treated as malformed: RFC 3986 requires IPv6
 * literals in a Host header to be bracketed.
 */
export function parseHostHeader(value: string | null): ParsedHost | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith('[')) {
    const end = trimmed.indexOf(']');

    if (end === -1) {
      return null;
    }

    const hostname = trimmed.slice(1, end).toLowerCase();
    const rest = trimmed.slice(end + 1);

    if (!hostname) {
      return null;
    }

    if (!rest) {
      return { hostname };
    }

    if (!rest.startsWith(':')) {
      return null;
    }

    const port = rest.slice(1);

    return /^\d{1,5}$/.test(port) ? { hostname, port } : null;
  }

  if (trimmed.includes(':') && trimmed.split(':').length > 2) {
    // Unbracketed IPv6 literal — malformed in a Host header.
    return null;
  }

  const separator = trimmed.lastIndexOf(':');

  if (separator === -1) {
    return { hostname: trimmed.toLowerCase() };
  }

  const hostname = trimmed.slice(0, separator).toLowerCase();
  const port = trimmed.slice(separator + 1);

  if (!hostname) {
    return null;
  }

  return /^\d{1,5}$/.test(port) ? { hostname, port } : null;
}

/** Extra allowed hosts configured through the environment. */
export function getExtraAllowedHosts(): string[] {
  const raw = process.env[ALLOWED_HOSTS_ENV];

  if (!raw) {
    return [];
  }

  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/** True when the hostname is local or explicitly allowed. */
export function isAllowedHostname(
  hostname: string,
  extraAllowedHosts: string[] = [],
): boolean {
  const normalized = hostname.trim().toLowerCase();

  if (!normalized) {
    return false;
  }

  if ((LOOPBACK_HOSTNAMES as readonly string[]).includes(normalized)) {
    return true;
  }

  return extraAllowedHosts.some(
    (entry) => entry.trim().toLowerCase() === normalized,
  );
}

/** True when the `Host` header names a local, allowed address. */
export function isAllowedHostHeader(
  hostHeader: string | null,
  extraAllowedHosts: string[] = [],
): boolean {
  const parsed = parseHostHeader(hostHeader);

  if (!parsed) {
    return false;
  }

  return isAllowedHostname(parsed.hostname, extraAllowedHosts);
}

/** Methods that change server state. */
export const STATE_CHANGING_METHODS = [
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
] as const;

/** True when the method changes server state. */
export function isStateChangingMethod(method: string): boolean {
  return (STATE_CHANGING_METHODS as readonly string[]).includes(
    method.toUpperCase(),
  );
}

export type OriginVerdict =
  | { allowed: true }
  | { allowed: false; reason: string };

/** Scheme → the port a URL of that scheme uses when it names none. */
const DEFAULT_PORT_BY_SCHEME: Record<string, string> = {
  'http:': '80',
  'https:': '443',
};

/** Environment variable that pins the port Kayda answers on. */
export const APP_PORT_ENV = 'KAYDA_APP_PORT';

/**
 * The port this application is intended to answer on, when the
 * operator has pinned it.
 *
 * Unset by default: without it the origin is validated against
 * the port the request actually arrived on, which is the port the
 * application is listening on for any real client. Set to a
 * number, it additionally refuses state-changing requests that
 * claim any other port — closing the case where a request and its
 * origin agree on a port that is not this application's.
 *
 * A value that is not a number is ignored rather than fatal, so a
 * typo cannot lock the operator out of their own workspace.
 */
export function getExpectedAppPort(
  env: Record<string, string | undefined> = process.env,
): string | undefined {
  const raw = env[APP_PORT_ENV];

  if (typeof raw !== 'string') {
    return undefined;
  }

  const trimmed = raw.trim();

  return /^\d{1,5}$/.test(trimmed) ? trimmed : undefined;
}

/** An origin with its port resolved to the port actually in effect. */
export interface EffectiveOrigin {
  /** Lowercase scheme including the colon, `http:` or `https:`. */
  scheme: string;
  /** Lowercase hostname, without brackets for IPv6 literals. */
  hostname: string;
  /** The explicit port, or the default port for the scheme. */
  port: string;
}

/**
 * Parses an absolute http(s) URL into an effective origin.
 *
 * Returns null for anything that is not a well-formed http or
 * https URL. The port is always resolved: `http://localhost`
 * names port 80, `https://localhost` names 443, and
 * `http://localhost:3102` names 3102.
 */
export function parseEffectiveOrigin(value: string): EffectiveOrigin | null {
  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    return null;
  }

  if (
    parsed.protocol !== 'http:' &&
    parsed.protocol !== 'https:'
  ) {
    return null;
  }

  const host = parseHostHeader(parsed.host);

  if (!host) {
    return null;
  }

  return {
    scheme: parsed.protocol,
    hostname: host.hostname,
    port: host.port ?? DEFAULT_PORT_BY_SCHEME[parsed.protocol],
  };
}

/**
 * The origin of the incoming request: the scheme the request
 * arrived with, and the hostname and port from the `Host`
 * header.
 *
 * Neither part comes from `request.url`, and both are deliberate.
 *
 * The Host header supplies the identity because Next.js
 * normalises every loopback hostname in `request.url` to
 * `localhost` (`NextURL` rewrites `127.0.0.1` and `::1`), so the
 * URL cannot tell `localhost:3102` from `127.0.0.1:3102` — and an
 * origin compared against it would refuse every request the
 * operator made over `127.0.0.1`. The Host header still carries
 * exactly what the browser addressed, it is validated against
 * the loopback allow-list before this is reached, and it is the
 * same value the browser derived its own `Origin` from.
 *
 * The scheme is passed in rather than read from the URL because
 * Next rebuilds `request.url` from `X-Forwarded-Proto` whenever
 * that header is present, trusted or not. The caller supplies it
 * from `requestScheme()`, which applies the same trust decision
 * as the `Secure` cookie flag.
 */
export function requestEffectiveOrigin(
  requestScheme: string,
  requestHostHeader: string | null,
): EffectiveOrigin | null {
  if (
    requestScheme !== 'http:' &&
    requestScheme !== 'https:'
  ) {
    return null;
  }

  const host = parseHostHeader(requestHostHeader);

  if (!host) {
    return null;
  }

  return {
    scheme: requestScheme,
    hostname: host.hostname,
    port: host.port ?? DEFAULT_PORT_BY_SCHEME[requestScheme],
  };
}

/**
 * Decides whether a state-changing request comes from this
 * application's own origin.
 *
 * The two sides are compared on scheme, hostname AND effective
 * port. Resolving the port on both sides is what closes the gap
 * where an origin that omits its port (a page on the default
 * port 80 or 443) was compared only by hostname and silently
 * accepted against an application on a non-default port.
 *
 * A request with no `Origin` header is REFUSED. Every browser
 * sends `Origin` on POST, PUT, PATCH and DELETE — including for
 * same-origin requests — so normal operation is unaffected; what
 * is lost is only the ability to drive a state-changing route
 * from a client that declines to say where it came from.
 *
 * This is still defence in depth. The operator token and the
 * `SameSite=Strict` session cookie remain the real boundary:
 * removing every `Origin` check would not make the application
 * unauthenticated, and adding one would not make it authenticated.
 */
export function evaluateOrigin(
  originHeader: string | null,
  requestScheme: string,
  requestHostHeader: string | null,
  extraAllowedHosts: string[] = [],
): OriginVerdict {
  const requestOrigin = requestEffectiveOrigin(requestScheme, requestHostHeader);

  if (!requestOrigin) {
    return {
      allowed: false,
      reason: 'the request origin could not be determined',
    };
  }

  if (!isAllowedHostname(requestOrigin.hostname, extraAllowedHosts)) {
    return {
      allowed: false,
      reason: 'the request host is not a local address',
    };
  }

  if (originHeader === null || originHeader.trim() === '') {
    return { allowed: false, reason: 'missing origin' };
  }

  const value = originHeader.trim();

  if (value.toLowerCase() === 'null') {
    return { allowed: false, reason: 'opaque origin' };
  }

  const origin = parseEffectiveOrigin(value);

  if (!origin) {
    return { allowed: false, reason: 'origin is not a valid http(s) URL' };
  }

  if (!isAllowedHostname(origin.hostname, extraAllowedHosts)) {
    return { allowed: false, reason: 'origin host is not a local address' };
  }

  if (origin.scheme !== requestOrigin.scheme) {
    return {
      allowed: false,
      reason: 'origin scheme does not match the request scheme',
    };
  }

  if (origin.hostname !== requestOrigin.hostname) {
    return {
      allowed: false,
      reason: 'origin hostname does not match the request hostname',
    };
  }

  if (origin.port !== requestOrigin.port) {
    return {
      allowed: false,
      reason: 'origin port does not match the request port',
    };
  }

  const expectedPort = getExpectedAppPort();

  if (expectedPort && origin.port !== expectedPort) {
    return {
      allowed: false,
      reason: 'origin port does not match the application port',
    };
  }

  return { allowed: true };
}
