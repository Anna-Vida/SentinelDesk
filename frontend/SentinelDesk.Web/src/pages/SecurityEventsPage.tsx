import { useMemo, useState } from 'react'
import type { Incident, SecurityEvent } from '../types'
import { formatDate, shortId } from '../utils/format'
import { RiskScore } from '../components/Badges'
import { EmptyState, ErrorState, LoadingState } from '../components/States'
import { SecurityEventForm } from '../components/SecurityEventForm'
import { EventLinkDialog } from '../components/EventLinkDialog'

export function SecurityEventsPage({ events, incidents, loading, error, onRetry, onCreated, onLinked }: {
  events: SecurityEvent[]
  incidents: Incident[]
  loading: boolean
  error: string
  onRetry: () => void
  onCreated: (event: SecurityEvent) => void
  onLinked: (event: SecurityEvent) => void
}) {
  const [creating, setCreating] = useState(false)
  const [linking, setLinking] = useState<SecurityEvent | null>(null)
  const [search, setSearch] = useState('')
  const [riskFloor, setRiskFloor] = useState('0')

  const visibleEvents = useMemo(() => {
    const term = search.trim().toLowerCase()
    const minimumRisk = Number(riskFloor)
    return events.filter((event) => {
      const matchesSearch = !term || event.eventType.toLowerCase().includes(term) || event.sourceIp.toLowerCase().includes(term) || event.description.toLowerCase().includes(term)
      return matchesSearch && event.riskScore >= minimumRisk
    })
  }, [events, riskFloor, search])

  return <>
    <section className="welcome compact">
      <div><span className="eyebrow">TELEMETRY</span><h2>Security events</h2><p>Live signals observed across monitored systems and correlated with response cases.</p></div>
      <button className="button primary" onClick={() => setCreating(true)}>＋ Record event</button>
    </section>
    <section className="panel">
      <div className="filters event-filters">
        <label className="search"><span className="sr-only">Search security events</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search event, IP, or description…" /></label>
        <label><span className="sr-only">Minimum risk</span><select value={riskFloor} onChange={(e) => setRiskFloor(e.target.value)}><option value="0">All risk levels</option><option value="30">Risk 30+</option><option value="60">Risk 60+</option><option value="80">Risk 80+</option></select></label>
      </div>
      {loading ? <LoadingState /> : error ? <ErrorState message={error} retry={onRetry} /> : visibleEvents.length ? <div className="table-wrap">
        <table><thead><tr><th>Event type</th><th>Source IP</th><th>Description</th><th>Risk score</th><th>Detected</th><th>Linked incident</th><th><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>{visibleEvents.map((item) => <tr key={item.id}>
            <td><strong>{item.eventType}</strong></td><td><code>{item.sourceIp}</code></td><td className="description-cell">{item.description}</td><td><RiskScore value={item.riskScore} /></td><td>{formatDate(item.detectedAt)}</td>
            <td>{item.incidentId ? <span className="linked-case">#{shortId(item.incidentId)}</span> : <span className="muted">Unlinked</span>}</td>
            <td className="table-actions"><button className="button ghost small" onClick={() => setLinking(item)}>{item.incidentId ? 'Relink' : 'Link'}</button></td>
          </tr>)}</tbody>
        </table>
      </div> : <EmptyState title={events.length ? 'No matching security events' : 'No security events'} detail={events.length ? 'Adjust your search or risk filter.' : 'Record telemetry manually or wait for incoming events.'} />}
    </section>
    {creating && <SecurityEventForm incidents={incidents} onClose={() => setCreating(false)} onCreated={onCreated} />}
    {linking && <EventLinkDialog securityEvent={linking} incidents={incidents} onClose={() => setLinking(null)} onLinked={onLinked} />}
  </>
}
