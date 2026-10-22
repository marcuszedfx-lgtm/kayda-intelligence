import { getPrisma } from './prisma';

/**
 * =========================================================
 * KAYDA INTELLIGENCE — MIGRATION STATUS
 * =========================================================
 *
 * Read-only. Reports what Prisma has actually recorded in
 * `_prisma_migrations`. It never claims migrations are
 * initialized unless a completed, non-rolled-back migration
 * row is present.
 *
 * Three outcomes, deliberately distinct:
 *
 *   initialized      a completed migration record exists
 *   not_initialized  the table is absent (no baseline yet)
 *   unknown          the check itself failed
 * =========================================================
 */

export type MigrationState =
  | 'initialized'
  | 'not_initialized'
  | 'unknown';

export interface MigrationRecord {
  name: string;
  finishedAt: string | null;
  rolledBack: boolean;
}

export interface MigrationStatusResult {
  state: MigrationState;
  appliedCount: number;
  baselineApplied: boolean;
  migrations: MigrationRecord[];
  detail: string;
}

interface MigrationRow {
  migration_name: string;
  finished_at: Date | null;
  rolled_back_at: Date | null;
}

export const BASELINE_MIGRATION = '0_init';

function isMissingTableError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : String(error);

  // Only an explicitly missing relation counts as "not initialised".
  // Any other failure (permissions, connectivity) must stay "unknown"
  // rather than being misreported as a missing baseline.
  return (
    /relation .* does not exist/i.test(message) ||
    /table .* does not exist/i.test(message) ||
    /\b42P01\b/.test(message) ||
    /\bP2021\b/.test(message)
  );
}

export async function getMigrationStatus(): Promise<MigrationStatusResult> {
  let rows: MigrationRow[];

  try {
    rows = await getPrisma().$queryRaw<MigrationRow[]>`
      SELECT migration_name, finished_at, rolled_back_at
      FROM "_prisma_migrations"
      ORDER BY started_at ASC
    `;
  } catch (error) {
    if (isMissingTableError(error)) {
      return {
        state: 'not_initialized',
        appliedCount: 0,
        baselineApplied: false,
        migrations: [],
        detail:
          'No _prisma_migrations table exists, so no migration baseline has been recorded.',
      };
    }

    return {
      state: 'unknown',
      appliedCount: 0,
      baselineApplied: false,
      migrations: [],
      detail:
        'Migration state could not be established because the database query failed.',
    };
  }

  const migrations: MigrationRecord[] = rows.map((row) => ({
    name: row.migration_name,
    finishedAt: row.finished_at
      ? new Date(row.finished_at).toISOString()
      : null,
    rolledBack: Boolean(row.rolled_back_at),
  }));

  const appliedCount = migrations.filter(
    (migration) => migration.finishedAt && !migration.rolledBack,
  ).length;

  const baselineApplied = migrations.some(
    (migration) =>
      migration.name === BASELINE_MIGRATION &&
      Boolean(migration.finishedAt) &&
      !migration.rolledBack,
  );

  return {
    state:
      appliedCount > 0 ? 'initialized' : 'not_initialized',
    appliedCount,
    baselineApplied,
    migrations,
    detail:
      appliedCount > 0
        ? `${appliedCount} migration(s) recorded as applied.`
        : 'The _prisma_migrations table exists but records no completed migration.',
  };
}
