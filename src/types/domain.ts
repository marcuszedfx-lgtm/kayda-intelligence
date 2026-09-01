export type Health = 'On track' | 'Attention' | 'Watch' | 'Blocked';
export type PriorityTone = 'urgent' | 'attention' | 'normal';
export type RecordStatus = 'Active' | 'Building' | 'Planned' | 'Archived';

export interface Business { id: string; name: string; category: string; status: RecordStatus; description?: string; }
export interface Contact { id: string; name: string; organization: string; role: string; lastContact: string; nextAction: string; email?: string; phone?: string; }
export interface Deal { id: string; name: string; business: string; counterparty: string; value: string; stage: string; probability: number; health: Health; nextAction: string; risk: string; }
export interface Project { id: string; name: string; business: string; status: string; progress: number; health: Health; blocker: string; }
export interface Priority { id: string; title: string; meta: string; due: string; tone: PriorityTone; relatedType: 'Deal' | 'Project' | 'Contact' | 'Task'; relatedId: string; }
export interface Activity { id: string; title: string; detail: string; time: string; type: 'Deal' | 'Contact' | 'Project' | 'System' | 'Task'; }
export interface Task { id: string; title: string; status: 'Open' | 'In progress' | 'Done'; priority: PriorityTone; due: string; relatedType?: 'Deal' | 'Project' | 'Contact'; relatedId?: string; }
