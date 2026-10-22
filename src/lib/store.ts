import type { Priority } from '@/types/domain';
import type {
  ImportSummary,
  WorkspaceCounts,
  WorkspaceRecordType,
  WorkspaceSnapshot,
} from '@/lib/workspace/types';

/**
 * =========================================================
 * KAYDA INTELLIGENCE — WORKSPACE CLIENT
 * =========================================================
 *
 * Records now live in PostgreSQL. This module is the ONLY
 * browser-side data access path; it talks to
 * `/api/workspace` and never touches the database directly.
 *
 * localStorage is retained for exactly one purpose: reading
 * a pre-existing snapshot so it can be imported once into
 * empty tables. Nothing is written back to localStorage, and
 * no local snapshot is ever deleted or overwritten.
 * =========================================================
 */

export interface KaydaState extends WorkspaceSnapshot {
  /**
   * Not persisted: the Prisma schema has no Priority model,
   * and adding one requires a separately approved migration.
   */
  priorities: Priority[];
}

export const initialState: KaydaState = {
  businesses: [],
  contacts: [],
  deals: [],
  priorities: [],
  projects: [],
  activities: [],
  tasks: [],
};

/** Key written by the retired browser-only store (V1.2). */
export const LEGACY_KEY = 'kayda-intelligence-state-v12';

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

/**
 * Reads the retired browser snapshot, if one exists.
 * Returns null when there is nothing to import — never an
 * empty object pretending to be data.
 */
export function readLegacyState(): KaydaState | null {
  if (typeof window === 'undefined') return null;

  let raw: string | null;

  try {
    raw = window.localStorage.getItem(LEGACY_KEY);
  } catch {
    return null;
  }

  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<KaydaState>;

    return {
      businesses: asArray(parsed.businesses),
      contacts: asArray(parsed.contacts),
      deals: asArray(parsed.deals),
      priorities: asArray(parsed.priorities),
      projects: asArray(parsed.projects),
      activities: asArray(parsed.activities),
      tasks: asArray(parsed.tasks),
    };
  } catch {
    return null;
  }
}

/** Number of importable (non-priority) records in a snapshot. */
export function legacyRecordCount(state: KaydaState): number {
  return (
    state.businesses.length +
    state.contacts.length +
    state.deals.length +
    state.projects.length +
    state.tasks.length +
    state.activities.length
  );
}

export interface WorkspacePayload {
  storage: 'postgres';
  state: WorkspaceSnapshot;
  counts: WorkspaceCounts;
}

/**
 * Raised when the server refuses a request because the
 * operator session is missing or expired. The interface uses
 * this to send the operator back to the sign-in page rather
 * than reporting a database failure.
 */
export class WorkspaceAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkspaceAuthError';
  }
}

function messageFrom(payload: unknown, fallback: string): string {
  if (
    payload &&
    typeof payload === 'object' &&
    'error' in payload &&
    typeof (payload as { error?: unknown }).error === 'string'
  ) {
    return (payload as { error: string }).error;
  }

  return fallback;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function fetchWorkspace(): Promise<WorkspacePayload> {
  const response = await fetch('/api/workspace', {
    cache: 'no-store',
  });
  const payload = await readJson(response);

  if (response.status === 401) {
    throw new WorkspaceAuthError(
      messageFrom(payload, 'Sign in to load workspace records.'),
    );
  }

  if (!response.ok) {
    throw new Error(
      messageFrom(
        payload,
        'Workspace records could not be loaded from the server.',
      ),
    );
  }

  const data = payload as {
    state: WorkspaceSnapshot;
    counts: WorkspaceCounts;
  };

  return {
    storage: 'postgres',
    state: data.state,
    counts: data.counts,
  };
}

export async function createWorkspaceRecord(
  type: WorkspaceRecordType,
  title: string,
  detail: string,
): Promise<void> {
  const response = await fetch('/api/workspace', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, title, detail }),
  });

  if (response.status === 401) {
    const payload = await readJson(response);

    throw new WorkspaceAuthError(
      messageFrom(payload, 'Sign in to save records.'),
    );
  }

  if (!response.ok) {
    const payload = await readJson(response);

    throw new Error(
      messageFrom(
        payload,
        'The record could not be saved to the database.',
      ),
    );
  }
}

export async function importLegacyWorkspace(
  state: KaydaState,
): Promise<ImportSummary> {
  const response = await fetch('/api/workspace/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state }),
  });

  const payload = await readJson(response);

  if (response.status === 401) {
    throw new WorkspaceAuthError(
      messageFrom(payload, 'Sign in to import browser records.'),
    );
  }

  if (!response.ok) {
    throw new Error(
      messageFrom(
        payload,
        'Existing browser records could not be imported.',
      ),
    );
  }

  const data = payload as ImportSummary;

  return { imported: data.imported, skipped: data.skipped };
}
