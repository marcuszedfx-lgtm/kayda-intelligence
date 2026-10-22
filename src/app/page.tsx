'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight, Bell, BriefcaseBusiness, CalendarDays, CheckCircle2, ChevronRight,
  Command, FileText, Gauge, LayoutDashboard, Menu, MessageSquareText, MoreHorizontal,
  Network, Plus, Search, Settings, Sparkles, Target, Users, WalletCards, X, Zap
} from 'lucide-react';
import { getAgentStatusResponse, type AgentResponse } from '@/lib/command-agent';
import {
  createWorkspaceRecord as persistWorkspaceRecord,
  fetchWorkspace,
  importLegacyWorkspace,
  initialState,
  legacyRecordCount,
  readLegacyState,
  WorkspaceAuthError,
  type KaydaState,
} from '@/lib/store';
import type { WorkspaceRecordType } from '@/lib/workspace/types';
import type { Business, Contact, Deal, Project, Task } from '@/types/domain';

const nav = [
  ['Command Center', LayoutDashboard], ['Today', CalendarDays], ['Inbox', MessageSquareText],
  ['Tasks', Target], ['Deals', BriefcaseBusiness], ['Businesses', Network], ['Contacts', Users],
  ['Projects', Gauge], ['Research', Search], ['Documents', FileText], ['Finance', WalletCards],
  ['Communications', MessageSquareText], ['AI Workforce', Sparkles], ['Intelligence', Zap], ['Learning', FileText], ['Knowledge', Network],
] as const;

const RECORD_TYPE_BY_VIEW: Record<string, WorkspaceRecordType | undefined> = {
  Tasks: 'tasks',
  Deals: 'deals',
  Businesses: 'businesses',
  Contacts: 'contacts',
  Projects: 'projects',
};

function Badge({ children, tone='neutral' }: { children: React.ReactNode; tone?: string }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
function PanelHead({ title, action='View all', onAction }: { title: string; action?: string; onAction?: () => void }) {
  return <div className="panel-head"><h2>{title}</h2><button onClick={onAction}>{action} <ArrowUpRight size={13}/></button></div>;
}
function healthTone(value: string) { return value === 'On track' ? 'good' : value === 'Attention' ? 'attention' : 'watch'; }

function DealDrawer({ deal, onClose }: { deal: Deal; onClose: () => void }) {
  return <div className="detail-drawer">
    <div className="drawer-head"><div><span className="eyebrow">DEAL WORKSPACE</span><h2>{deal.name}</h2><span className="drawer-sub">{deal.business} · {deal.counterparty}</span></div><button onClick={onClose}><X size={18}/></button></div>
    <div className="drawer-status"><Badge tone={healthTone(deal.health)}>{deal.health}</Badge><span>{deal.stage}</span><strong>{deal.probability}% probability</strong></div>
    <div className="deal-value"><span>COMMERCIAL VALUE</span><strong>{deal.value}</strong></div>
    <div className="detail-grid"><div><span>NEXT ACTION</span><strong>{deal.nextAction}</strong></div><div><span>RISK</span><strong>{deal.risk}</strong></div></div>
    <div className="drawer-section"><span className="eyebrow">OPERATING TIMELINE</span><div className="timeline"><div><i/><strong>Deal record opened</strong><span>Commercial opportunity identified</span></div><div><i/><strong>Current stage · {deal.stage}</strong><span>Requires active operator attention</span></div><div><i className="pending"/><strong>Next action</strong><span>{deal.nextAction}</span></div></div></div>
    <div className="drawer-section"><span className="eyebrow">COMMAND AGENT</span><p className="drawer-note">The next agent layer will inspect related contacts, documents, communications, financial records and risks before recommending a move.</p><button className="primary-action"><Sparkles size={14}/> Prepare next action</button></div>
  </div>;
}

function RecordTable({ active, state, onDeal, onCreate }: { active: string; state: KaydaState; onDeal: (d: Deal) => void; onCreate: () => void }) {
  const rows = useMemo(() => {
    if (active === 'Businesses') return state.businesses.map(b => ({ id:b.id, title:b.name, sub:b.category, meta:b.status, badge:b.status }));
    if (active === 'Contacts') return state.contacts.map(c => ({ id:c.id, title:c.name, sub:`${c.organization} · ${c.role}`, meta:c.nextAction, badge:c.lastContact }));
    if (active === 'Deals') return state.deals.map(d => ({ id:d.id, title:d.name, sub:`${d.business} · ${d.counterparty}`, meta:`${d.value} · ${d.stage}`, badge:`${d.probability}%` }));
    if (active === 'Projects') return state.projects.map(p => ({ id:p.id, title:p.name, sub:`${p.business} · ${p.status}`, meta:p.blocker, badge:`${p.progress}%` }));
    return state.tasks.map(t => ({ id:t.id, title:t.title, sub:`${t.priority} priority · ${t.due}`, meta:t.status, badge:t.status }));
  }, [active, state]);

  const label = active === 'Tasks' ? 'TASK REGISTER' : `${active.toUpperCase()} REGISTER`;
  return <>
    <section className="record-hero"><div><span className="eyebrow">{label}</span><h1>{active}</h1><p>Persistent workspace records for the Kayda operating system.</p></div><button className="quiet-action" onClick={onCreate}><Plus size={15}/> New {active === 'Tasks' ? 'task' : 'record'}</button></section>
    <section className="record-summary"><div><span className="eyebrow">RECORDS</span><strong>{rows.length}</strong></div><div><span className="eyebrow">STORAGE</span><strong>PostgreSQL</strong></div><div><span className="eyebrow">SYNC</span><strong>Automatic</strong></div><div><span className="eyebrow">SOURCE</span><strong>Kayda OS</strong></div></section>
    <section className="panel record-panel"><div className="record-header"><span>RECORD</span><span>DETAIL</span><span>STATUS</span><span/></div>{rows.length===0&&<div className="empty-state"><h3>No {active.toLowerCase()} records yet</h3><p>Records you create are validated on the server and stored in PostgreSQL. Nothing is pre-filled and nothing is simulated.</p></div>}{rows.map(r => <button key={r.id} className="record-row" onClick={()=>active==='Deals'&&onDeal(state.deals.find(d=>d.id===r.id)!)}><div className="record-title"><div className="record-symbol">{active==='Businesses'?<Network size={14}/>:active==='Contacts'?<Users size={14}/>:active==='Deals'?<BriefcaseBusiness size={14}/>:active==='Projects'?<Gauge size={14}/>:<Target size={14}/>}</div><div><strong>{r.title}</strong><span>{r.sub}</span></div></div><span>{r.meta}</span><Badge tone={active==='Deals' ? 'good' : 'neutral'}>{r.badge}</Badge><ChevronRight size={15}/></button>)}</section>
  </>;
}

function CreateModal({ type, onClose, onSave, saving, error }: { type: string; onClose: () => void; onSave: (payload: Record<string,string>) => void; saving: boolean; error: string | null }) {
  const [title,setTitle] = useState(''); const [detail,setDetail] = useState('');
  const submit=(e:FormEvent)=>{e.preventDefault(); if(title.trim() && !saving) onSave({title:title.trim(),detail:detail.trim()});};
  return <div className="modal-scrim"><form className="create-modal" onSubmit={submit}><div className="drawer-head"><div><span className="eyebrow">NEW RECORD</span><h2>Create {type === 'Tasks' ? 'task' : type.toLowerCase().replace(/s$/,'')}</h2></div><button type="button" onClick={onClose}><X size={18}/></button></div><label>Name / title<input autoFocus value={title} onChange={e=>setTitle(e.target.value)} placeholder={`Enter ${type === 'Tasks' ? 'task' : 'record'} name`}/></label><label>Context / next action<textarea value={detail} onChange={e=>setDetail(e.target.value)} placeholder="Add the information that will help Kayda reason about this record…"/></label>{error&&<p className="form-error">{error}</p>}<div className="modal-actions"><button type="button" className="secondary-action" onClick={onClose}>Cancel</button><button className="primary-action" type="submit" disabled={saving}><Plus size={14}/> {saving ? 'Saving…' : 'Create record'}</button></div></form></div>;
}

export default function Home() {
  const [active,setActive] = useState('Command Center');
  const [state,setState] = useState<KaydaState>(initialState);
  const [storageStatus,setStorageStatus] = useState<'connecting'|'postgres'|'unavailable'>('connecting');
  const [loadError,setLoadError] = useState<string|null>(null);
  const [notice,setNotice] = useState<string|null>(null);
  const [legacyPendingCount,setLegacyPendingCount] = useState(0);
  const [saveError,setSaveError] = useState<string|null>(null);
  const [saving,setSaving] = useState(false);
  const [command,setCommand] = useState(''); const [query,setQuery] = useState('');
  const [mobileNav,setMobileNav] = useState(false); const [aiOpen,setAiOpen] = useState(false);
  const [selectedDeal,setSelectedDeal] = useState<Deal|null>(null); const [createOpen,setCreateOpen] = useState(false);
  const [agentResponse,setAgentResponse] = useState<AgentResponse>(()=>getAgentStatusResponse(''));

  // Built from formatToParts rather than the formatted string:
  // Node and Chromium disagree on whether en-GB inserts a comma
  // ("Wednesday, 21 October 2026" vs "Wednesday 21 October 2026"),
  // and that difference broke hydration in production.
  const todayLabel = useMemo(() => {
    const parts = new Intl.DateTimeFormat('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).formatToParts(new Date());

    const part = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((item) => item.type === type)?.value ?? '';

    return `${part('weekday')} · ${part('day')} ${part('month')} ${part(
      'year',
    )}`.toUpperCase();
  }, []);

  // Records come from PostgreSQL. A retired browser snapshot is only counted
  // here, never imported automatically: importing writes to the database and
  // must be an explicit operator action. The snapshot is never deleted.
  useEffect(()=>{
    let cancelled = false;

    (async ()=>{
      try {
        const data = await fetchWorkspace();

        if (cancelled) return;

        setState({ ...data.state, priorities: [] });
        setStorageStatus('postgres');
        setLoadError(null);

        const legacy = readLegacyState();
        const legacyCount = legacy ? legacyRecordCount(legacy) : 0;

        if (legacyCount > 0) {
          setLegacyPendingCount(legacyCount);
        }
      } catch (error) {
        if (cancelled) return;

        if (error instanceof WorkspaceAuthError) {
          window.location.assign('/login');
          return;
        }

        setStorageStatus('unavailable');
        setLoadError(
          error instanceof Error
            ? error.message
            : 'Workspace records could not be loaded from the database.',
        );
      }
    })();

    return ()=>{ cancelled = true; };
  },[]);

  useEffect(()=>{
    if (createOpen) setSaveError(null);
  },[createOpen]);

  const storageLabel =
    storageStatus === 'postgres'
      ? 'PostgreSQL · 5433'
      : storageStatus === 'unavailable'
        ? 'Storage unavailable'
        : 'Connecting…';

  const visibleDeals = useMemo(() => state.deals.filter(d => `${d.name} ${d.counterparty} ${d.stage} ${d.business}`.toLowerCase().includes(query.toLowerCase())), [query,state.deals]);
  const visibleTasks = useMemo(()=>state.tasks.filter(t=>`${t.title} ${t.status} ${t.priority}`.toLowerCase().includes(query.toLowerCase())),[query,state.tasks]);

  function runCommand(value=command){const text=value.trim()||'What should I focus on today?';setCommand(text);setAgentResponse(getAgentStatusResponse(text));setAiOpen(true);}
  async function createRecord(payload:Record<string,string>){
    const type = RECORD_TYPE_BY_VIEW[active];

    if (!type) return;

    setSaving(true);
    setSaveError(null);

    try {
      await persistWorkspaceRecord(type, payload.title, payload.detail);
      const data = await fetchWorkspace();

      setState({ ...data.state, priorities: [] });
      setStorageStatus('postgres');
      setCreateOpen(false);
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : 'The record could not be saved to the database.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function importLegacyRecords(){
    const legacy = readLegacyState();

    if (!legacy) {
      setLegacyPendingCount(0);
      return;
    }

    setSaving(true);
    setNotice(null);

    try {
      const summary = await importLegacyWorkspace(legacy);
      const imported = Object.values(summary.imported).reduce((sum, value) => sum + value, 0);
      const skipped = Object.keys(summary.skipped);
      const data = await fetchWorkspace();

      setState({ ...data.state, priorities: [] });
      setLegacyPendingCount(0);
      setNotice(
        imported > 0
          ? `Imported ${imported} record${imported === 1 ? '' : 's'} into PostgreSQL. Existing database records were not modified and the browser copy was left in place.${skipped.length ? ` Skipped: ${skipped.join(', ')}.` : ''}`
          : `Nothing was imported: the database already holds records for ${skipped.join(', ') || 'these collections'}. Nothing was overwritten.`,
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : 'Browser records could not be imported.',
      );
    } finally {
      setSaving(false);
    }
  }

  const showRecords=['Tasks','Deals','Businesses','Contacts','Projects'].includes(active);
  const showIntelligence = active === 'Intelligence';
  const showLearning = active === 'Learning';


  return <main className="shell">
    <aside className={`sidebar ${mobileNav?'mobile-open':''}`}>
      <div className="brand"><div className="brand-mark"><Command size={17}/></div><div><strong>KAYDA</strong><span>INTELLIGENCE</span></div><button className="close-mobile" onClick={()=>setMobileNav(false)}><X size={18}/></button></div>
      <div className="workspace"><span className="eyebrow">PRIVATE WORKSPACE</span><strong>Executive Desk</strong><span className="workspace-status"><i/> {storageLabel}</span></div>
      <nav>{nav.map(([label,Icon])=><button key={label} className={active===label?'nav-item active':'nav-item'} onClick={()=>{setActive(label);setMobileNav(false)}}><Icon size={16}/><span>{label}</span></button>)}</nav>
      <div className="sidebar-bottom"><button className="nav-item"><Settings size={16}/><span>Settings</span></button><div className="operator"><div className="avatar">OP</div><div><strong>Operator</strong><span>{storageLabel}</span></div><MoreHorizontal size={16}/></div></div>
    </aside>
    {mobileNav&&<div className="scrim" onClick={()=>setMobileNav(false)}/>} 
    <section className="content">
      <header className="topbar"><div className="mobile-menu"><button onClick={()=>setMobileNav(true)}><Menu size={20}/></button></div><div className="crumb"><span>Workspace</span><ChevronRight size={13}/><strong>{active}</strong></div><div className="top-actions"><label className="global-search"><Search size={15}/><input placeholder="Search anything…" value={query} onChange={e=>setQuery(e.target.value)}/><kbd>⌘ K</kbd></label><button className="icon-btn"><Bell size={17}/></button><button className="operator-mini">OP</button></div></header>
      <div className="page">
        {loadError&&<div className="notice error"><strong>Database unavailable</strong><span>{loadError}</span></div>}
        {legacyPendingCount>0&&<div className="notice"><strong>{legacyPendingCount} record{legacyPendingCount===1?'':'s'} found in this browser</strong><span>They predate PostgreSQL persistence. Importing fills only empty tables and never overwrites database records; the browser copy is kept either way.</span><button className="quiet-action" disabled={saving} onClick={importLegacyRecords}><ArrowUpRight size={14}/> Import into PostgreSQL</button></div>}
        {notice&&<div className="notice"><span>{notice}</span></div>}
        {showIntelligence ? <>
          <section className="record-hero">
            <div>
              <span className="eyebrow">BUSINESS INTELLIGENCE</span>
              <h1>Intelligence</h1>
              <p>Signals detected across your commercial, market and operating environment.</p>
            </div>
          </section>

          <section className="panel intelligence-panel">
            <div className="panel-head">
              <h2>Priority signals</h2>
            </div>
            <div className="empty-state">
              <h3>No intelligence signals yet</h3>
              <p>Kayda has not produced any intelligence signals. Signals appear here only after a real intelligence run retrieves evidence and analyses it — this screen never shows sample or simulated findings.</p>
              <p>To produce your first signals: configure at least one source in <code>data/kayda-registry.json</code>, confirm provider and database status at <code>/api/status</code>, then run <code>GET /api/intelligence</code>.</p>
            </div>
          </section>

          <section className="panel source-monitor">
            <div className="panel-head">
              <h2>Intelligence source monitor</h2>
            </div>
            <div className="empty-state">
              <h3>No sources configured</h3>
              <p>Kayda monitors no sources by default. Add the sites, feeds, and APIs you want watched to <code>data/kayda-registry.json</code> (see <code>config/intelligence-registry.example.json</code> for the format). No organisation is monitored until you choose one.</p>
            </div>
          </section>

        </> : showLearning ? <>
          <section className="record-hero">
            <div>
              <span className="eyebrow">KAYDA LEARNING ENGINE</span>
              <h1>Learning</h1>
              <p>Build the skills that directly improve the decisions Kayda helps you make.</p>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>Learning topics</h2>
            </div>
            <div className="empty-state">
              <h3>No learning topics yet</h3>
              <p>Learning topics and resources are derived from real intelligence signals. None have been generated, so this screen is intentionally empty rather than filled with sample courses.</p>
            </div>
          </section>
        </> : showRecords ? <RecordTable active={active} state={state} onDeal={setSelectedDeal} onCreate={()=>setCreateOpen(true)}/> : active==='Today' ? <>
          <section className="record-hero"><div><span className="eyebrow">DAILY OPERATING QUEUE</span><h1>Today</h1><p>Tasks and commitments that should move before the day closes.</p></div><button className="quiet-action" onClick={()=>{setActive('Tasks');setCreateOpen(true)}}><Plus size={15}/> New task</button></section>
          <section className="panel record-panel"><div className="panel-head"><h2>Open tasks</h2><button onClick={()=>setActive('Tasks')}>Task register <ArrowUpRight size={13}/></button></div>{visibleTasks.filter(t=>t.status!=='Done').map(t=><div className="priority" key={t.id}><div className={`priority-marker ${t.priority}`}>!</div><div className="priority-copy"><strong>{t.title}</strong><span>{t.status} · {t.due}</span></div><Badge tone={t.priority}>{t.priority}</Badge></div>)}</section>
        </> : <>
          <section className="hero-row"><div><span className="eyebrow">{todayLabel}</span><h1>Command Center</h1><p>The operating picture that matters now.</p></div><button className="quiet-action" onClick={()=>setActive('Tasks')}><Plus size={15}/> New item</button></section>
          <section className="command-panel"><div className="command-icon"><Sparkles size={18}/></div><div className="command-main"><span className="eyebrow">COMMAND AGENT · FOUNDATION MODE</span><input value={command} onChange={e=>setCommand(e.target.value)} onKeyDown={e=>e.key==='Enter'&&runCommand()} placeholder="What do you need to accomplish?"/><div className="command-hints"><button onClick={()=>runCommand('What should I focus on today?')}>Focus today</button><button onClick={()=>runCommand('Show me active deals')}>Active deals</button><button onClick={()=>runCommand('Who am I waiting for?')}>Waiting on</button></div></div><button className="run" onClick={()=>runCommand()}><Zap size={16}/><span>Run</span></button></section>
          <div className="signal-strip"><div><span className="signal-dot good"/><strong>Operating normally</strong><span> · {state.tasks.filter(t=>t.status!=='Done').length} open tasks</span></div><div className="strip-right"><span>Persistence</span><strong>{storageLabel}</strong><ArrowUpRight size={14}/></div></div>
          <div className="executive-strip"><div><span className="eyebrow">BUSINESS PORTFOLIO</span><strong>{state.businesses.filter(b=>b.status==='Active').length} active businesses</strong></div><div><span className="eyebrow">LIVE DEALS</span><strong>{state.deals.length} opportunities</strong></div><div><span className="eyebrow">ATTENTION</span><strong>{state.priorities.filter(p=>p.tone!=='normal').length} priority items</strong></div><div><span className="eyebrow">PROJECTS</span><strong>{state.projects.length} tracked</strong></div></div>
          <div className="grid-main"><section className="panel priority-panel"><PanelHead title="Today's priorities" action="Task register" onAction={()=>setActive('Tasks')}/>{state.priorities.length===0&&<div className="empty-state inline"><p>Priority records are not persisted yet: the Prisma schema has no Priority model, so tasks remain the source of operational work.</p></div>}<div className="priority-list">{state.priorities.map((p,i)=><button className="priority" key={p.id} onClick={()=>p.relatedType==='Deal'&&setSelectedDeal(state.deals.find(d=>d.id===p.relatedId)||null)}><div className={`priority-marker ${p.tone}`}>{i+1}</div><div className="priority-copy"><strong>{p.title}</strong><span>{p.meta}</span></div><Badge tone={p.tone}>{p.due}</Badge><ChevronRight size={15} className="row-arrow"/></button>)}</div></section><section className="panel ai-panel"><PanelHead title="AI operating brief" action="Open brief" onAction={()=>runCommand('What should I focus on today?')}/><div className="brief-label"><Sparkles size={14}/> RECOMMENDATION</div><h3>{agentResponse.recommendation}</h3><p>{agentResponse.summary}</p><div className="brief-grid"><div><span>RISK</span><strong>{agentResponse.risk}</strong></div><div><span>NEXT ACTION</span><strong>{agentResponse.nextAction}</strong></div></div></section></div>
          <div className="section-head"><div><span className="eyebrow">COMMERCIAL PIPELINE</span><h2>Active deals</h2></div><button className="text-action" onClick={()=>setActive('Deals')}>Open deal desk <ArrowUpRight size={14}/></button></div>
          <section className="panel table-panel"><div className="table-head"><span>DEAL</span><span>COUNTERPARTY</span><span>VALUE</span><span>STAGE</span><span>PROBABILITY</span><span>HEALTH</span><span/></div>{visibleDeals.map(d=><button className="table-row" key={d.id} onClick={()=>setSelectedDeal(d)}><div className="deal-name"><div className="deal-symbol"><BriefcaseBusiness size={15}/></div><strong>{d.name}</strong></div><span>{d.counterparty}</span><strong>{d.value}</strong><span>{d.stage}</span><div className="prob"><div><i style={{width:`${d.probability}%`}}/></div><span>{d.probability}%</span></div><Badge tone={healthTone(d.health)}>{d.health}</Badge><ChevronRight size={15}/></button>)}</section>
          <div className="grid-three"><section className="panel"><PanelHead title="Follow-ups" action="Contacts" onAction={()=>setActive('Contacts')}/><div className="compact-list">{state.contacts.map(f=><div className="compact-row" key={f.id}><div className="avatar small">{f.name.split(' ').map(x=>x[0]).join('').slice(0,2)}</div><div><strong>{f.name}</strong><span>{f.organization} · {f.nextAction}</span></div><Badge tone="attention">{f.lastContact}</Badge></div>)}</div></section><section className="panel"><PanelHead title="Project health" action="Projects" onAction={()=>setActive('Projects')}/><div className="project-list">{state.projects.map(p=><div className="project" key={p.id}><div className="project-top"><strong>{p.name}</strong><Badge tone={healthTone(p.health)}>{p.health}</Badge></div><div className="progress"><i style={{width:`${p.progress}%`}}/></div><div className="project-meta"><span>{p.status} · {p.blocker}</span><span>{p.progress}%</span></div></div>)}</div></section><section className="panel activity-panel"><PanelHead title="Operating activity" action="Open log"/><div className="activity-list">{state.activities.map(a=><div className="activity-row" key={a.id}><div className="activity-icon">{a.type==='Deal'?<BriefcaseBusiness size={13}/>:a.type==='Project'?<Gauge size={13}/>:<CheckCircle2 size={13}/>}</div><div><strong>{a.title}</strong><span>{a.detail}</span><small>{a.time}</small></div></div>)}</div></section></div>
          <section className="portfolio-band"><div><span className="eyebrow">DATA WORKSPACE</span><h2>One operating picture across your businesses.</h2><p>Your records persist in Kayda&apos;s PostgreSQL database. The interface reads and writes only through validated server routes, so database credentials never reach the browser.</p></div><div className="portfolio-rail">{state.businesses.length === 0 ? <div className="empty-state inline"><p>No businesses yet. Create your first record from the Businesses register.</p></div> : state.businesses.map(b=><div key={b.id}><span>{b.status}</span><strong>{b.name}</strong><small>{b.category}</small></div>)}</div></section>
          <footer><span>KAYDA INTELLIGENCE</span><span>{storageStatus === 'postgres' ? 'Private · PostgreSQL · No demonstration data' : 'Private · Storage unavailable · No demonstration data'}</span></footer>
        </>}
      </div>
    </section>
    {aiOpen&&<div className="ai-drawer"><div className="drawer-head"><div><span className="eyebrow">COMMAND AGENT</span><h2>Operating response</h2></div><button onClick={()=>setAiOpen(false)}><X size={18}/></button></div><div className="drawer-query"><Sparkles size={15}/><span>{command||'What should I focus on today?'}</span></div><div className="response"><div className="brief-label"><CheckCircle2 size={14}/> RECOMMENDATION</div><h3>{agentResponse.recommendation}</h3><p>{agentResponse.summary}</p><div className="response-block"><span>WHY IT MATTERS</span><p>{agentResponse.why}</p></div><div className="response-block"><span>RISK</span><p>{agentResponse.risk}</p></div><div className="response-block"><span>NEXT ACTION</span><button className="primary-action" onClick={()=>setAiOpen(false)}>Acknowledge <CheckCircle2 size={14}/></button></div><div className="response-block"><span>RELATED</span><div className="related">{agentResponse.related.map(x=><span key={x}>{x}</span>)}</div></div></div></div>}
    {selectedDeal&&<><div className="drawer-scrim" onClick={()=>setSelectedDeal(null)}/><DealDrawer deal={selectedDeal} onClose={()=>setSelectedDeal(null)}/></>}
    {createOpen&&<CreateModal type={active} onClose={()=>setCreateOpen(false)} onSave={createRecord} saving={saving} error={saveError}/>}
  </main>;
}
