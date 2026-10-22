import { PrismaClient } from '@prisma/client';

import { assertAllowedDatabaseTarget } from './port-guard';

/**
 * =========================================================
 * KAYDA INTELLIGENCE — PRISMA CLIENT SINGLETON
 * =========================================================
 *
 * Lazily-instantiated Prisma client.
 *
 * Importing this module does NOT construct or connect a
 * client. `getPrisma()` builds the singleton on first use, so
 * routes that only report status (and a machine with no
 * DATABASE_URL) never touch Prisma at all.
 *
 * SAFETY: the shared database target guard runs inside
 * `getPrisma()`, before the client is constructed and
 * therefore before any socket can be opened. The validated
 * URL is handed to Prisma explicitly, so the client cannot
 * connect anywhere the guard did not approve — including
 * port 5432, which belongs to the trading platform.
 *
 * Nothing here writes, migrates, or alters schema.
 */

const globalForPrisma = globalThis as unknown as {
  kaydaPrisma?: PrismaClient;
};

export function getPrisma(): PrismaClient {
  if (!globalForPrisma.kaydaPrisma) {
    const target = assertAllowedDatabaseTarget();

    globalForPrisma.kaydaPrisma = new PrismaClient({
      datasources: { db: { url: target.url } },
    });
  }

  return globalForPrisma.kaydaPrisma;
}
