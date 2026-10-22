import { getPrisma } from './prisma';
import {
  evaluateDatabaseTarget,
  KAYDA_DB_PORT,
} from './port-guard';

/**
 * =========================================================
 * KAYDA INTELLIGENCE — DATABASE CONNECTION CHECK
 * =========================================================
 *
 * READ-ONLY. Verifies that Kayda's dedicated PostgreSQL
 * instance is reachable. It never writes, migrates, resets,
 * deletes, or alters any schema or data.
 *
 * SAFETY: this check and the Prisma client creation path
 * share ONE policy, defined in `port-guard.ts`. If the
 * configured DATABASE_URL points anywhere other than Kayda's
 * dedicated port 5433 on a local host, the check refuses to
 * connect and so does `getPrisma()`.
 */

/** Kayda's dedicated database port. */
export { KAYDA_DB_PORT };

export type ConnectionCheckStatus =
  | 'reachable'
  | 'unreachable'
  | 'not_configured'
  | 'refused_wrong_port'
  | 'refused_wrong_host';

export interface ConnectionCheckResult {
  status: ConnectionCheckStatus;
  /** Safe, non-secret detail. Never contains credentials. */
  detail: string;
  /**
   * Stable machine-readable code for the outcome. Always present
   * and always one of a fixed set, so a client can branch on it
   * without ever being shown the underlying driver error.
   */
  code: string;
  port?: string;
}

/**
 * Returns the configured database port exactly as written in
 * DATABASE_URL, or undefined when no DATABASE_URL is set or it
 * cannot be parsed. Never exposes the username, password,
 * host, or database name.
 */
export function getConfiguredPort(): string | undefined {
  const raw = process.env.DATABASE_URL?.trim();

  if (!raw) {
    return undefined;
  }

  try {
    return new URL(raw).port || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Decides whether it is safe to connect. Split out so the
 * guard can be tested without a database.
 *
 * The policy itself lives in `port-guard.ts` and is shared
 * with the Prisma client creation path.
 */
export function evaluateConnectionTarget(): {
  allowed: boolean;
  result?: ConnectionCheckResult;
} {
  const target = evaluateDatabaseTarget();

  if (target.allowed) {
    return { allowed: true };
  }

  const status: ConnectionCheckStatus =
    target.status === 'not_configured'
      ? 'not_configured'
      : target.status === 'refused_wrong_host'
        ? 'refused_wrong_host'
        : 'refused_wrong_port';

  return {
    allowed: false,
    result: {
      status,
      code: `database_${status}`,
      detail: target.detail,
      ...(target.port ? { port: target.port } : {}),
    },
  };
}

/**
 * Performs a read-only reachability check against Kayda's
 * dedicated database.
 *
 * - No DATABASE_URL: `not_configured` (an honest state, not an
 *   error).
 * - Port is 5432 or anything other than 5433, or the host is
 *   not local: refused, and no connection is attempted.
 * - Otherwise: issues a trivial `SELECT 1` and reports
 *   `reachable` or `unreachable`.
 */
export async function checkDatabaseConnection(): Promise<ConnectionCheckResult> {
  const target = evaluateConnectionTarget();

  if (!target.allowed) {
    return target.result!;
  }

  const port = getConfiguredPort();

  try {
    await getPrisma().$queryRaw`SELECT 1`;

    return {
      status: 'reachable',
      code: 'database_reachable',
      detail: `Connected to Kayda's dedicated database on port ${KAYDA_DB_PORT}.`,
      ...(port ? { port } : {}),
    };
  } catch (error) {
    // The driver's message can name the host, port, role and
    // database. It stays in the server log, where only someone at
    // the machine can read it; the response carries a fixed
    // sentence and a stable code instead of the raw text.
    const driverMessage =
      error instanceof Error ? error.message : String(error);
    const driverCode =
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      typeof (error as { code?: unknown }).code === 'string'
        ? ` (${(error as { code: string }).code})`
        : '';

    console.error(
      `[kayda] database unreachable on port ${KAYDA_DB_PORT}${driverCode}: ${driverMessage}`,
    );

    return {
      status: 'unreachable',
      code: 'database_unreachable',
      detail: `Could not reach Kayda's dedicated database on port ${KAYDA_DB_PORT}. The underlying error is in the server log.`,
      ...(port ? { port } : {}),
    };
  }
}
