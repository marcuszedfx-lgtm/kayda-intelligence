import { NextResponse } from 'next/server';
import { ingestLiveIntelligence } from '@/lib/intelligence/live-ingestion';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await ingestLiveIntelligence();

    return NextResponse.json({
      ok: true,
      fetchedAt: new Date().toISOString(),
      ...result,
    });
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
