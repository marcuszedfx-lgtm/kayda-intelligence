import type { Prisma } from '@prisma/client';

import type {
  Activity,
  Business,
  Contact,
  Deal,
  Health,
  Project,
  RecordStatus,
  Task,
} from '@/types/domain';
import type {
  ImportSummary,
  WorkspaceCounts,
  WorkspaceCreateInput,
  WorkspaceSnapshot,
} from '@/lib/workspace/types';
import type {
  LegacyCollectionKey,
  LegacyCollections,
} from '@/lib/workspace/validation';
import { getPrisma } from './prisma';

/**
 * =========================================================
 * KAYDA INTELLIGENCE — WORKSPACE REPOSITORY
 * =========================================================
 *
 * The ONLY place workspace records are read from or written
 * to PostgreSQL. UI components and route handlers never issue
 * queries directly.
 *
 * Scope is deliberately limited to records the existing
 * interface already uses: businesses, contacts, deals,
 * projects, tasks (create + list) and activities (list).
 *
 * There are no destructive operations here: no delete, no
 * update, no schema change. Import only ever inserts into an
 * EMPTY table, so existing rows can never be overwritten.
 * =========================================================
 */

interface BusinessRow {
  id: string;
  name: string;
  category: string;
  status: string;
  description: string | null;
}

interface ContactRow {
  id: string;
  name: string;
  organization: string;
  role: string;
  lastContact: string;
  nextAction: string;
  email: string | null;
  phone: string | null;
}

interface DealRow {
  id: string;
  name: string;
  counterparty: string;
  value: string;
  stage: string;
  probability: number;
  health: string;
  nextAction: string;
  risk: string;
  business?: { name: string } | null;
}

interface ProjectRow {
  id: string;
  name: string;
  status: string;
  progress: number;
  health: string;
  blocker: string;
  business?: { name: string } | null;
}

interface TaskRow {
  id: string;
  title: string;
  status: string;
  priority: string;
  due: string;
}

interface ActivityRow {
  id: string;
  title: string;
  detail: string;
  time: string;
  type: string;
}

/* ------------------------------------------------------------------ */
/* Pure mapping — exported so it can be tested without a database.     */
/* ------------------------------------------------------------------ */

export function toBusiness(row: BusinessRow): Business {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    status: row.status as RecordStatus,
    ...(row.description ? { description: row.description } : {}),
  };
}

export function toContact(row: ContactRow): Contact {
  return {
    id: row.id,
    name: row.name,
    organization: row.organization,
    role: row.role,
    lastContact: row.lastContact,
    nextAction: row.nextAction,
    ...(row.email ? { email: row.email } : {}),
    ...(row.phone ? { phone: row.phone } : {}),
  };
}

export function toDeal(row: DealRow): Deal {
  return {
    id: row.id,
    name: row.name,
    business: row.business?.name ?? 'Unassigned',
    counterparty: row.counterparty,
    value: row.value,
    stage: row.stage,
    probability: row.probability,
    health: row.health as Health,
    nextAction: row.nextAction,
    risk: row.risk,
  };
}

export function toProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    business: row.business?.name ?? 'Unassigned',
    status: row.status,
    progress: row.progress,
    health: row.health as Health,
    blocker: row.blocker,
  };
}

export function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    status: row.status as Task['status'],
    priority: row.priority as Task['priority'],
    due: row.due,
  };
}

export function toActivity(row: ActivityRow): Activity {
  return {
    id: row.id,
    title: row.title,
    detail: row.detail,
    time: row.time,
    type: row.type as Activity['type'],
  };
}

/* ------------------------------------------------------------------ */
/* Reads                                                               */
/* ------------------------------------------------------------------ */

const DEAL_INCLUDE = { business: { select: { name: true } } } as const;
const PROJECT_INCLUDE = { business: { select: { name: true } } } as const;

export async function getWorkspaceSnapshot(): Promise<WorkspaceSnapshot> {
  const prisma = getPrisma();

  const [businesses, contacts, deals, projects, tasks, activities] =
    await Promise.all([
      prisma.business.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.contact.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.deal.findMany({
        orderBy: { createdAt: 'asc' },
        include: DEAL_INCLUDE,
      }),
      prisma.project.findMany({
        orderBy: { createdAt: 'asc' },
        include: PROJECT_INCLUDE,
      }),
      prisma.task.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.activity.findMany({ orderBy: { createdAt: 'asc' } }),
    ]);

  return {
    businesses: businesses.map(toBusiness),
    contacts: contacts.map(toContact),
    deals: deals.map(toDeal),
    projects: projects.map(toProject),
    tasks: tasks.map(toTask),
    activities: activities.map(toActivity),
  };
}

export async function getWorkspaceCounts(): Promise<WorkspaceCounts> {
  const prisma = getPrisma();

  const [businesses, contacts, deals, projects, tasks, activities] =
    await Promise.all([
      prisma.business.count(),
      prisma.contact.count(),
      prisma.deal.count(),
      prisma.project.count(),
      prisma.task.count(),
      prisma.activity.count(),
    ]);

  return {
    businesses,
    contacts,
    deals,
    projects,
    tasks,
    activities,
    total:
      businesses +
      contacts +
      deals +
      projects +
      tasks +
      activities,
  };
}

export async function getSignalCount(): Promise<number> {
  return getPrisma().intelligenceSignal.count();
}

/* ------------------------------------------------------------------ */
/* Writes — create only                                                */
/* ------------------------------------------------------------------ */

export type CreatedWorkspaceRecord =
  | { type: 'businesses'; record: Business }
  | { type: 'contacts'; record: Contact }
  | { type: 'deals'; record: Deal }
  | { type: 'projects'; record: Project }
  | { type: 'tasks'; record: Task };

export async function createWorkspaceRecord(
  input: WorkspaceCreateInput,
): Promise<CreatedWorkspaceRecord> {
  const prisma = getPrisma();

  switch (input.type) {
    case 'tasks': {
      const row = await prisma.task.create({
        data: {
          title: input.title,
          status: 'Open',
          priority: 'normal',
          due: 'Unscheduled',
        },
      });

      return { type: 'tasks', record: toTask(row) };
    }

    case 'businesses': {
      const row = await prisma.business.create({
        data: {
          name: input.title,
          category: input.detail || 'Unclassified',
          status: 'Planned',
          description: input.detail || null,
        },
      });

      return { type: 'businesses', record: toBusiness(row) };
    }

    case 'contacts': {
      const row = await prisma.contact.create({
        data: {
          name: input.title,
          organization: input.detail || 'Unknown organization',
          role: 'Unassigned',
          lastContact: 'Never',
          nextAction: 'Define next action',
        },
      });

      return { type: 'contacts', record: toContact(row) };
    }

    case 'projects': {
      const row = await prisma.project.create({
        data: {
          name: input.title,
          status: 'Planned',
          progress: 0,
          health: 'Watch',
          blocker: input.detail || 'Define scope',
        },
      });

      return { type: 'projects', record: toProject(row) };
    }

    case 'deals': {
      const row = await prisma.deal.create({
        data: {
          name: input.title,
          counterparty: input.detail || 'Unassigned',
          value: 'TBD',
          stage: 'Qualification',
          probability: 10,
          health: 'Watch',
          nextAction: 'Qualify opportunity',
          risk: 'Information incomplete',
        },
      });

      return { type: 'deals', record: toDeal(row) };
    }
  }
}

/* ------------------------------------------------------------------ */
/* One-time legacy import                                              */
/* ------------------------------------------------------------------ */

function str(
  value: unknown,
  fallback: string,
  maxLength = 300,
): string {
  return typeof value === 'string' && value.trim()
    ? value.trim().slice(0, maxLength)
    : fallback;
}

function optionalStr(
  value: unknown,
  maxLength = 300,
): string | null {
  return typeof value === 'string' && value.trim()
    ? value.trim().slice(0, maxLength)
    : null;
}

function int(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.trunc(value)
    : fallback;
}

function optionalId(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim()
    ? value.trim().slice(0, 100)
    : undefined;
}

const IMPORT_KEYS: LegacyCollectionKey[] = [
  'businesses',
  'contacts',
  'deals',
  'projects',
  'tasks',
  'activities',
];

/**
 * Imports a browser-storage snapshot into tables that are
 * currently EMPTY.
 *
 * - A table with any existing row is skipped entirely and
 *   reported, never merged or overwritten.
 * - Everything runs in one transaction, so a failure leaves
 *   the database untouched.
 * - Existing ids are preserved where present.
 * - Nothing is deleted: the browser snapshot is left intact
 *   by the caller.
 */
export async function importLegacyWorkspace(
  collections: LegacyCollections,
): Promise<ImportSummary> {
  const prisma = getPrisma();

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const imported: Record<string, number> = {
      businesses: 0,
      contacts: 0,
      deals: 0,
      projects: 0,
      tasks: 0,
      activities: 0,
    };
    const skipped: Record<string, string> = {};

    const before = {
      businesses: await tx.business.count(),
      contacts: await tx.contact.count(),
      deals: await tx.deal.count(),
      projects: await tx.project.count(),
      tasks: await tx.task.count(),
      activities: await tx.activity.count(),
    };

    for (const key of IMPORT_KEYS) {
      if (before[key] > 0 && collections[key].length > 0) {
        skipped[key] =
          'Table already contains records; import skipped to avoid overwriting existing data.';
      }
    }

    if (
      collections.businesses.length > 0 &&
      before.businesses === 0
    ) {
      await tx.business.createMany({
        skipDuplicates: true,
        data: collections.businesses.map((item) => ({
          ...(optionalId(item.id) ? { id: optionalId(item.id)! } : {}),
          name: str(item.name, 'Untitled business'),
          category: str(item.category, 'Unclassified'),
          status: str(item.status, 'Planned'),
          description: optionalStr(item.description, 2000),
        })),
      });
    }

    if (
      collections.contacts.length > 0 &&
      before.contacts === 0
    ) {
      await tx.contact.createMany({
        skipDuplicates: true,
        data: collections.contacts.map((item) => ({
          ...(optionalId(item.id) ? { id: optionalId(item.id)! } : {}),
          name: str(item.name, 'Unnamed contact'),
          organization: str(item.organization, 'Unknown organization'),
          role: str(item.role, 'Unassigned'),
          lastContact: str(item.lastContact, 'Never'),
          nextAction: str(item.nextAction, 'Define next action'),
          email: optionalStr(item.email),
          phone: optionalStr(item.phone),
        })),
      });
    }

    if (
      collections.projects.length > 0 &&
      before.projects === 0
    ) {
      await tx.project.createMany({
        skipDuplicates: true,
        data: collections.projects.map((item) => ({
          ...(optionalId(item.id) ? { id: optionalId(item.id)! } : {}),
          name: str(item.name, 'Untitled project'),
          status: str(item.status, 'Planned'),
          progress: int(item.progress, 0),
          health: str(item.health, 'Watch'),
          blocker: str(item.blocker, 'Define scope'),
        })),
      });
    }

    if (
      collections.tasks.length > 0 &&
      before.tasks === 0
    ) {
      await tx.task.createMany({
        skipDuplicates: true,
        data: collections.tasks.map((item) => ({
          ...(optionalId(item.id) ? { id: optionalId(item.id)! } : {}),
          title: str(item.title, 'Untitled task'),
          status: str(item.status, 'Open'),
          priority: str(item.priority, 'normal'),
          due: str(item.due, 'Unscheduled'),
        })),
      });
    }

    if (
      collections.deals.length > 0 &&
      before.deals === 0
    ) {
      const businessesByName = new Map(
        (
          await tx.business.findMany({
            select: { id: true, name: true },
          })
        ).map((business) => [business.name, business.id]),
      );

      await tx.deal.createMany({
        skipDuplicates: true,
        data: collections.deals.map((item) => ({
          ...(optionalId(item.id) ? { id: optionalId(item.id)! } : {}),
          name: str(item.name, 'Untitled deal'),
          counterparty: str(item.counterparty, 'Unassigned'),
          value: str(item.value, 'TBD'),
          stage: str(item.stage, 'Qualification'),
          probability: int(item.probability, 10),
          health: str(item.health, 'Watch'),
          nextAction: str(item.nextAction, 'Qualify opportunity'),
          risk: str(item.risk, 'Information incomplete'),
          businessId: businessesByName.get(str(item.business, '')) ?? null,
        })),
      });
    }

    if (
      collections.activities.length > 0 &&
      before.activities === 0
    ) {
      await tx.activity.createMany({
        skipDuplicates: true,
        data: collections.activities.map((item) => ({
          ...(optionalId(item.id) ? { id: optionalId(item.id)! } : {}),
          title: str(item.title, 'Untitled activity'),
          detail: str(item.detail, '', 2000),
          time: str(item.time, 'Unknown'),
          type: str(item.type, 'System'),
        })),
      });
    }

    const after = {
      businesses: await tx.business.count(),
      contacts: await tx.contact.count(),
      deals: await tx.deal.count(),
      projects: await tx.project.count(),
      tasks: await tx.task.count(),
      activities: await tx.activity.count(),
    };

    for (const key of IMPORT_KEYS) {
      imported[key] = Math.max(0, after[key] - before[key]);
    }

    return { imported, skipped };
  });
}
