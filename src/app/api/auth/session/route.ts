import { NextResponse } from 'next/server';

import { isAuthenticated } from '@/lib/security/guards';

/**
 * =========================================================
 * OPERATOR SESSION STATE
 * =========================================================
 *
 * GET /api/auth/session
 *
 * Reports whether the caller holds a valid operator session.
 * It returns a single boolean and no secret material, so it
 * is reachable without a session — that is the point of it.
 */

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return NextResponse.json(
    {
      ok: true,
      authenticated: isAuthenticated(request),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
