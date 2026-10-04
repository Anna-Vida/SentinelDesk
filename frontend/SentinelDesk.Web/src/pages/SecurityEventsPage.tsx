import { useCallback, useEffect, useState } from 'react'
import { getSecurityEvents } from '../api/securityEvents'
import { useResource } from '../hooks/useResource'
import { formatDate, shortId } from '../utils/format'
import { RiskScore } from '../components/Badges'
import { EmptyState, ErrorState, LoadingState } from '../components/States'
import { EventForm } from '../components/EventForm'
import { LinkEventForm } from '../components/LinkEventForm'
export function SecurityEventsPage({ revision, onChanged, canWrite, onSelectIncident }: { revision: number; onChanged: () => void; canWrite: boolean; onSelectIncident: (id: string) => void }) {
  const [page, setPage] = useState(1); const [search, setSearch] = useState(''); const [term, setTerm] = useState(''); const [risk, setRisk] = useState(''); const [unlinkedOnly, setUnlinkedOnly] = useState(false)
  const [creating, setCreating] = useState(false); const [linking, setLinking] = useState<string | null>(null)
  useEffect(() => { const timer = setTimeout(() => { setTerm(search); setPage(1) }, 250); return () => clearTimeout(timer) }, [search])
  const load = useCallback(() => getSecurityEvents({ page, pageSize: 15, search: term, minRisk: risk ? Number(risk) : undefined, unlinkedOnly }), [page, term, risk, unlinkedOnly])
  const { data, loading, error, retry } = useResource(load, revision)
  useEffect(() => { if (data && page > Math.max(data.totalPages, 1)) setPage(Math.max(data.totalPages, 1)) }, [data, page])
  return <><section className="welcome compact"><div><span className="eyebrow">TELEMETRY</span><h2>Security events</h2><p>Record signals and link evidence to an investigation.</p></div>{canWrite && <button className="button primary" onClick={() => setCreating(true)}>＋ Record event</button>}</section><section className="panel">
    <div className="filters"><label className="search"><span className="sr-only">Search events</span><input maxLength={200} value={search} onChange={event => setSearch(event.target.value)} placeholder="Search event, IP or description…" /></label><label><span className="sr-only">Minimum risk</span><select value={risk} onChange={event => { setRisk(event.target.value); setPage(1) }}><option value="">All risk scores</option><option value="50">Risk 50+</option><option value="75">Risk 75+</option><option value="90">Risk 90+</option></select></label><label className="checkbox-label"><input type="checkbox" checked={unlinkedOnly} onChange={event => { setUnlinkedOnly(event.target.checked); setPage(1) }} />Unlinked only</label></div>
    {loading ? <LoadingState /> : error ? <ErrorState message={error} retry={retry} /> : data?.items.length ? <div className="table-wrap"><table><thead><tr><th>Event type</th><th>Source IP</th><th>Description</th><th>Risk score</th><th>Detected</th><th>Linked incident</th></tr></thead><tbody>{data.items.map(item => <tr key={item.id}><td><strong>{item.eventType}</strong></td><td><code>{item.sourceIp}</code></td><td className="description-cell">{item.description}</td><td><RiskScore value={item.riskScore} /></td><td>{formatDate(item.detectedAt)}</td><td>{item.incidentId ? <button className="title-link" onClick={() => onSelectIncident(item.incidentId!)}>#{shortId(item.incidentId)}</button> : <span className="muted">Unlinked</span>}{canWrite && <button className="button ghost link-action" onClick={() => setLinking(item.id)}>{item.incidentId ? 'Relink' : 'Link incident'}</button>}</td></tr>)}</tbody></table></div> : <EmptyState title="No matching security events" detail="Adjust your filters or record a new signal." />}
    {!loading && !error && data && <div className="pagination"><span>{data.totalItems} events · Page {page} of {Math.max(data.totalPages, 1)}</span><div><button className="button ghost" disabled={page === 1} onClick={() => setPage(value => value - 1)}>Previous</button><button className="button ghost" disabled={page >= data.totalPages} onClick={() => setPage(value => value + 1)}>Next</button></div></div>}
    </section>{creating && <EventForm onClose={() => setCreating(false)} onCreated={onChanged} />}{linking && <LinkEventForm eventId={linking} onClose={() => setLinking(null)} onLinked={onChanged} />}</>
}
