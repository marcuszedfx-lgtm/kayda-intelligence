import type {
  Activity,
  Business,
  Contact,
  Deal,
  Project,
  Task,
} from '@/types/domain';

/**
 * =========================================================
 * KAYDA INTELLIGENCE — WORKSPACE PERSISTENCE CONTRACTS
 * =========================================================
 *
 * Shared, dependency-free types for the workspace records
 * that are persisted in PostgreSQL.
 *
 * Persisted collections map to existing Prisma models:
 *
 *   businesses → Business      contacts → Contact
 *   deals      → Deal          projects → Project
 *   tasks      → Task          activities → Activity
 *
 * Priorities are NOT persisted: the Prisma schema has no
 * Priority model, and Stage 3 may not add one without a
 * separately approved migration.
 * =========================================================
 */

export const WORKSPACE_RECORD_TYPES = [
  'businesses',
  'contacts',
  'deals',
  'projects',
  'tasks',
] as const;

export type WorkspaceRecordType =
  (typeof WORKSPACE_RECORD_TYPES)[number];

export interface WorkspaceSnapshot {
  businesses: Business[];
  contacts: Contact[];
  deals: Deal[];
  projects: Project[];
  tasks: Task[];
  activities: Activity[];
}

export interface WorkspaceCounts {
  businesses: number;
  contacts: number;
  deals: number;
  projects: number;
  tasks: number;
  activities: number;
  total: number;
}

export interface WorkspaceCreateInput {
  type: WorkspaceRecordType;
  title: string;
  detail: string;
}

export interface ImportSummary {
  imported: Record<string, number>;
  skipped: Record<string, string>;
}

export const MAX_TITLE_LENGTH = 200;
export const MAX_DETAIL_LENGTH = 2000;

/**
 * Maximum records in a single imported collection.
 */
export const MAX_IMPORT_RECORDS = 2000;

/**
 * Maximum records across ALL imported collections combined.
 *
 * The per-collection limit alone would still allow six
 * collections of 2,000 records each. This total limit is
 * enforced in the validation layer, before the transaction
 * opens, so an oversized import never reaches the database.
 */
export const MAX_TOTAL_IMPORT_RECORDS = 2000;

export class WorkspaceValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkspaceValidationError';
  }
}
