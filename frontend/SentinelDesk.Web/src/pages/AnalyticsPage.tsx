import { EmptyState, ErrorState, LoadingState } from '../components/States'
import { IncidentSeverity, IncidentStatus, type Incident, type SecurityEvent } from '../types'

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

export function AnalyticsPage({ incidents, events, loading, error, onRetry }: {
  incidents: Incident[]
  events: SecurityEvent[]
  loading: boolean
  error: string
  onRetry: () => void
}) {
  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} retry={onRetry} />

  const averageRisk = events.length
    ? Math.round(events.reduce((sum, event) => sum + event.riskScore, 0) / events.length)
    : 0
  const highRiskEvents = events.filter((event) => event.riskScore >= 70).length
  const linkedEvents = events.filter((event) => event.incidentId).length
  const resolvedOrClosed = incidents.filter((incident) =>
    incident.status === IncidentStatus.Resolved || incident.status === IncidentStatus.Closed
  ).length

  const statusItems = statusOrder.map((status) => ({
    label: status,
    value: incidents.filter((incident) => incident.status === status).length,
  }))
  const severityItems = severityOrder.map((severity) => ({
    label: severity,
    value: incidents.filter((incident) => incident.severity === severity).length,
  }))

  const cards = [
    ['Resolution rate', `${percent(resolvedOrClosed, incidents.length)}%`, 'Resolved or closed incidents'],
    ['Average risk', averageRisk, 'Mean telemetry risk score'],
    ['High-risk events', highRiskEvents, 'Risk score 70 or higher'],
    ['Event linkage', `${percent(linkedEvents, events.length)}%`, 'Events linked to incidents'],
  ]

  return <>
    <section className="welcome compact">
      <div><span className="eyebrow">SOC ANALYTICS</span><h2>Operational intelligence</h2><p>Live response metrics calculated from current SentinelDesk data.</p></div>
    </section>

    <section className="stats-grid" aria-label="Analytics metrics">
      {cards.map(([label, value, detail], index) =>
        <article className="stat-card" key={label}>
          <span className={`stat-icon tone-${index}`}>{['%', '◎', '!', '⌁'][index]}</span>
          <div><small>{label}</small><strong>{value}</strong><span>{detail}</span></div>
        </article>
      )}
    </section>

    {!incidents.length && !events.length
      ? <section className="panel"><EmptyState title="No analytics yet" detail="Create incidents or security events to populate operational metrics." /></section>
      : <div className="analytics-grid">
          <section className="panel">
            <div className="panel-head"><div><span className="eyebrow">WORKFLOW HEALTH</span><h3>Incident status distribution</h3></div></div>
            <DistributionList items={statusItems} total={incidents.length} />
          </section>
          <section className="panel">
            <div className="panel-head"><div><span className="eyebrow">RISK PROFILE</span><h3>Incident severity distribution</h3></div></div>
            <DistributionList items={severityItems} total={incidents.length} />
          </section>
        </div>}
  </>
}
