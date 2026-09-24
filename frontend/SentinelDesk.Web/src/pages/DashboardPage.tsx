import type { Incident, SecurityEvent } from '../types'
import { IncidentStatus, IncidentSeverity } from '../types'
import { formatDate } from '../utils/format'
import { RiskScore } from '../components/Badges'
import { EmptyState, ErrorState, LoadingState } from '../components/States'
import { IncidentTable } from '../components/IncidentTable'

export function DashboardPage({ incidents, events, loading, error, onRetry, onSelect, onNewIncident }: {
  incidents: Incident[]; events: SecurityEvent[]; loading: boolean; error: string; onRetry: () => void; onSelect: (item: Incident) => void; onNewIncident: () => void
}) {
  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} retry={onRetry} />
  const cards = [
    ['Open Incidents', incidents.filter((item) => item.status === IncidentStatus.Open).length, 'Needs triage'],
    ['Critical Incidents', incidents.filter((item) => item.severity === IncidentSeverity.Critical).length, 'Highest priority'],
    ['Investigating', incidents.filter((item) => item.status === IncidentStatus.Investigating).length, 'Under analysis'],
    ['Security Events', events.length, 'Recorded signals'],
  ]
  return <>
    <section className="welcome"><div><span className="eyebrow">OPERATIONS OVERVIEW</span><h2>Security posture at a glance</h2><p>Live intelligence from your incident response pipeline.</p></div><button className="button primary" onClick={onNewIncident}>＋ Create incident</button></section>
    <section className="stats-grid" aria-label="Incident metrics">{cards.map(([label, value, detail], index) => <article className="stat-card" key={label}><span className={`stat-icon tone-${index}`}>{['△', '!', '⌁', '◎'][index]}</span><div><small>{label}</small><strong>{value}</strong><span>{detail}</span></div></article>)}</section>
    <div className="dashboard-grid">
      <section className="panel"><div className="panel-head"><div><span className="eyebrow">INCIDENT QUEUE</span><h3>Recent incidents</h3></div></div>{incidents.length ? <IncidentTable incidents={incidents.slice(0, 6)} onSelect={onSelect} /> : <EmptyState title="No active incidents" detail="New incidents will appear here in real time." />}</section>
      <section className="panel feed-panel"><div className="panel-head"><div><span className="eyebrow live-label">LIVE STREAM</span><h3>Security events</h3></div></div><div className="event-feed">{events.slice(0, 7).map((item) => <article className="feed-item" key={item.id}><div className="feed-line"><strong>{item.eventType}</strong><RiskScore value={item.riskScore} /></div><p>{item.description}</p><small>{item.sourceIp} · {formatDate(item.detectedAt)}</small></article>)}{!events.length && <EmptyState title="No security events" detail="Incoming telemetry will appear here." />}</div></section>
    </div>
  </>
}
