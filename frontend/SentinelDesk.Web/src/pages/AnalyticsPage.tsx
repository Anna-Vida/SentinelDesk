import { EmptyState, ErrorState, LoadingState } from '../components/States'
import { getDashboard } from '../api/dashboard'
import { useResource } from '../hooks/useResource'
import { IncidentSeverity, IncidentStatus } from '../types'

const statusOrder = Object.values(IncidentStatus)
const severityOrder = Object.values(IncidentSeverity)

function percent(value: number, total: number) {
  if (!total) return 0
  return Math.round((value / total) * 100)
}

function DistributionList({ items, total }: { items: Array<{ label: string; value: number }>; total: number }) {
  return <div className="analytics-list">
    {items.map((item) => {
      const share = percent(item.value, total)
      return <div className="analytics-row" key={item.label}>
        <div className="analytics-row-head"><span>{item.label}</span><strong>{item.value}</strong></div>
        <div className="analytics-bar" aria-label={`${item.label}: ${item.value} (${share}%)`}><span style={{ width: `${share}%` }} /></div>
        <small>{share}% of total</small>
      </div>
    })}
  </div>
}

export function AnalyticsPage({ revision }: { revision: number }) {
  const { data, loading, error, retry } = useResource(getDashboard, revision)
  if (loading && !data) return <LoadingState />
  if (error) return <ErrorState message={error} retry={retry} />
  if (!data) return null
  const incidentCount = data.byStatus.reduce((sum, item) => sum + item.count, 0)
  const averageRisk = Math.round(data.averageRisk)
  const highRiskEvents = data.highRiskEvents
  const linkedEvents = data.eventCount - data.unlinkedEvents
  const resolvedOrClosed = data.byStatus.filter(item => ['Resolved', 'Closed'].includes(item.label)).reduce((sum, item) => sum + item.count, 0)

  const statusItems = statusOrder.map((status) => ({
    label: status,
    value: data.byStatus.find(item => item.label === status)?.count ?? 0,
  }))
  const severityItems = severityOrder.map((severity) => ({
    label: severity,
    value: data.bySeverity.find(item => item.label === severity)?.count ?? 0,
  }))

  const cards = [
    ['Resolution rate', `${percent(resolvedOrClosed, incidentCount)}%`, 'Resolved or closed incidents'],
    ['Average risk', averageRisk, 'Mean telemetry risk score'],
    ['High-risk events', highRiskEvents, 'Risk score 70 or higher'],
    ['Event linkage', `${percent(linkedEvents, data.eventCount)}%`, 'Events linked to incidents'],
  ]

  return <>
    <section className="welcome compact">
      <div><span className="eyebrow">SOC ANALYTICS</span><h2>Operational intelligence</h2><p>Live response metrics calculated from all recorded SentinelDesk data. Non-archived incidents only.</p></div>
    </section>

    <section className="stats-grid" aria-label="Analytics metrics">
      {cards.map(([label, value, detail], index) =>
        <article className="stat-card" key={label}>
          <span className={`stat-icon tone-${index}`}>{['%', '◎', '!', '⌁'][index]}</span>
          <div><small>{label}</small><strong>{value}</strong><span>{detail}</span></div>
        </article>
      )}
    </section>

    {!incidentCount && !data.eventCount
      ? <section className="panel"><EmptyState title="No analytics yet" detail="Create incidents or security events to populate operational metrics." /></section>
      : <div className="analytics-grid">
          <section className="panel">
            <div className="panel-head"><div><span className="eyebrow">WORKFLOW HEALTH</span><h3>Incident status distribution</h3></div></div>
            <DistributionList items={statusItems} total={incidentCount} />
          </section>
          <section className="panel">
            <div className="panel-head"><div><span className="eyebrow">RISK PROFILE</span><h3>Incident severity distribution</h3></div></div>
            <DistributionList items={severityItems} total={incidentCount} />
          </section>
        </div>}
  </>
}
