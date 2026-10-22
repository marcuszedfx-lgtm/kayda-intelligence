import { NextResponse } from 'next/server';

import { importLegacyWorkspace } from '@/lib/db/workspace-repository';
import { DatabaseTargetError } from '@/lib/db/port-guard';
import { requireOperator } from '@/lib/security/guards';
import {
  MAX_IMPORT_BODY_BYTES,
  readJsonBody,
  RequestBodyError,
} from '@/lib/security/request-limits';
import { WorkspaceValidationError } from '@/lib/workspace/types';
import { parseLegacyCollections } from '@/lib/workspace/validation';

/**
 * =========================================================
 * ONE-TIME LEGACY IMPORT
 * =========================================================
 *
 * POST /api/workspace/import
 *
 * Accepts a snapshot of the retired browser-storage state
 * and inserts it into PostgreSQL ONLY where the target table
 * is empty. A table that already holds rows is skipped and
 * reported — existing data is never merged, overwritten or
 * deleted, and the browser snapshot is left intact.
 *
 * Nothing happens automatically: the UI calls this once, and
 * only when the database reports zero records.
 *
 * AUTHORIZATION: requires a valid operator session.
 *
 * LIMITS: the body is capped at 8 MB and must be declared as
 * JSON. The record count is capped again inside the
 * validation layer, before the transaction opens, so an
 * oversized import can never reach the database.
 */

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const denied = requireOperator(request);

  if (denied) {
    return denied;
  }

  let body: unknown;

  try {
    body = await readJsonBody(request, MAX_IMPORT_BODY_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { ok: false, error: 'Request body must be valid JSON.' },
      { status: 400 },
    );
  }

  try {
    const collections = parseLegacyCollections(body);
    const summary = await importLegacyWorkspace(collections);

    return NextResponse.json(
      {
        ok: true,
        ...summary,
        note: 'Imported only into empty tables. Existing records were not modified and the browser snapshot was left intact.',
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    if (error instanceof WorkspaceValidationError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 400 },
      );
    }

    if (error instanceof DatabaseTargetError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error:
          'The import could not run because PostgreSQL is unavailable or rejected the data. The transaction was rolled back.',
      },
      { status: 503 },
    );
  }
}
