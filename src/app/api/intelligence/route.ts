import { NextResponse } from 'next/server';

import { ingestLiveIntelligence } from '@/lib/intelligence/live-ingestion';
import { requireOperator } from '@/lib/security/guards';

/**
 * =========================================================
 * LIVE INTELLIGENCE INGESTION
 * =========================================================
 *
 * GET /api/intelligence
 *
 * Runs a live ingestion pass against the configured sources and
 * returns the normalized articles. It makes outbound requests to
 * third parties but writes NOTHING: no signal, no row, no file.
 * Persistence is not wired up yet, which /api/status reports
 * honestly.
 *
 * AUTHORIZATION: requires a valid operator session. The route
 * reaches out to third-party sources, so it is never reachable
 * without authentication.
 *
 * NOTE ON THE VERB: because this is a GET, the proxy's Origin and
 * `Sec-Fetch-Site` checks (which cover POST, PUT, PATCH and
 * DELETE) do not apply to it. That is acceptable while the route
 * only reads. If it is ever given a write, it must move to POST —
 * a state-changing GET is not covered by the cross-origin write
 * defences.
 */

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const denied = requireOperator(request);

  if (denied) {
    return denied;
  }

  try {
    const result = await ingestLiveIntelligence();

    return NextResponse.json(
      {
        ok: true,
        fetchedAt: new Date().toISOString(),
        ...result,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unable to ingest live intelligence.',
      },
      { status: 500 },
    );
  }
}
