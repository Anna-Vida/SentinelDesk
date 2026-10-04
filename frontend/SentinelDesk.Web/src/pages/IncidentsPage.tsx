import { useCallback, useEffect, useState } from 'react'
import { getIncidents } from '../api/incidents'
import { EmptyState, ErrorState, LoadingState } from '../components/States'
import { IncidentTable } from '../components/IncidentTable'
import { IncidentSeverity, IncidentStatus, type Incident } from '../types'
import { useResource } from '../hooks/useResource'
export function IncidentsPage({ revision, onSelect, onNewIncident }: { revision: number; onSelect: (item: Incident) => void; onNewIncident?: () => void }) {
  const [page, setPage] = useState(1); const [search, setSearch] = useState(''); const [term, setTerm] = useState('')
  const [severity, setSeverity] = useState(''); const [status, setStatus] = useState(''); const [includeArchived, setIncludeArchived] = useState(false)
  useEffect(() => { const timer = setTimeout(() => { setTerm(search); setPage(1) }, 250); return () => clearTimeout(timer) }, [search])
  const load = useCallback(() => getIncidents({ page, pageSize: 10, search: term, severity: severity as IncidentSeverity || undefined, status: status as IncidentStatus || undefined, includeArchived }), [page, term, severity, status, includeArchived])
  const { data, loading, error, retry } = useResource(load, revision)
  useEffect(() => { if (data && page > Math.max(data.totalPages, 1)) setPage(Math.max(data.totalPages, 1)) }, [data, page])
  return <><section className="welcome compact"><div><span className="eyebrow">CASE MANAGEMENT</span><h2>Incident queue</h2><p>Investigate and progress security incidents.</p></div>{onNewIncident && <button className="button primary" onClick={onNewIncident}>＋ Create incident</button>}</section>
    <section className="panel"><div className="filters"><label className="search"><span className="sr-only">Search incidents</span><input maxLength={200} value={search} onChange={event => setSearch(event.target.value)} placeholder="Search title or description…" /></label>
      <label><span className="sr-only">Severity</span><select value={severity} onChange={event => { setSeverity(event.target.value); setPage(1) }}><option value="">All severities</option>{Object.values(IncidentSeverity).map(value => <option key={value}>{value}</option>)}</select></label>
      <label><span className="sr-only">Status</span><select value={status} onChange={event => { setStatus(event.target.value); setPage(1) }}><option value="">All statuses</option>{Object.values(IncidentStatus).map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="checkbox-label"><input type="checkbox" checked={includeArchived} onChange={event => { setIncludeArchived(event.target.checked); setPage(1) }} />Include archived</label></div>
      {loading ? <LoadingState /> : error ? <ErrorState message={error} retry={retry} /> : data?.items.length ? <IncidentTable incidents={data.items} onSelect={onSelect} /> : <EmptyState title="No matching incidents" detail="Adjust your filters or create a new incident." />}
      {!loading && !error && data && <div className="pagination"><span>{data.totalItems} incidents · Page {page} of {Math.max(data.totalPages, 1)}</span><div><button className="button ghost" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Previous</button><button className="button ghost" disabled={page >= data.totalPages} onClick={() => setPage(value => value + 1)}>Next</button></div></div>}
    </section></>
}
