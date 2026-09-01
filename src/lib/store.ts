import type { Business, Contact, Deal, Priority, Project, Activity, Task } from '@/types/domain';
import { businesses as seedBusinesses, contacts as seedContacts, deals as seedDeals, priorities as seedPriorities, projects as seedProjects, activities as seedActivities, tasks as seedTasks } from '@/lib/demo-data';

export interface KaydaState {
  businesses: Business[];
  contacts: Contact[];
  deals: Deal[];
  priorities: Priority[];
  projects: Project[];
  activities: Activity[];
  tasks: Task[];
}

const KEY = 'kayda-intelligence-state-v12';

// Browser-only persistence. The UI waits for hydration before calling saveState,
// so the initial demo state can never overwrite an existing workspace snapshot.

export const initialState: KaydaState = {
  businesses: seedBusinesses,
  contacts: seedContacts,
  deals: seedDeals,
  priorities: seedPriorities,
  projects: seedProjects,
  activities: seedActivities,
  tasks: seedTasks,
};

export function loadState(): KaydaState {
  if (typeof window === 'undefined') return initialState;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw) as Partial<KaydaState>;
    return {
      businesses: parsed.businesses ?? seedBusinesses,
      contacts: parsed.contacts ?? seedContacts,
      deals: parsed.deals ?? seedDeals,
      priorities: parsed.priorities ?? seedPriorities,
      projects: parsed.projects ?? seedProjects,
      activities: parsed.activities ?? seedActivities,
      tasks: parsed.tasks ?? seedTasks,
    };
  } catch {
    return initialState;
  }
}

export function saveState(state: KaydaState) {
  if (typeof window !== 'undefined') window.localStorage.setItem(KEY, JSON.stringify(state));
}

export function resetState() {
  if (typeof window !== 'undefined') window.localStorage.removeItem(KEY);
}

export function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
