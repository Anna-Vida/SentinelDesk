import { useState } from 'react'
import { archiveIncident, changeIncidentStatus } from '../api/incidents'
import { IncidentStatus, type Incident } from '../types'
import { formatDate, shortId } from '../utils/format'
import { SeverityBadge, StatusBadge } from './Badges'

const nextStatus: Partial<Record<IncidentStatus, IncidentStatus>> = {
  [IncidentStatus.Open]: IncidentStatus.Investigating,
  [IncidentStatus.Investigating]: IncidentStatus.Contained,
  [IncidentStatus.Contained]: IncidentStatus.Resolved,
  [IncidentStatus.Resolved]: IncidentStatus.Closed,
}

export function IncidentDetail({ incident, onClose, onChanged, onArchived }: {
  incident: Incident; onClose: () => void; onChanged: (incident: Incident) => void; onArchived: (id: string) => void
}) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState('')
  const next = nextStatus[incident.status]
  const transition = async () => {
    if (!next) return
    setBusy(true); setError('')
    try { onChanged(await changeIncidentStatus(incident.id, next)) } catch (err) { setError(err instanceof Error ? err.message : 'Update failed') } finally { setBusy(false) }
  }
  const archive = async () => {
    if (!window.confirm('Archive this incident? It will leave active views.')) return
    setBusy(true); setError('')
    try { await archiveIncident(incident.id); onArchived(incident.id); onClose() } catch (err) { setError(err instanceof Error ? err.message : 'Archive failed') } finally { setBusy(false) }
  }
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <section className="modal detail-modal" role="dialog" aria-modal="true" aria-labelledby="incident-title">
      <div className="modal-head"><div><span className="eyebrow">INCIDENT #{shortId(incident.id)}</span><h2 id="incident-title">{incident.title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close">×</button></div>
      <div className="detail-badges"><SeverityBadge value={incident.severity} /><StatusBadge value={incident.status} /></div>
      <p className="description">{incident.description}</p>
      <dl className="detail-grid"><div><dt>Created</dt><dd>{formatDate(incident.createdAt)}</dd></div><div><dt>Last updated</dt><dd>{formatDate(incident.updatedAt)}</dd></div></dl>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="modal-actions"><button className="button danger" disabled={busy} onClick={archive}>Archive</button>{next && <button className="button primary" disabled={busy} onClick={transition}>Move to {next}</button>}</div>
    </section>
  </div>
}
