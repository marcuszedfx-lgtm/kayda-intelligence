import { NextResponse } from 'next/server';

import {
  getAIProviderStatuses,
  getSearchProviderStatuses,
} from '@/lib/ai/provider-factory';
import { checkDatabaseConnection } from '@/lib/db/connection-check';
import { requireOperator } from '@/lib/security/guards';
import {
  getMigrationStatus,
  type MigrationStatusResult,
} from '@/lib/db/migration-status';
import {
  getSignalCount,
  getWorkspaceCounts,
} from '@/lib/db/workspace-repository';
import type { WorkspaceCounts } from '@/lib/workspace/types';
import {
  getRegistryDisplayPath,
  loadRegistry,
} from '@/lib/intelligence/registry-store';

/**
 * =========================================================
 * HONEST SYSTEM STATUS
 * =========================================================
 *
 * Reports the real state of Kayda's integrations. This
 * endpoint never fabricates health: an unconfigured provider
 * is reported as unconfigured, an unreachable database as
 * unreachable, and an empty registry as empty.
 *
 * It makes no external network calls. The database check is
 * read-only and refuses to touch any port other than Kayda's
 * dedicated 5433.
 *
 * No secret value is ever included in the response — only
 * presence booleans and configured model names.
 *
 * AUTHORIZATION: requires a valid operator session. This
 * endpoint reports the system's topology, database target
 * and provider configuration, so it is not public.
 * =========================================================
 */

export const dynamic = 'force-dynamic';

interface DatabaseState {
  migrations: MigrationStatusResult;
  counts: WorkspaceCounts | null;
  signals: number | null;
}

/**
 * Reads migration, record and signal state only when the
 * database is reachable. Nothing is guessed from a failed
 * connection: every field becomes explicitly unknown.
 */
async function readDatabaseState(
  reachable: boolean,
): Promise<DatabaseState> {
  if (!reachable) {
    return {
      migrations: {
        state: 'unknown',
        appliedCount: 0,
        baselineApplied: false,
        migrations: [],
        detail:
          'The database is unreachable, so migration state cannot be established.',
      },
      counts: null,
      signals: null,
    };
  }

  const migrations = await getMigrationStatus();

  let counts: WorkspaceCounts | null = null;
  let signals: number | null = null;

  try {
    counts = await getWorkspaceCounts();
  } catch {
    counts = null;
  }

  try {
    signals = await getSignalCount();
  } catch {
    signals = null;
  }

  return { migrations, counts, signals };
}

export async function GET(request: Request) {
  const denied = requireOperator(request);

  if (denied) {
    return denied;
  }

  const aiProviders = getAIProviderStatuses();
  const searchProviders = getSearchProviderStatuses();
  const database = await checkDatabaseConnection();
  const reachable = database.status === 'reachable';
  const databaseState = await readDatabaseState(reachable);

  const { registry, errors, exists } = loadRegistry();

  const configuredAI = aiProviders.filter(
    (provider) => provider.configured,
  );

  return NextResponse.json({
    ok: true,
    fetchedAt: new Date().toISOString(),

    ai: {
      configuredCount: configuredAI.length,
      configured: configuredAI.map((provider) => ({
        id: provider.id,
        name: provider.name,
        model: provider.model,
        adapter: provider.adapter,
        costClass: provider.costClass,
      })),
      notConfigured: aiProviders
        .filter((provider) => !provider.configured)
        .map((provider) => ({
          id: provider.id,
          name: provider.name,
          adapter: provider.adapter,
          reason: provider.reason,
        })),
      note: configuredAI.length
        ? 'At least one AI provider is configured. Kayda still requires the engine to be wired before it will produce analysis.'
        : 'No AI provider is configured. Kayda will not invent analysis in the meantime.',
    },

    search: {
      providers: searchProviders.map((provider) => ({
        id: provider.id,
        name: provider.name,
        apiKeyPresent: provider.apiKeyPresent,
        implemented: provider.implemented,
        note: provider.note,
      })),
      note: 'No search adapter is implemented. Search enrichment is not available.',
    },

    database: {
      status: database.status,
      code: database.code,
      detail: database.detail,
      ...(database.port ? { port: database.port } : {}),
      migrations: {
        state: databaseState.migrations.state,
        appliedCount: databaseState.migrations.appliedCount,
        baselineApplied: databaseState.migrations.baselineApplied,
        detail: databaseState.migrations.detail,
        records: databaseState.migrations.migrations,
      },
      note: reachable
        ? 'Read-only connection check plus migration tracking read from _prisma_migrations. This endpoint changes nothing.'
        : 'The database is unreachable. Migration state, record counts and signal counts cannot be established.',
    },

    persistence: {
      storage: 'postgres',
      reachable,
      workspaceRecords: databaseState.counts,
      note: reachable
        ? 'Workspace records are read from and written to PostgreSQL. Browser localStorage is read only once, to import existing records into empty tables.'
        : 'Workspace records are unavailable while PostgreSQL is unreachable. No silent browser fallback is used, so stale data is never presented as persisted.',
    },

    registry: {
      exists,
      path: getRegistryDisplayPath(),
      sources: registry.sources.length,
      companies: registry.companies.length,
      companyProfiles: registry.companyProfiles.length,
      relationships: registry.companySourceRelationships.length,
      errors,
      note: exists
        ? 'Runtime registry loaded from data/kayda-registry.json.'
        : 'No registry file found. Kayda monitors no sources and no companies until you create data/kayda-registry.json (see config/intelligence-registry.example.json).',
    },

    intelligence: {
      signalsPersisted: databaseState.signals,
      note:
        databaseState.signals === null
          ? 'Signal count could not be read from the database.'
          : databaseState.signals === 0
            ? 'No intelligence signals have been persisted. The analysis pipeline is not wired to storage yet.'
            : `${databaseState.signals} persisted signal(s).`,
    },
  }, { headers: { 'Cache-Control': 'no-store' } });
}
