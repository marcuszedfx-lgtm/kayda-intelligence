import { NextResponse } from 'next/server';

import {
  createWorkspaceRecord,
  getWorkspaceCounts,
  getWorkspaceSnapshot,
} from '@/lib/db/workspace-repository';
import { DatabaseTargetError } from '@/lib/db/port-guard';
import { requireOperator } from '@/lib/security/guards';
import {
  MAX_CREATE_BODY_BYTES,
  readJsonBody,
  RequestBodyError,
} from '@/lib/security/request-limits';
import { WorkspaceValidationError } from '@/lib/workspace/types';
import { parseCreateWorkspaceInput } from '@/lib/workspace/validation';

/**
 * =========================================================
 * WORKSPACE RECORDS API
 * =========================================================
 *
 * GET  /api/workspace  → persisted snapshot + counts
 * POST /api/workspace  → create one validated record
 *
 * Server-only. Prisma and DATABASE_URL never reach the
 * browser. There is NO silent localStorage fallback: if the
 * database cannot be read, the request fails with 503 rather
 * than serving stale browser data as if it were persisted.
 *
 * AUTHORIZATION: both verbs require a valid operator session.
 * The check is performed here, in the route handler, not only
 * in the request proxy — authorization must not depend on a
 * single layer.
 *
 * LIMITS: the request body is capped at 64 KB and must be
 * declared as JSON. Both are enforced before the body is
 * parsed.
 */

export const dynamic = 'force-dynamic';

const UNAVAILABLE =
  'Workspace records could not be read from PostgreSQL. Nothing is shown rather than stale browser data.';

function unavailable(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function GET(request: Request) {
  const denied = requireOperator(request);

  if (denied) {
    return denied;
  }

  try {
    const [state, counts] = await Promise.all([
      getWorkspaceSnapshot(),
      getWorkspaceCounts(),
    ]);

    return NextResponse.json(
      {
        ok: true,
        storage: 'postgres',
        fetchedAt: new Date().toISOString(),
        state,
        counts,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    if (error instanceof DatabaseTargetError) {
      return unavailable(503, error.message);
    }

    return unavailable(503, UNAVAILABLE);
  }
}

export async function POST(request: Request) {
  const denied = requireOperator(request);

  if (denied) {
    return denied;
  }

  let body: unknown;

  try {
    body = await readJsonBody(request, MAX_CREATE_BODY_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return unavailable(error.status, error.message);
    }

    return unavailable(400, 'Request body must be valid JSON.');
  }

  try {
    const input = parseCreateWorkspaceInput(body);
    const created = await createWorkspaceRecord(input);

    return NextResponse.json(
      { ok: true, ...created },
      { status: 201, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    if (error instanceof WorkspaceValidationError) {
      return unavailable(400, error.message);
    }

    if (error instanceof DatabaseTargetError) {
      return unavailable(503, error.message);
    }

    return unavailable(
      503,
      'The record could not be saved because PostgreSQL is unavailable. Nothing was written.',
    );
  }
}
