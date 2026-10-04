import { getDashboard, type Count } from '../api/dashboard'
import { useResource } from '../hooks/useResource'
import { ErrorState, LoadingState } from '../components/States'
import { IncidentSeverity, IncidentStatus } from '../types'
import { formatDate } from '../utils/format'
function Distribution({ title, labels, counts }: { title: string; labels: string[]; counts: Count[] }) {
  const total = counts.reduce((sum, item) => sum + item.count, 0)
  return <section className="panel"><div className="panel-head"><h3>{title}</h3><p className="muted">{total} non-archived incidents</p></div><div className="distribution">{labels.map(label => {
    const value = counts.find(item => item.label === label)?.count ?? 0
    return <div key={label}><div className="distribution-label"><span>{label}</span><strong>{value}</strong></div><meter min={0} max={Math.max(total, 1)} value={value} aria-label={`${label}: ${value} of ${total}`} /></div>
  })}</div></section>
}
export function AnalyticsPage({ revision }: { revision: number }) {
  const { data, loading, error, retry } = useResource(getDashboard, revision)
  if (loading && !data) return <LoadingState />
  if (error) return <ErrorState message={error} retry={retry} />
  if (!data) return null
  const total = data.byStatus.reduce((sum, item) => sum + item.count, 0)
  const complete = data.byStatus.filter(item => ['Resolved', 'Closed'].includes(item.label)).reduce((sum, item) => sum + item.count, 0)
  return <><section className="welcome compact"><div><span className="eyebrow">WORKSPACE ANALYTICS</span><h2>Where your response stands</h2><p>All recorded data. Updated {formatDate(data.generatedAt)}.</p></div><button className="button ghost" onClick={retry}>Refresh</button></section>
    <section className="stats-grid">{[['Resolved or closed', total ? `${Math.round(complete / total * 100)}%` : '—'], ['High-risk events (75+)', data.highRiskEvents], ['Unlinked events', data.unlinkedEvents], ['Archived incidents', data.archivedCount]].map(([label, value]) => <article key={label} className="stat-card"><div><small>{label}</small><strong>{value}</strong></div></article>)}</section>
    <div className="analytics-grid"><Distribution title="Incident status" labels={Object.values(IncidentStatus)} counts={data.byStatus} /><Distribution title="Incident severity" labels={Object.values(IncidentSeverity)} counts={data.bySeverity} /></div></>
}
