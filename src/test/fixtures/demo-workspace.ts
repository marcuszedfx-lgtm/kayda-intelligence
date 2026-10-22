import type { Business, Contact, Deal, Priority, Project, Activity, Task } from '@/types/domain';

export const businesses: Business[] = [
  { id: 'kayda-group', name: 'Kayda Group', category: 'Parent / Advisory', status: 'Active', description: 'Parent operating layer for commercial, property and systems activities.' },
  { id: 'kayda-value', name: 'Kayda Value Solutions', category: 'Commercial / P2P', status: 'Building', description: 'Commercial USD-to-USDT conversion operation.' },
  { id: 'urbankey', name: 'UrbanKey Property Solutions', category: 'Property Facilitation', status: 'Active', description: 'Property sourcing, structuring and transaction facilitation.' },
  { id: 'spillway', name: 'Spillway Operations OS', category: 'Automotive Services', status: 'Active', description: 'Automotive services operations and business management system.' },
  { id: 'zed-intelligence', name: 'Zed Intelligence', category: 'Technology / Trading', status: 'Building', description: 'AI-powered trading and intelligence systems.' },
];

export const priorities: Priority[] = [
  { id: 'p1', title: 'Confirm VHP sugar quotation', meta: 'Supplier · Zambia Sugar', due: 'Due today', tone: 'urgent', relatedType: 'Deal', relatedId: 'sugar' },
  { id: 'p2', title: 'Review Ibex Hill property proposal', meta: 'Property · UrbanKey', due: 'Due 14:30', tone: 'attention', relatedType: 'Deal', relatedId: 'plot-b9' },
  { id: 'p3', title: 'Approve buyer response draft', meta: 'Deal · Commodity Desk', due: 'Due tomorrow', tone: 'normal', relatedType: 'Deal', relatedId: 'sugar' },
];

export const deals: Deal[] = [
  { id: 'sugar', name: 'VHP Sugar Supply', business: 'Kayda Group', counterparty: 'Zambia Sugar', value: '$750,000', stage: 'Quotation', probability: 72, health: 'On track', nextAction: 'Confirm quotation and availability', risk: 'Pricing uncertainty' },
  { id: 'plot-b9', name: 'Ibex Meanwood Plot B9', business: 'UrbanKey Property Solutions', counterparty: 'Private Buyer', value: 'ZMW 16.0M', stage: 'Negotiation', probability: 61, health: 'Attention', nextAction: 'Review offer terms', risk: 'Payment structure' },
  { id: 'lower-zambezi', name: 'Lower Zambezi Land', business: 'UrbanKey Property Solutions', counterparty: 'Investor Group', value: '$450,000', stage: 'Due diligence', probability: 48, health: 'Watch', nextAction: 'Close information gaps', risk: 'Due-diligence completeness' },
];

export const contacts: Contact[] = [
  { id: 'ngosa', name: 'Ngosa Chibale', organization: 'Zambia Sugar', role: 'Export & Sales', lastContact: '2 days ago', nextAction: 'Confirm VHP quotation' },
  { id: 'raymond', name: 'Raymond Mwanza', organization: 'Rayema', role: 'Property / Transaction', lastContact: 'Yesterday', nextAction: 'Review Plot B9 transaction' },
  { id: 'buyer', name: 'Buyer representative', organization: 'Private buyer', role: 'Acquisition', lastContact: '3 days ago', nextAction: 'Approve offer response' },
];

export const projects: Project[] = [
  { id: 'kayda-intelligence', name: 'Kayda Intelligence', business: 'Kayda Group', status: 'Building', progress: 42, health: 'On track', blocker: 'Database architecture' },
  { id: 'spillway-os', name: 'Spillway Operations OS', business: 'Spillway Operations OS', status: 'Operational', progress: 82, health: 'On track', blocker: 'None' },
  { id: 'zed-intelligence', name: 'Zed Intelligence Trading Office', business: 'Zed Intelligence', status: 'Design', progress: 21, health: 'Watch', blocker: 'Data architecture' },
];

export const activities: Activity[] = [
  { id: 'a1', title: 'VHP quotation follow-up', detail: 'Waiting on supplier confirmation', time: 'Today · 09:20', type: 'Deal' },
  { id: 'a2', title: 'Plot B9 proposal updated', detail: 'Buyer terms require review', time: 'Yesterday · 16:40', type: 'Deal' },
  { id: 'a3', title: 'Kayda Intelligence architecture', detail: 'V1.2 foundation in progress', time: 'Today · 08:10', type: 'Project' },
];

export const tasks: Task[] = [
  { id: 't1', title: 'Confirm VHP quotation and availability', status: 'Open', priority: 'urgent', due: 'Today', relatedType: 'Deal', relatedId: 'sugar' },
  { id: 't2', title: 'Review Plot B9 offer terms', status: 'In progress', priority: 'attention', due: 'Today 14:30', relatedType: 'Deal', relatedId: 'plot-b9' },
  { id: 't3', title: 'Approve buyer response draft', status: 'Open', priority: 'normal', due: 'Tomorrow', relatedType: 'Deal', relatedId: 'sugar' },
  { id: 't4', title: 'Define Kayda Intelligence database model', status: 'In progress', priority: 'attention', due: 'This week', relatedType: 'Project', relatedId: 'kayda-intelligence' },
];
