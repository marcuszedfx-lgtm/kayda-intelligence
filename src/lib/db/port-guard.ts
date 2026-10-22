/**
 * =========================================================
 * KAYDA INTELLIGENCE — DATABASE TARGET GUARD
 * =========================================================
 *
 * ONE policy, TWO consumers: the read-only status check and
 * the shared Prisma client creation path both call
 * `evaluateDatabaseTarget()` before anything can open a
 * socket. There is no second, looser path.
 *
 * The policy:
 *
 * - Kayda's database is the dedicated PostgreSQL instance on
 *   host port 5433. Nothing else is permitted.
 * - Port 5432 belongs to the trading platform and is
 *   refused by name.
 * - A URL with no explicit port defaults to 5432, so it is
 *   refused too.
 * - The host must be a loopback address, unless it is
 *   explicitly listed in `KAYDA_ALLOWED_DB_HOSTS`.
 *
 * Nothing here writes, migrates, seeds, or alters anything.
 * It only decides whether a connection may be attempted.
 */

/** Kayda's dedicated database port. */
export const KAYDA_DB_PORT = '5433';

/** The trading platform's port — never permitted. */
export const FORBIDDEN_DB_PORT = '5432';

/** Environment variable holding extra permitted database hosts. */
export const ALLOWED_DB_HOSTS_ENV = 'KAYDA_ALLOWED_DB_HOSTS';

/** Hosts that are always considered local. */
export const LOCAL_DB_HOSTS = ['localhost', '127.0.0.1', '::1'] as const;

export type DatabaseTargetStatus =
  | 'not_configured'
  | 'refused_wrong_port'
  | 'refused_wrong_host'
  | 'allowed';

export interface DatabaseTarget {
  /** Whether a connection may be attempted. */
  allowed: boolean;
  /** Machine-readable reason. */
  status: DatabaseTargetStatus;
  /** Safe, non-secret explanation. Never contains credentials. */
  detail: string;
  /** The configured port, when one could be determined. */
  port?: string;
  /** The validated connection URL. Present only when allowed. */
  url?: string;
}

/** Raised when a connection is attempted against a disallowed target. */
export class DatabaseTargetError extends Error {
  readonly status: DatabaseTargetStatus;
  readonly port?: string;

  constructor(message: string, status: DatabaseTargetStatus, port?: string) {
    super(message);
    this.name = 'DatabaseTargetError';
    this.status = status;
    this.port = port;
  }
}

/** Extra permitted database hosts configured through the environment. */
export function getAllowedDbHosts(): string[] {
  const raw = process.env[ALLOWED_DB_HOSTS_ENV];

  if (!raw) {
    return [];
  }

  return raw
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Evaluates the configured database target.
 *
 * Split out from the connection attempt so the policy can be
 * exercised without a database and without a socket.
 */
export function evaluateDatabaseTarget(
  rawUrl: string | undefined = process.env.DATABASE_URL,
): DatabaseTarget {
  const raw = rawUrl?.trim();

  if (!raw) {
    return {
      allowed: false,
      status: 'not_configured',
      detail:
        'DATABASE_URL is not set. Set it to your Kayda PostgreSQL instance (port 5433) to enable persistence.',
    };
  }

  let url: URL;

  try {
    url = new URL(raw);
  } catch {
    return {
      allowed: false,
      status: 'not_configured',
      detail:
        'DATABASE_URL is not a valid URL, so no connection can be attempted.',
    };
  }

  // A URL with no explicit port means the provider default
  // (5432 for postgres), which is never Kayda's.
  const port = url.port || FORBIDDEN_DB_PORT;

  if (port === FORBIDDEN_DB_PORT) {
    return {
      allowed: false,
      status: 'refused_wrong_port',
      detail: `Refusing to connect: port ${FORBIDDEN_DB_PORT} is reserved for the trading platform. Kayda's database must be on port ${KAYDA_DB_PORT}.`,
      port,
    };
  }

  if (port !== KAYDA_DB_PORT) {
    return {
      allowed: false,
      status: 'refused_wrong_port',
      detail: `Refusing to connect: port ${port} is not Kayda's dedicated port ${KAYDA_DB_PORT}.`,
      port,
    };
  }

  const hostname = url.hostname.toLowerCase();

  if (
    !(LOCAL_DB_HOSTS as readonly string[]).includes(hostname) &&
    !getAllowedDbHosts().includes(hostname)
  ) {
    return {
      allowed: false,
      status: 'refused_wrong_host',
      detail: `Refusing to connect: host ${hostname} is not a local address and is not listed in ${ALLOWED_DB_HOSTS_ENV}.`,
      port,
    };
  }

  return {
    allowed: true,
    status: 'allowed',
    detail: `Kayda's dedicated database on port ${KAYDA_DB_PORT}.`,
    port,
    url: raw,
  };
}

/**
 * Returns the validated connection URL, or throws when the
 * configured target is not permitted.
 *
 * This is the only way the application obtains a database
 * URL, so a disallowed target can never reach Prisma.
 */
export function assertAllowedDatabaseTarget(): {
  url: string;
  port: string;
} {
  const target = evaluateDatabaseTarget();

  if (!target.allowed || !target.url) {
    throw new DatabaseTargetError(
      target.detail,
      target.status,
      target.port,
    );
  }

  return { url: target.url, port: target.port! };
}
