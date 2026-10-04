import { useCallback, useState } from 'react'
import { archiveIncident, changeIncidentStatus, getIncident } from '../api/incidents'
import { getSecurityEvents } from '../api/securityEvents'
import { IncidentStatus } from '../types'
import { formatDate, shortId } from '../utils/format'
import { SeverityBadge, StatusBadge, RiskScore } from './Badges'
import { Modal } from './Modal'
import { IncidentForm } from './IncidentForm'
import { ErrorState, LoadingState } from './States'
import { useResource } from '../hooks/useResource'
const nextStatus: Partial<Record<IncidentStatus, IncidentStatus>> = {
  [IncidentStatus.Open]: IncidentStatus.Investigating,
  [IncidentStatus.Investigating]: IncidentStatus.Contained,
  [IncidentStatus.Contained]: IncidentStatus.Resolved,
  [IncidentStatus.Resolved]: IncidentStatus.Closed,
}
export function IncidentDetail({ id, revision, canWrite, onClose, onChanged }: {
  id: string; revision: number; canWrite: boolean; onClose: () => void; onChanged: () => void
}) {
  const load = useCallback(() => Promise.all([getIncident(id), getSecurityEvents({ incidentId: id, pageSize: 100 })]), [id])
  const { data, error: loadError, loading, retry } = useResource(load, revision)
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [editing, setEditing] = useState(false)
  const incident = data?.[0]; const events = data?.[1]
  if (editing && incident) return <IncidentForm incident={incident} onClose={() => setEditing(false)} onCreated={() => { setEditing(false); onChanged(); retry() }} />
  async function mutate(action: () => Promise<unknown>, close = false) {
    setBusy(true); setError('')
    try { await action(); onChanged(); if (close) onClose(); else retry() }
    catch (error) { setError(error instanceof Error ? error.message : 'Update failed') }
    finally { setBusy(false) }
  }
  const next = incident ? nextStatus[incident.status] : undefined
  return <Modal title={incident?.title ?? 'Incident details'} eyebrow={`INCIDENT #${shortId(id)}`} onClose={onClose} busy={busy}>
    {loading && !incident ? <LoadingState /> : loadError ? <ErrorState message={loadError} retry={retry} /> : incident && <>
      <div className="detail-badges"><SeverityBadge value={incident.severity} /><StatusBadge value={incident.status} />{incident.isArchived && <span className="badge">Archived</span>}</div>
      <p className="description">{incident.description}</p>
      <dl className="detail-grid"><div><dt>Created</dt><dd>{formatDate(incident.createdAt)}</dd></div><div><dt>Updated</dt><dd>{formatDate(incident.updatedAt)}</dd></div></dl>
      <h3>Linked security events ({events?.totalItems ?? 0})</h3>
      {events?.items.length ? <div className="linked-events">{events.items.map(item => <article className="feed-item" key={item.id}><div className="feed-line"><strong>{item.eventType}</strong><RiskScore value={item.riskScore} /></div><p>{item.description}</p><small>{item.sourceIp} · {formatDate(item.detectedAt)}</small></article>)}{events.totalItems > events.items.length && <p className="muted">Showing the latest 100. Search Security Events for more.</p>}</div> : <p className="muted">No events linked yet. Link evidence from Security Events.</p>}
      {incident.isArchived && <p className="muted">Archived incidents are read-only. Evidence remains available.</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {canWrite && !incident.isArchived && <div className="modal-actions"><button className="button danger" disabled={busy} onClick={() => { if (window.confirm('Archive this incident? It will become read-only and leave active views.')) void mutate(() => archiveIncident(id), true) }}>Archive</button><button className="button ghost" disabled={busy} onClick={() => setEditing(true)}>Edit</button>{next && <button className="button primary" disabled={busy} onClick={() => void mutate(() => changeIncidentStatus(id, next))}>Move to {next}</button>}</div>}
    </>}
  </Modal>
}
