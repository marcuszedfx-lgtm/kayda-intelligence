import { NextResponse } from 'next/server';

import {
  checkLoginThrottle,
  clearLoginFailures,
  LOCAL_SOURCE_KEY,
  recordLoginFailure,
} from '@/lib/security/login-throttle';
import { readForwardedClientAddress } from '@/lib/security/trusted-proxy';
import {
  isOperatorTokenConfigured,
  readOperatorToken,
  tokensMatch,
} from '@/lib/security/operator-token';
import {
  buildSessionCookie,
  createSessionValue,
  isSecureRequest,
} from '@/lib/security/session';
import {
  MAX_LOGIN_BODY_BYTES,
  readJsonBody,
  RequestBodyError,
} from '@/lib/security/request-limits';

/**
 * =========================================================
 * OPERATOR LOGIN
 * =========================================================
 *
 * POST /api/auth/login
 *
 * The operator types the token once per browser session.
 * The server compares it against `KAYDA_OPERATOR_TOKEN` in
 * constant time and, on success, issues an HTTP-only session
 * cookie.
 *
 * The token itself is never echoed back, never stored in the
 * cookie, and never logged. Only a signed, expiring session
 * value derived from it leaves the server.
 */

export const dynamic = 'force-dynamic';

/** Delay applied to a failed attempt, to slow brute force. */
const FAILURE_DELAY_MS = 250;

/**
 * Identifies the source of the attempt, for throttling only.
 *
 * The key must not be attacker-controlled: Kayda is bound to
 * loopback, a route handler is handed no socket address, and a
 * forwarded header on a direct request was typed by the client.
 * So with no reverse proxy configured every caller shares the
 * single `LOCAL_SOURCE_KEY` bucket — the honest answer for an
 * application whose only possible peer is the operator's own
 * machine.
 *
 * An address is taken from `X-Forwarded-For` only when the
 * operator has explicitly configured `KAYDA_TRUSTED_PROXY`,
 * because only then is that header the observation of a proxy
 * rather than a value the client chose.
 *
 * This exists to bound guessing, not to attribute blame.
 */
function clientKey(request: Request): string {
  return readForwardedClientAddress(request) ?? LOCAL_SOURCE_KEY;
}

function errorResponse(
  status: number,
  error: string,
  headers: Record<string, string> = {},
): NextResponse {
  return NextResponse.json(
    { ok: false, error },
    { status, headers },
  );
}

export async function POST(request: Request) {
  const key = clientKey(request);
  const throttle = checkLoginThrottle(key);

  if (!throttle.allowed) {
    return errorResponse(
      429,
      'Too many failed sign-in attempts. Wait before trying again.',
      { 'Retry-After': String(throttle.retryAfterSeconds) },
    );
  }

  let body: unknown;

  try {
    body = await readJsonBody(request, MAX_LOGIN_BODY_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return errorResponse(error.status, error.message);
    }

    return errorResponse(400, 'Request body must be valid JSON.');
  }

  const candidate =
    body && typeof body === 'object' && 'token' in body
      ? (body as { token?: unknown }).token
      : undefined;

  if (typeof candidate !== 'string' || !candidate) {
    return errorResponse(400, 'Field "token" must be a string.');
  }

  const expected = readOperatorToken();

  if (!expected) {
    return errorResponse(
      503,
      'Operator login is not configured. Set KAYDA_OPERATOR_TOKEN in .env and restart the server.',
    );
  }

  if (!tokensMatch(candidate.trim(), expected)) {
    recordLoginFailure(key);

    await new Promise((resolve) =>
      setTimeout(resolve, FAILURE_DELAY_MS),
    );

    return errorResponse(401, 'Invalid operator token.');
  }

  clearLoginFailures(key);

  const secure = isSecureRequest(request);
  const response = NextResponse.json({ ok: true });

  response.headers.set(
    'Set-Cookie',
    buildSessionCookie(createSessionValue(expected), secure),
  );

  return response;
}
