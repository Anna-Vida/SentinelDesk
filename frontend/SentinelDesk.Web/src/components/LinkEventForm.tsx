import { useCallback, useState } from 'react'
import { getIncidents } from '../api/incidents'
import { linkSecurityEvent } from '../api/securityEvents'
import { useResource } from '../hooks/useResource'
import { Modal } from './Modal'
import { EmptyState, ErrorState, LoadingState } from './States'
export function LinkEventForm({ eventId, onClose, onLinked }: { eventId: string; onClose: () => void; onLinked: () => void }) {
  const [search, setSearch] = useState(''); const [term, setTerm] = useState(''); const [page, setPage] = useState(1)
  const [busy, setBusy] = useState(false); const [error, setError] = useState('')
  const load = useCallback(() => getIncidents({ search: term, page, pageSize: 10 }), [term, page])
  const { data, loading, error: loadError, retry } = useResource(load)
  async function link(id: string) {
    setBusy(true); setError('')
    try { await linkSecurityEvent(eventId, id); onLinked(); onClose() }
    catch (error) { setError(error instanceof Error ? error.message : 'Unable to link event') }
    finally { setBusy(false) }
  }
  return <Modal title="Link event to incident" eyebrow="CONNECT EVIDENCE" onClose={onClose} busy={busy}>
    <form onSubmit={event => { event.preventDefault(); setTerm(search); setPage(1) }}><label>Search active incidents<input maxLength={200} autoFocus value={search} onChange={event => setSearch(event.target.value)} /></label><button className="button ghost" disabled={busy}>Search</button></form>
    {loading ? <LoadingState /> : loadError ? <ErrorState message={loadError} retry={retry} /> : data?.items.length ? <div className="incident-picker">{data.items.map(item => <button type="button" className="button ghost" disabled={busy} key={item.id} onClick={() => void link(item.id)}><strong>{item.title}</strong><small>{item.severity} · {item.status}</small></button>)}</div> : <EmptyState title="No matching incidents" detail="Create an incident first, or adjust your search." />}
    {data && data.totalPages > 1 && <div className="pagination"><button className="button ghost" disabled={busy || page === 1} onClick={() => setPage(value => value - 1)}>Previous</button><span>{page} / {data.totalPages}</span><button className="button ghost" disabled={busy || page >= data.totalPages} onClick={() => setPage(value => value + 1)}>Next</button></div>}
    {error && <p role="alert" className="form-error">{error}</p>}
  </Modal>
}
