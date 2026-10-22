import { NextResponse } from 'next/server';

import {
  buildClearedSessionCookie,
  isSecureRequest,
} from '@/lib/security/session';

/**
 * =========================================================
 * OPERATOR SIGN OUT
 * =========================================================
 *
 * POST /api/auth/logout
 *
 * Clears the session cookie. The session is stateless, so
 * there is no server-side record to revoke — the cookie is
 * deleted and the browser stops sending it.
 */

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const response = NextResponse.json({ ok: true });

  response.headers.set(
    'Set-Cookie',
    buildClearedSessionCookie(isSecureRequest(request)),
  );

  return response;
}
