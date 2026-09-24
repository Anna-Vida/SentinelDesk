import type { SecurityEvent } from '../types'
import { formatDate, shortId } from '../utils/format'
import { RiskScore } from '../components/Badges'
import { EmptyState, ErrorState, LoadingState } from '../components/States'

export function SecurityEventsPage({ events, loading, error, onRetry }: { events: SecurityEvent[]; loading: boolean; error: string; onRetry: () => void }) {
  return <><section className="welcome compact"><div><span className="eyebrow">TELEMETRY</span><h2>Security events</h2><p>Live signals observed across monitored systems.</p></div></section><section className="panel">
    {loading ? <LoadingState /> : error ? <ErrorState message={error} retry={onRetry} /> : events.length ? <div className="table-wrap"><table><thead><tr><th>Event type</th><th>Source IP</th><th>Description</th><th>Risk score</th><th>Detected</th><th>Linked incident</th></tr></thead><tbody>{events.map((item) => <tr key={item.id}><td><strong>{item.eventType}</strong></td><td><code>{item.sourceIp}</code></td><td className="description-cell">{item.description}</td><td><RiskScore value={item.riskScore} /></td><td>{formatDate(item.detectedAt)}</td><td>{item.incidentId ? `#${shortId(item.incidentId)}` : <span className="muted">Unlinked</span>}</td></tr>)}</tbody></table></div> : <EmptyState title="No security events" detail="Incoming telemetry will appear here automatically." />}
  </section></>
}
