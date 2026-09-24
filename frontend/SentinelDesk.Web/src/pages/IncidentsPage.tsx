import { useEffect, useState } from 'react'
import { getIncidents } from '../api/incidents'
import { EmptyState, ErrorState, LoadingState } from '../components/States'
import { IncidentTable } from '../components/IncidentTable'
import { IncidentSeverity, IncidentStatus, type Incident } from '../types'

export function IncidentsPage({ revision, onSelect, onNewIncident }: { revision: number; onSelect: (item: Incident) => void; onNewIncident: () => void }) {
  const [items, setItems] = useState<Incident[]>([]); const [page, setPage] = useState(1); const [totalPages, setTotalPages] = useState(0)
  const [search, setSearch] = useState(''); const [severity, setSeverity] = useState(''); const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [request, setRequest] = useState(0)
  useEffect(() => {
    const timer = window.setTimeout(() => { setLoading(true); setError(''); getIncidents({ page, pageSize: 10, search: search || undefined, severity: severity as IncidentSeverity || undefined, status: status as IncidentStatus || undefined }).then((data) => { setItems(data.items); setTotalPages(data.totalPages) }).catch((err) => setError(err instanceof Error ? err.message : 'Request failed')).finally(() => setLoading(false)) }, 250)
    return () => window.clearTimeout(timer)
  }, [page, search, severity, status, revision, request])
  const resetPage = (setter: (value: string) => void) => (value: string) => { setter(value); setPage(1) }
  return <>
    <section className="welcome compact"><div><span className="eyebrow">CASE MANAGEMENT</span><h2>Incident queue</h2><p>Investigate and progress active security incidents.</p></div><button className="button primary" onClick={onNewIncident}>＋ Create incident</button></section>
    <section className="panel"><div className="filters"><label className="search"><span className="sr-only">Search incidents</span><input value={search} onChange={(e) => resetPage(setSearch)(e.target.value)} placeholder="Search title or description…" /></label><label><span className="sr-only">Severity</span><select value={severity} onChange={(e) => resetPage(setSeverity)(e.target.value)}><option value="">All severities</option>{Object.values(IncidentSeverity).map((x) => <option key={x}>{x}</option>)}</select></label><label><span className="sr-only">Status</span><select value={status} onChange={(e) => resetPage(setStatus)(e.target.value)}><option value="">All statuses</option>{Object.values(IncidentStatus).map((x) => <option key={x}>{x}</option>)}</select></label></div>
      {loading ? <LoadingState /> : error ? <ErrorState message={error} retry={() => setRequest((x) => x + 1)} /> : items.length ? <IncidentTable incidents={items} onSelect={onSelect} /> : <EmptyState title="No matching incidents" detail="Adjust your filters or create a new incident." />}
      {!loading && !error && <div className="pagination"><span>Page {page} of {Math.max(totalPages, 1)}</span><div><button className="button ghost" disabled={page <= 1} onClick={() => setPage((x) => x - 1)}>Previous</button><button className="button ghost" disabled={page >= totalPages} onClick={() => setPage((x) => x + 1)}>Next</button></div></div>}
    </section>
  </>
}
