import { NextResponse } from 'next/server';

import { readOperatorToken } from './operator-token';
import {
  SESSION_COOKIE_NAME,
  verifySessionValue,
} from './session';

/**
 * =========================================================
 * KAYDA INTELLIGENCE — ROUTE AUTHORIZATION GUARD
 * =========================================================
 *
 * The authorization boundary for every read and write route.
 *
 * It lives in the route handlers rather than only in the
 * request proxy on purpose: the proxy is a coarse filter,
 * while this guard is the actual decision, and it must not
 * be possible to reach a protected route by skipping it.
 *
 * The guard is also the only place that reads the operator
 * token, so there is exactly one code path that can be
 * reasoned about.
 *
 * Server-only.
 */

/** Message returned to an unauthenticated caller. */
export const AUTH_REQUIRED_MESSAGE =
  'Authentication required. Sign in with the operator token.';

/**
 * Reads a single cookie from the request's `Cookie` header.
 * Returns undefined when the cookie is absent.
 */
export function readCookie(
  request: Request,
  name: string,
): string | undefined {
  const header = request.headers.get('cookie');

  if (!header) {
    return undefined;
  }

  for (const part of header.split(';')) {
    const separator = part.indexOf('=');

    if (separator === -1) {
      continue;
    }

    if (part.slice(0, separator).trim() !== name) {
      continue;
    }

    const raw = part.slice(separator + 1).trim();

    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }

  return undefined;
}

/** True when the request carries a valid operator session. */
export function isAuthenticated(request: Request): boolean {
  const token = readOperatorToken();

  if (!token) {
    return false;
  }

  return verifySessionValue(
    readCookie(request, SESSION_COOKIE_NAME),
    token,
  );
}

/**
 * Returns a 401 response when the request is not
 * authenticated, or null when it is.
 */
export function requireOperator(request: Request): NextResponse | null {
  if (isAuthenticated(request)) {
    return null;
  }

  return NextResponse.json(
    { ok: false, error: AUTH_REQUIRED_MESSAGE },
    { status: 401 },
  );
}
