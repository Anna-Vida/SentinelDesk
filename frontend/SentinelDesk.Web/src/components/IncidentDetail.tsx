import { useState, type FormEvent } from 'react'
import { archiveIncident, changeIncidentStatus, updateIncident } from '../api/incidents'
import { IncidentSeverity, IncidentStatus, type Incident } from '../types'
import { formatDate, shortId } from '../utils/format'
import { SeverityBadge, StatusBadge } from './Badges'

const nextStatus: Partial<Record<IncidentStatus, IncidentStatus>> = {
  [IncidentStatus.Open]: IncidentStatus.Investigating,
  [IncidentStatus.Investigating]: IncidentStatus.Contained,
  [IncidentStatus.Contained]: IncidentStatus.Resolved,
  [IncidentStatus.Resolved]: IncidentStatus.Closed,
}

export function IncidentDetail({ incident, onClose, onChanged, onArchived, canManage, canArchive }: {
  incident: Incident
  onClose: () => void
  onChanged: (incident: Incident) => void
  onArchived: (id: string) => void
  canManage: boolean
  canArchive: boolean
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(incident.title)
  const [description, setDescription] = useState(incident.description)
  const [severity, setSeverity] = useState(incident.severity)
  const next = nextStatus[incident.status]

  const beginEdit = () => {
    setTitle(incident.title)
    setDescription(incident.description)
    setSeverity(incident.severity)
    setError('')
    setEditing(true)
  }

  const saveEdit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const updated = await updateIncident(incident.id, { title, description, severity })
      onChanged(updated)
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save incident')
    } finally {
      setBusy(false)
    }
  }

  const transition = async () => {
    if (!next) return
    setBusy(true)
    setError('')
    try {
      onChanged(await changeIncidentStatus(incident.id, next))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setBusy(false)
    }
  }

  const archive = async () => {
    if (!window.confirm('Archive this incident? It will leave active views.')) return
    setBusy(true)
    setError('')
    try {
      await archiveIncident(incident.id)
      onArchived(incident.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Archive failed')
    } finally {
      setBusy(false)
    }
  }

  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="modal detail-modal" role="dialog" aria-modal="true" aria-labelledby="incident-title">
      <div className="modal-head">
        <div><span className="eyebrow">INCIDENT #{shortId(incident.id)}</span><h2 id="incident-title">{incident.title}</h2></div>
        <button className="icon-button" onClick={onClose} aria-label="Close">×</button>
      </div>

      {editing ? <form className="incident-edit-form" onSubmit={saveEdit}>
        <label>Title
          <input autoFocus required maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label>Description
          <textarea required maxLength={4000} rows={5} value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>
        <label>Severity
          <select value={severity} onChange={(event) => setSeverity(event.target.value as IncidentSeverity)}>
            {Object.values(IncidentSeverity).map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="button ghost" disabled={busy} onClick={() => setEditing(false)}>Cancel</button>
          <button className="button primary" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
        </div>
      </form> : <>
        <div className="detail-badges"><SeverityBadge value={incident.severity} /><StatusBadge value={incident.status} /></div>
        <p className="description">{incident.description}</p>
        <dl className="detail-grid">
          <div><dt>Created</dt><dd>{formatDate(incident.createdAt)}</dd></div>
          <div><dt>Last updated</dt><dd>{formatDate(incident.updatedAt)}</dd></div>
        </dl>

        {error && <p className="form-error" role="alert">{error}</p>}

        {(canManage || canArchive) ? <div className="modal-actions detail-actions">
          {canArchive && <button className="button danger" disabled={busy} onClick={archive}>Archive</button>}
          {canManage && <button className="button ghost" disabled={busy} onClick={beginEdit}>Edit details</button>}
          {canManage && next && <button className="button primary" disabled={busy} onClick={transition}>Move to {next}</button>}
        </div> : <p className="read-only-note">Viewer access · incident changes are disabled.</p>}
      </>}
    </section>
  </div>
}
